import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emptyRun, fact } from "./fixtures";
import { inputHash } from "./hash";
import { deriveLiveResult } from "./live-derive";
import { buildToolArgs, McpHttpClient, toolText } from "./mcp-client.server";
import { normalizeTaskOutput } from "./normalize";
import { getKey, parallelRequest, ParallelError } from "./parallel.server";
import { buildPublicContext, searchQueries } from "./public-context";
import { containsCanary, redact } from "./redact";
import { EXTRACT_TEMPLATE, LIMITS, PARALLEL_MCP, TASK_TEMPLATES, SEARCH_TEMPLATES } from "./spec";
import type { CaseId, RunRecord, TraceEntry } from "./types";
import { runRentalLive } from "./rental.server";
import { rentalExceptionEligibility } from "./rental";
import { readLiveBaseline } from "./baseline.server";
import { researchGate, researchIntentSchema, incrementalMetrics } from "./baseline";
import { incrementalPrompt } from "./incremental";
import { benchmarkPrompt, competitorBenchmarkContext, competitorTaskJsonSchema, competitorTaskOutputSchema, compareCompetitorQuotes } from "./rental-benchmark";

/* eslint-disable @typescript-eslint/no-explicit-any */
const caseIdSchema = z.enum(["UC01", "UC02", "UC03", "UC04", "UC05"]);
const nowIso = () => new Date().toISOString();
const secrets = () => [process.env["PARALLEL_API_KEY"], process.env["MOCK_ENTERPRISE_MCP_TOKEN"]];
const R = <T,>(v: T) => redact(v, secrets());

/** Public, redacted configuration status. Never returns a key or prefix. */
export const getServerConfig = createServerFn({ method: "GET" }).handler(async () => ({
  parallel_api_key: process.env["PARALLEL_API_KEY"] ? "configured" : "missing",
  mock_enterprise_mcp_token: process.env["MOCK_ENTERPRISE_MCP_TOKEN"] ? "configured" : "missing",
  task_processor: process.env["PARALLEL_TASK_PROCESSOR"] || "core",
  limits: LIMITS,
  parallel_mcp_url: PARALLEL_MCP.url,
}));

async function saveRun(supabase: any, userId: string, rec: RunRecord, dbId?: string) {
  const row = {
    user_id: userId,
    case_id: rec.case_id,
    mode: "live",
    input: rec.input as any,
    input_hash: rec.input_hash,
    status: rec.status,
    provider_ids: rec.provider_ids as any,
    result: rec as any,
    trace: rec.trace as any,
    error: rec.error,
    captured_at: rec.captured_at,
  };
  if (dbId) {
    const { error } = await supabase.from("research_runs").update(row).eq("id", dbId);
    if (error) throw new Error(`Run store update failed: ${error.message}`);
    return dbId;
  }
  const { data, error } = await supabase.from("research_runs").insert(row).select("id").single();
  if (error) throw new Error(`Run store insert failed: ${error.message}`);
  return data.id as string;
}

function failRun(rec: RunRecord, e: unknown) {
  const pe = e instanceof ParallelError ? e : null;
  rec.status = pe?.kind === "submission_unknown" ? "submission_unknown" : "error";
  rec.error = R(pe ? `[${pe.kind}${pe.httpStatus ? " " + pe.httpStatus : ""}] ${pe.message}` : (e as Error).message);
}

const liveInput = z.object({ caseId: caseIdSchema, input: z.any(), precisePoint: z.boolean().optional(), intent: researchIntentSchema.optional(), baselineId: z.string().optional() });

/** Every primary path is adapter-only; external paths require an explicit gated question. */
export const startLiveRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => liveInput.parse(d))
  .handler(async ({ data, context }) => {
    const caseId = data.caseId as CaseId;
    const now = nowIso();
    const hash = await inputHash(data.input);
    if (!data.intent) {
      const baseline = readLiveBaseline(caseId, data.input, hash, now);
      baseline.provider_ids["db_run_id"] = await saveRun(context.supabase, context.userId, baseline);
      return baseline;
    }
    const { data: row } = await context.supabase.from("research_runs").select("result").eq("id", data.baselineId ?? "").single();
    const baseline = row?.result as unknown as RunRecord | undefined;
    const rec = emptyRun(caseId, "live", data.input, hash, now);
    if (!baseline || baseline.case_id !== caseId || baseline.input_hash !== hash || baseline.result["scope_version"] !== "baseline-first-v2" || baseline.result["research_intent"]) { rec.status = "blocked"; rec.error = "Run the current existing-system baseline first."; return rec; }
    const gate = researchGate(caseId, baseline, data.intent);
    if (!gate.allowed) { rec.status = "blocked"; rec.error = gate.reason; return rec; }
    if (caseId === "UC05") { rec.status = "blocked"; rec.error = "Use the dedicated question-gated MCP action."; return rec; }
    rec.result = { scope_version: "baseline-first-v2", research_intent: data.intent, baseline_snapshot: baseline, baseline_id: data.baselineId, baseline_coverage: baseline.result["baseline_coverage"] ?? [] };
    rec.status = "running";
    rec.steps = ["Validate & public context", "Search", "Extract", "Task create", "Poll result", "Normalize & calculate"].map((name) => ({ name, status: "pending" as const }));
    const step = (i: number, s: "done" | "error" | "skipped") => { const item = rec.steps[i]; if (item) item.status = s; };
    const trace = (t: Omit<TraceEntry, "at">) => rec.trace.push(R({ at: nowIso(), ...t }));
    try {
      getKey();
    } catch (e) {
      failRun(rec, e);
      step(0, "error");
      return rec; // not stored: no provider call was possible
    }
    const pub = caseId === "UC03" ? { ok: true as const, context: competitorBenchmarkContext(data.input, baseline, data.intent.question), dropped: ["supplier prices", "insurer rules", "repair details", "private baseline records"] } : buildPublicContext(caseId, data.input, new Date(), { precisePoint: !!data.precisePoint });
    if (!pub.ok) {
      rec.status = "blocked";
      rec.error = pub.reason;
      step(0, "error");
      return rec;
    }
    step(0, "done");
    (rec.result as any).outbound_context = pub.context;
    trace({ op: "local.public_context_filter", transport: "none", status: "ok", request: { dropped: pub.dropped }, response: pub.context });
    const dbId = await saveRun(context.supabase, context.userId, rec);
    rec.provider_ids["db_run_id"] = dbId;
    const retries = { count: 0 };
    const excerpts: any[] = [];
    try {
      // Search (1 of max 4)
      const tpl = SEARCH_TEMPLATES[caseId];
      const searchBody = { objective: incrementalPrompt(caseId, data.intent.question), mode: "fast", search_queries: [data.intent.question.slice(0, 180)], advanced_settings: { max_results: 5 } };
      rec.calls.search++;
      const sres: any = await parallelRequest("POST", "/v1/search", searchBody, { idempotent: true, retries });
      const sessionId: string | null = sres?.session_id ?? null;
      if (sres?.search_id) rec.provider_ids["search_id"] = sres.search_id;
      const results: any[] = Array.isArray(sres?.results) ? sres.results : [];
      for (const r of results) excerpts.push({ url: r.url, title: r.title ?? null, publish_date: r.publish_date ?? null, excerpts: r.excerpts ?? [], via: "search", retrieved_at: nowIso() });
      trace({ op: "POST /v1/search", transport: "http", status: "ok", request: searchBody, response: { search_id: sres?.search_id, result_count: results.length, urls: results.map((r) => r.url) } });
      rec.coverage.push({ category: "search", status: results.length ? "searched" : "not_available", notes: `${results.length} results` });
      step(1, "done");
      // Extract (up to 8 URLs)
      const urls = results.map((r) => r.url).filter(Boolean).slice(0, Math.min(LIMITS.maxExtractUrls, 5));
      if (urls.length) {
        const exBody = { urls, objective: data.intent.question, advanced_settings: { excerpt_settings: { max_chars_per_result: 4000 } } };
        rec.calls.extract_urls += urls.length;
        try {
          const eres: any = await parallelRequest("POST", "/v1/extract", exBody, { idempotent: true, retries });
          for (const r of eres?.results ?? []) excerpts.push({ url: r.url, title: r.title ?? null, publish_date: r.publish_date ?? null, excerpts: r.excerpts ?? [], via: "extract", retrieved_at: nowIso() });
          for (const er of eres?.errors ?? []) rec.coverage.push({ category: `extract ${er.url ?? ""}`, status: "blocked", notes: String(er.error_type ?? er.message ?? "access failure") });
          trace({ op: "POST /v1/extract", transport: "http", status: "ok", request: exBody, response: { extract_id: eres?.extract_id, ok: (eres?.results ?? []).length, errors: (eres?.errors ?? []).length } });
          step(2, "done");
        } catch (e) {
          trace({ op: "POST /v1/extract", transport: "http", status: "error", request: exBody, note: (e as Error).message });
          rec.coverage.push({ category: "extract", status: "blocked", notes: R((e as Error).message) });
          step(2, "error");
        }
      } else step(2, "skipped");
      // Task create (max 1) — no automatic resubmission
      const t = structuredClone(TASK_TEMPLATES[caseId]);
      t.processor = caseId === "UC03" ? "pro" : process.env["PARALLEL_TASK_PROCESSOR"] || t.processor || "core";
      t.input.research_instructions = caseId === "UC03" ? benchmarkPrompt(data.intent.question) : incrementalPrompt(caseId, data.intent.question);
      if (caseId === "UC03") t.task_spec.output_schema = { type: "json", json_schema: competitorTaskJsonSchema };
      t.input.public_case_context = pub.context;
      t.input.research_scope = { specific_question: data.intent.question, primary_response_public_summary: null, purpose: caseId === "UC03" ? "competitor_market_benchmark" : "unanswered_external_question", execute_only_after_local_gate: true };
      t.input.discovered_source_excerpts = excerpts.slice(0, 12).map((x) => ({ ...x, excerpts: (x.excerpts ?? []).slice(0, 3).map((s: string) => String(s).slice(0, 1500)) }));
      if (containsCanary(t)) throw new Error("Outbound request contained private canary; aborted");
      rec.calls.task++;
      trace({ op: "POST /v1/tasks/runs", transport: "http", status: "ok", request: { ...t, task_spec: { output_schema: { type: "json", json_schema: "[schema object from template]" } } } });
      const tres: any = await parallelRequest("POST", "/v1/tasks/runs", t, { idempotent: false });
      rec.provider_ids["task_run_id"] = tres.run_id;
      const lastTrace = rec.trace[rec.trace.length - 1];
      if (lastTrace) lastTrace.response = { run_id: tres.run_id, status: tres.status };
      step(3, "done");
    } catch (e) {
      failRun(rec, e);
    }
    (rec.result as any).discovered_source_excerpts = excerpts;
    (rec.result as any).retries = retries.count;
    await saveRun(context.supabase, context.userId, rec, dbId);
    return rec;
  });

/** Resume/poll an existing Task run. Never creates a new task. */
export const resumeLiveRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dbId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("research_runs").select("*").eq("id", data.dbId).single();
    if (error || !row) throw new Error("Run not found");
    const rec = row.result as unknown as RunRecord;
    if (!rec.result?.["research_intent"]) return rec; // Primary/legacy runs never poll Parallel.
    const runId = rec.provider_ids["task_run_id"];
    if (!runId || rec.status !== "running") return rec;
    try {
      const st: any = await parallelRequest("GET", `/v1/tasks/runs/${encodeURIComponent(runId)}`, null, { idempotent: true });
      rec.trace.push(R({ at: nowIso(), op: `GET /v1/tasks/runs/${runId}`, transport: "http" as const, status: "ok" as const, response: { status: st?.status } , note: "status check (not a research operation)" }));
      if (st?.status === "completed") {
        const res: any = await parallelRequest("GET", `/v1/tasks/runs/${encodeURIComponent(runId)}/result?timeout=1`, null, { idempotent: true });
        const captured = nowIso();
        rec.facts = normalizeTaskOutput(res?.output, captured);
        if (rec.case_id === "UC03") {
          const output = competitorTaskOutputSchema.safeParse(res?.output?.content);
          if (!output.success) throw new ParallelError("schema", null, "Rental Task output must include benchmark_purpose=competitor_market_benchmark and valid quote records.");
          const quotes = output.data.quotes;
          rec.result["benchmark_purpose"] = output.data.benchmark_purpose;
          const baseline = rec.result["baseline_snapshot"] as RunRecord;
          const comparisons = compareCompetitorQuotes(baseline, quotes, captured);
          rec.result["competitor_comparisons"] = comparisons;
          rec.facts = comparisons.map((q: any, i: number) => fact({ fact_id: `competitor-${i}`, entity_id: q.supplier, attribute: "public_retail_rental_total", origin: "live_web", evidence_type: "posted_rate", status: q.comparable ? "supported" : "insufficient", number_decimal: q.total_usd, unit: "USD", currency: "USD", qualifiers: [...q.mismatches, q.rate_basis ?? "unknown rate basis", q.availability_basis ?? "unknown availability"], citations: q.url && q.excerpt ? [{ source_ref: q.url, url: q.url, excerpt: q.excerpt }] : [] }, captured));
        }
        const d = rec.case_id === "UC03" ? { extra: [], result: {}, gaps: rec.facts.length ? [] : ["No supported retrievable competitor quotes. Prices remain unknown."] } : deriveLiveResult(rec.case_id, rec.facts, rec.input, (rec.result as any).outbound_context, captured);
        rec.facts.push(...d.extra);
        rec.result = { ...rec.result, ...d.result, provider_output: { content: res?.output?.content ?? null, basis: res?.output?.basis ?? null }, usage: res?.run?.usage ?? res?.usage ?? null };
        rec.gaps = [...(res?.output?.content?.gaps ?? []), ...d.gaps];
        rec.summary = res?.output?.content?.summary ?? null;
        rec.status = "completed";
        rec.result["incremental_metrics"] = incrementalMetrics(rec.result["baseline_snapshot"] as RunRecord, rec);
        rec.captured_at = captured;
        rec.steps.forEach((s, i) => { if (i >= 4) s.status = "done"; });
        rec.trace.push(R({ at: captured, op: `GET /v1/tasks/runs/${runId}/result`, transport: "http" as const, status: "ok" as const, response: { findings: rec.facts.length, basis_entries: (res?.output?.basis ?? []).length } }));
      } else if (["failed", "cancelled", "errored"].includes(st?.status)) {
        rec.status = "error";
        rec.error = `Provider task ${st.status}: ${R(JSON.stringify(st?.error ?? st?.errors ?? "")).slice(0, 300)}`;
      }
    } catch (e) {
      // Leave status running so the user can Resume; record the error visibly.
      rec.trace.push(R({ at: nowIso(), op: "poll", transport: "http" as const, status: "error" as const, note: (e as Error).message }));
      if (e instanceof ParallelError && ["auth", "credit_or_access", "config", "schema"].includes(e.kind)) failRun(rec, e);
    }
    await saveRun(context.supabase, context.userId, rec, data.dbId);
    return rec;
  });

export const listStoredRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ caseId: caseIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("research_runs")
      .select("id, result, status, captured_at, created_at")
      .eq("case_id", data.caseId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r: any) => r.result?.result?.scope_version === "baseline-first-v2").map((r: any) => ({ ...(r.result as RunRecord), provider_ids: { ...(r.result?.provider_ids ?? {}), db_run_id: r.id } }));
  });

export const requestRentalException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ action: z.string(), question: z.string() }).parse(d))
  .handler(async ({ data }) => rentalExceptionEligibility(data.action, data.question));

/** UC05 live: two actual MCP connections. Never fabricates a live trace. */
export const runWarRoomLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.any(), baselineId: z.string().optional(), intent: researchIntentSchema.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = nowIso();
    const rec = emptyRun("UC05", "live", data.input, await inputHash(data.input), now);
    if (!data.intent) return readLiveBaseline("UC05", data.input, rec.input_hash, now);
    const { data: row } = await context.supabase.from("research_runs").select("result").eq("id", data.baselineId ?? "").single();
    const baseline = row?.result as unknown as RunRecord | undefined;
    if (!baseline || baseline.case_id !== "UC05" || baseline.input_hash !== rec.input_hash || baseline.result["scope_version"] !== "baseline-first-v2" || baseline.result["research_intent"]) { rec.status = "blocked"; rec.error = "Run the current enterprise baseline first."; return rec; }
    const gate = researchGate("UC05", baseline, data.intent);
    if (!gate.allowed) { rec.status = "blocked"; rec.error = gate.reason; return rec; }
    rec.steps = ["Connect mock-enterprise MCP", "Public context filter", "Connect Parallel MCP", "web_search", "web_fetch", "web_research", "Join & brief"].map((name) => ({ name, status: "pending" as const }));
    const conn: Record<string, string> = { "mock-enterprise": "not connected", parallel: "not connected" };
    const tr = (t: Omit<TraceEntry, "at">) => rec.trace.push(R({ at: nowIso(), ...t }));
    const result: any = { scope_version: "baseline-first-v2", research_intent: data.intent, baseline_snapshot: baseline, baseline_id: data.baselineId, mcp_connections: conn, internal_context_origin: "mock_enterprise", delay_causation: "not_established", sources_origin: "live_web" };
    rec.result = result;
    const callCap = () => { if (rec.calls.mcp >= LIMITS.maxMcpToolCalls) throw new Error("MCP tool call cap reached"); rec.calls.mcp++; };
    let internal: any = null;
    // 1. Mock enterprise over HTTP MCP
    try {
      const token = process.env["MOCK_ENTERPRISE_MCP_TOKEN"];
      if (!token) throw new Error("MOCK_ENTERPRISE_MCP_TOKEN missing");
      const origin = new URL(getRequest().url).origin;
      const me = new McpHttpClient(`${origin}/api/mock-enterprise-mcp`, { "x-mock-enterprise-token": token });
      const init = await me.initialize();
      const tools = await me.listTools();
      tr({ op: "mock-enterprise initialize + tools/list", transport: "mcp-http", status: "ok", response: { server: init?.serverInfo, tools: (tools?.tools ?? []).map((t: any) => t.name) } });
      callCap();
      const ctxRes = await me.callTool("get_case_context", { case_id: "UC05" });
      callCap();
      const rules = await me.callTool("get_demo_rules", { case_id: "UC05" });
      internal = { context: ctxRes?.structuredContent ?? JSON.parse(toolText(ctxRes) || "{}"), rules: rules?.structuredContent ?? null };
      tr({ op: "mock-enterprise.tools/call get_case_context, get_demo_rules", transport: "mcp-http", status: "ok", response: { retained_in_host: true, internal_context: "[kept local — not shown in outbound trace]" } });
      conn["mock-enterprise"] = "connected (HTTP MCP adaptation of stdio design)";
      rec.steps[0]!.status = "done";
    } catch (e) {
      tr({ op: "mock-enterprise MCP", transport: "mcp-http", status: "error", note: (e as Error).message });
      rec.steps[0]!.status = "error";
      rec.status = "error"; rec.error = "Enterprise MCP integration failed; no public research substitute.";
      return rec;
    }
    result.internal_context = internal?.context?.case?.input?.internal_context ?? null;
    result.rules = internal?.rules?.rules ?? null;
    // 2. Public filter
    const pub = buildPublicContext("UC05", data.input);
    if (!pub.ok) { rec.status = "blocked"; rec.error = pub.reason; return rec; }
    const outbound = pub.context as any;
    outbound.question = data.intent.question;
    result.outbound_preview = outbound;
    result.private_canary_outbound = containsCanary(outbound);
    rec.steps[1]!.status = "done";
    tr({ op: "local.public_context_filter", transport: "none", status: "ok", request: { dropped: pub.dropped }, response: outbound });
    // 3. Parallel MCP
    const sources: any[] = [];
    let narrative: string | null = null;
    try {
      const key = getKey();
      const px = new McpHttpClient(PARALLEL_MCP.url, { authorization: `Bearer ${key}` });
      const init = await px.initialize();
      const list = await px.listTools();
      const tools: any[] = list?.tools ?? [];
      const names = tools.map((t) => t.name);
      tr({ op: "parallel initialize + tools/list", transport: "mcp-http", status: "ok", response: { server: init?.serverInfo, tools: names } });
      conn["parallel"] = "connected";
      rec.steps[2]!.status = "done";
      const v = outbound.public_vehicle ?? {};
      const text = `${outbound.question} Vehicle: ${v.year} ${v.make} ${v.model}. Region: ${outbound.region}.`;
      const queries = searchQueries("UC05", outbound);
      const call = async (name: string, idx: number, args: Record<string, unknown>) => {
        const t = tools.find((x) => x.name === name);
        if (!t) { rec.steps[idx]!.status = "skipped"; tr({ op: `parallel.${name}`, transport: "mcp-http", status: "skipped", note: "Tool not discovered" }); return null; }
        if (containsCanary(args)) throw new Error("Canary detected in outbound MCP arguments; aborted");
        callCap();
        try {
          const r = await px.callTool(name, args);
          const txt = toolText(r);
          tr({ op: `parallel.${name}`, transport: "mcp-http", status: r?.isError ? "error" : "ok", request: args, response: { text_preview: txt.slice(0, 1200) } });
          rec.steps[idx]!.status = r?.isError ? "error" : "done";
          return txt;
        } catch (e) {
          tr({ op: `parallel.${name}`, transport: "mcp-http", status: "error", request: args, note: (e as Error).message });
          rec.steps[idx]!.status = "error";
          return null;
        }
      };
      const urlRe = /https?:\/\/[^\s"'<>)\]]+/g;
      const sTxt = await call("web_search", 3, buildToolArgs(tools.find((t) => t.name === "web_search")?.inputSchema, { text, queries, urls: [] }));
      const urls = Array.from(new Set((sTxt ?? "").match(urlRe) ?? [])).slice(0, 3);
      for (const u of urls) {
        const i = (sTxt ?? "").indexOf(u);
        sources.push({ url: u, excerpt: (sTxt ?? "").slice(Math.max(0, i - 200), i + 400), via: "web_search" });
      }
      if (urls.length) {
        const fTxt = await call("web_fetch", 4, buildToolArgs(tools.find((t) => t.name === "web_fetch")?.inputSchema, { text, queries, urls }));
        if (fTxt) sources.push({ url: urls[0], excerpt: fTxt.slice(0, 1500), via: "web_fetch" });
      } else rec.steps[4]!.status = "skipped";
      narrative = await call("web_research", 5, buildToolArgs(tools.find((t) => t.name === "web_research")?.inputSchema, { text, queries, urls }));
      for (const u of Array.from(new Set((narrative ?? "").match(urlRe) ?? [])).slice(0, 8)) if (!sources.some((s) => s.url === u)) sources.push({ url: u, excerpt: "Cited in web_research narrative (open source to verify).", via: "web_research" });
    } catch (e) {
      const msg = e instanceof ParallelError ? e.message : (e as Error).message;
      tr({ op: "parallel MCP", transport: "mcp-http", status: "error", note: msg });
      if (rec.steps[2]!.status !== "done") rec.steps[2]!.status = "error";
      rec.error = R(msg);
    }
    // Canary audit across every serialized outbound trace request
    result.private_canary_outbound = rec.trace.some((t) => t.transport === "mcp-http" && t.op.startsWith("parallel") && containsCanary(t.request));
    rec.facts = sources.map((s, i) => fact({ fact_id: `src-${i}`, entity_id: "public_question", attribute: "public_source", origin: "live_web", evidence_type: "other", value_text: s.url, status: "candidate", citations: [{ source_ref: s.url, url: s.url, excerpt: s.excerpt }], qualifiers: [`via ${s.via}`] }, nowIso()));
    if (internal) rec.facts.push(fact({ fact_id: "m-internal-delay", entity_id: "internal", attribute: "reported_delay_days", origin: "mock_enterprise", evidence_type: "other", number_decimal: String(result.internal_context?.reported_delay_days ?? "") || null, unit: "days", citations: [{ source_ref: "mcp://mock-enterprise/get_case_context", url: null, excerpt: "Mock enterprise context (kept local)" }] }, nowIso()));
    result.brief = {
      cited_narrative: narrative,
      supported_facts: sources.filter((s) => s.via !== "web_research").map((s, i) => ({ text: `Public source: ${s.url}`, fact_ids: [`src-${i}`] })),
      hypotheses: [{ text: "Any link between public notices and the internal repair delay is a hypothesis, not established.", fact_ids: [] }],
      contradictions: [],
      open_questions: ["Which statements in the narrative are supported by the opened source excerpts?", "Does the shop directly confirm a parts or procedure constraint?"],
      next_actions: ["Review each source excerpt", "Request direct shop confirmation"],
    };
    rec.steps[6]!.status = "done";
    rec.status = conn["parallel"] === "connected" && narrative && rec.steps.slice(0, 6).every((s) => s.status === "done") ? "completed" : "error";
    rec.result["incremental_metrics"] = incrementalMetrics(baseline, rec);
    rec.captured_at = rec.status === "completed" ? nowIso() : null;
    const dbId = await saveRun(context.supabase, context.userId, rec);
    rec.provider_ids["db_run_id"] = dbId;
    return rec;
  });
