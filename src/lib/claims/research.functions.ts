import { CAPABILITIES, selectedItems, parseResponses, publicContextSignature, evidenceScopeSchema } from "./capability-upgrade";
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
import { readLiveBaseline, readDemoEnterpriseMcp } from "./baseline.server";
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
  mock_enterprise_mcp_token: "configured",
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

const liveInput = z.object({ caseId: caseIdSchema, input: z.any(), baselineSource: z.enum(["demo", "connected"]).optional(), precisePoint: z.boolean().optional(), intent: researchIntentSchema.optional(), baselineId: z.string().optional(), selectedItemIds: z.array(z.string()).max(2).optional(), parentDbId: z.string().uuid().optional() });
function baselineMatches(baseline: RunRecord | undefined, caseId: CaseId, hash: string, source: string, owner: string) {
  return !!baseline && baseline.mode === "live" && baseline.case_id === caseId && baseline.input_hash === hash && baseline.result["scope_version"] === "baseline-first-v2" && !baseline.result["research_intent"] && baseline.result["baseline_source"] === source && baseline.result["owner_id"] === owner;
}
const demoWarning = "SIMULATED primary values with live outside observations. Deltas are demonstration arithmetic, not real supplier savings or a real insurer quote.";

/** Every primary path is adapter-only; external paths require an explicit gated question. */
export const startLiveRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => liveInput.parse(d))
  .handler(async ({ data, context }) => {
    const caseId = data.caseId as CaseId;
    const now = nowIso();
    const hash = await inputHash(data.input);
    if (!context.userId) throw new Error("Unauthorized");
    const source = data.baselineSource ?? "connected";
    if (!data.intent) {
      const request = getRequest();
      const baseline = await readLiveBaseline(caseId, data.input, hash, now, source, { origin: new URL(request.url).origin, authorization: request.headers.get("authorization") ?? "" });
      baseline.result["owner_id"] = context.userId;
      baseline.provider_ids["db_run_id"] = await saveRun(context.supabase, context.userId, baseline);
      return baseline;
    }
    const { data: row } = await context.supabase.from("research_runs").select("result").eq("id", data.baselineId ?? "").eq("user_id", context.userId).single();
    const baseline = row?.result as unknown as RunRecord | undefined;
    const rec = emptyRun(caseId, "live", data.input, hash, now);
    if (!baselineMatches(baseline, caseId, hash, source, context.userId) || !baseline) { rec.status = "blocked"; rec.error = "Load your own matching baseline with the selected source first."; return rec; }
    const gate = researchGate(caseId, baseline, data.intent);
    if (!gate.allowed) { rec.status = "blocked"; rec.error = gate.reason; return rec; }
    if (caseId === "UC05") { rec.status = "blocked"; rec.error = "Use the dedicated question-gated MCP action."; return rec; }
    rec.result = { scope_version: "baseline-first-v2", baseline_source: source, owner_id: context.userId, simulated_primary: source === "demo", demonstration_notice: source === "demo" ? demoWarning : null, research_intent: data.intent, baseline_snapshot: baseline, baseline_id: data.baselineId, baseline_coverage: baseline.result["baseline_coverage"] ?? [] };
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
    // Explicit compatible execution: this saved gateway has no Groups/Places/Decisions/MCP endpoints.
    rec.result["capability"] = CAPABILITIES[caseId];
    if (caseId === 'UC01' || caseId === 'UC02') {
      try {
        const items = selectedItems(caseId, data.selectedItemIds ?? []);
        rec.result['outbound_context'] = { item_ids: items.map(x => x.id), vehicle: (pub.context as Record<string, unknown>)["vehicle"], location: (pub.context as Record<string, unknown>)["location"] };
        rec.result["selected_items"] = items.map(item => ({ ...item, status: 'pending', run_id: null, output: null }));
        rec.result["task_group_support"] = 'Unavailable; explicit host batch of individual Tasks, not a Parallel Task Group';
        rec.steps = items.map(item => ({ name: item.id, status: 'pending' }));
        await saveRun(context.supabase, context.userId, rec, dbId);
        for (const child of rec.result["selected_items"]) {
          child.status = 'submission_unknown'; // Persist BEFORE POST; never retry ambiguous submissions.
          await saveRun(context.supabase, context.userId, rec, dbId);
          rec.calls.task++;
          const body = { processor: 'base', input: `${incrementalPrompt(caseId, child.question)}\nReviewer question: ${data.intent.question}\nPublic context: ${JSON.stringify(rec.result['outbound_context'])}`, task_spec: TASK_TEMPLATES[caseId].task_spec };
          const response: any = await parallelRequest('POST', '/v1/tasks/runs', body, { idempotent: false });
          if (!response.run_id) throw new ParallelError('submission_unknown', null, 'Task returned no ID; action required, no resubmission.');
          child.run_id = response.run_id; child.status = 'running';
          trace({ op: 'POST /v1/tasks/runs', transport: 'http', status: 'ok', request: { item_id: child.id, ...body }, response: { run_id: response.run_id } });
          await saveRun(context.supabase, context.userId, rec, dbId);
        }
      } catch (e) { failRun(rec, e); if (rec.result['selected_items']?.some((c: any) => c.status === 'running')) rec.status = 'running'; }
      await saveRun(context.supabase, context.userId, rec, dbId); return rec;
    }
    if (caseId === 'UC03' || caseId === 'UC04') {
      try {
        let discovery: any = null;
        if (data.parentDbId) await ownedPreviousResponse(rec, context, data.parentDbId);
        if (caseId === 'UC03' && !data.parentDbId) {
          const body = { objective: `Find OTHER passenger-car rental branches, excluding equipment rental, aggregators and these brands: ${JSON.stringify(pub.context.excluded_supplier_groups)} ${pub.context.excluded_supplier}. Label duplicate locales and branch identities. Branch pages are not quotes.`, search_queries: [`passenger car rental ${pub.context.branch_area}`], mode: 'fast', advanced_settings: { max_results: 5 } };
          rec.calls.search++;
          discovery = await parallelRequest('POST', '/v1/search', body, { idempotent: false });
          rec.result['branch_discovery'] = { method: 'Web Search, not Place Search', provider_result: discovery };
          trace({ op: 'POST /v1/search', transport: 'http', status: 'ok', request: body, response: discovery });
        }
        await completeResponse(rec, context, dbId, data.parentDbId, `${caseId === 'UC03' ? benchmarkPrompt(data.intent.question) : incrementalPrompt(caseId, data.intent.question) + ' Classify evidence scope as documented, conflicting or unknown only. Not a claims decision. Preserve refusals; publication absence does not establish event absence.'}\nPublic context: ${JSON.stringify(pub.context)}\nDiscovery: ${JSON.stringify(discovery)}`, caseId === 'UC03' ? competitorTaskJsonSchema : evidenceScopeSchema);
      } catch (e) { failRun(rec, e); }
      await saveRun(context.supabase, context.userId, rec, dbId); return rec;
    }
    rec.status = 'blocked'; rec.error = 'No supported research action selected.';
    return rec;
  });

/** Resume/poll an existing Task run. Never creates a new task. */
export const resumeLiveRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dbId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!context.userId) throw new Error("Unauthorized");
    const { data: row, error } = await context.supabase.from("research_runs").select("*").eq("id", data.dbId).eq("user_id", context.userId).single();
    if (error || !row) throw new Error("Run not found");
    const rec = row.result as unknown as RunRecord;
    if (rec.result?.["owner_id"] && rec.result["owner_id"] !== context.userId) throw new Error("Run not found");
    if (!rec.result?.["research_intent"]) return rec; // Primary/legacy runs never poll Parallel.
    if (Array.isArray(rec.result['selected_items']) && rec.status === 'running') {
      for (const child of rec.result['selected_items']) {
        if (!child.run_id || child.status !== 'running') continue;
        try {
          const result: any = await parallelRequest('GET', `/v1/tasks/runs/${encodeURIComponent(child.run_id)}/result?timeout=1`, null, { idempotent: false });
          child.output = result.output; child.status = 'completed';
          const facts = normalizeTaskOutput(result.output, nowIso()).map(f => ({ ...f, fact_id: `${child.id}-${f.fact_id}`, entity_id: child.id }));
          rec.facts.push(...facts);
          if (!facts.length) rec.gaps.push(`${child.id}: no normalized findings; inspect retained per-item output and Basis. Missing sold prices/applicability remain unknown.`);
          rec.trace.push(R({ at: nowIso(), op: 'selected-item result', transport: 'http', status: 'ok', response: { item_id: child.id, run_id: child.run_id, basis: result.output?.basis ?? [] } }));
        } catch (e) {
          if (e instanceof ParallelError && e.httpStatus === 408) continue;
          child.status = e instanceof ParallelError && e.httpStatus && e.httpStatus >= 400 && e.httpStatus < 500 ? 'action_required' : 'running';
          child.error = R((e as Error).message);
        }
      }
      const children = rec.result['selected_items'];
      rec.steps = children.map((c: any) => ({ name: c.id, status: c.status === 'completed' ? 'done' : c.status === 'running' ? 'pending' : 'error' }));
      if (children.every((c: any) => c.status === 'completed')) { rec.status = 'completed'; rec.captured_at = nowIso(); }
      else if (!children.some((c: any) => c.status === 'running')) { rec.status = 'error'; rec.error = 'Partial results retained; unresolved children require review.'; }
      rec.result['incremental_metrics'] = incrementalMetrics(rec.result['baseline_snapshot'], rec);
      await saveRun(context.supabase, context.userId, rec, data.dbId); return rec;
    }
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
        if (rec.result["baseline_source"] === "demo") rec.facts.push(...((rec.result["baseline_snapshot"] as RunRecord)?.facts ?? []).map((f) => ({ ...f, fact_id: `primary-${f.fact_id}` })));
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
  .inputValidator((d: unknown) => z.object({ input: z.any(), baselineSource: z.enum(["demo", "connected"]).optional(), baselineId: z.string().optional(), parentDbId: z.string().uuid().optional(), intent: researchIntentSchema.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = nowIso();
    const rec = emptyRun("UC05", "live", data.input, await inputHash(data.input), now);
    if (!context.userId) throw new Error("Unauthorized");
    const source = data.baselineSource ?? "connected";
    const request = getRequest();
    if (!data.intent) {
      const primary = await readLiveBaseline("UC05", data.input, rec.input_hash, now, source, { origin: new URL(request.url).origin, authorization: request.headers.get("authorization") ?? "" });
      primary.result["owner_id"] = context.userId;
      primary.provider_ids["db_run_id"] = await saveRun(context.supabase, context.userId, primary);
      return primary;
    }
    const { data: row } = await context.supabase.from("research_runs").select("result").eq("id", data.baselineId ?? "").eq("user_id", context.userId).single();
    const baseline = row?.result as unknown as RunRecord | undefined;
    if (!baselineMatches(baseline, "UC05", rec.input_hash, source, context.userId) || !baseline) { rec.status = "blocked"; rec.error = "Load your own matching enterprise baseline with the selected source first."; return rec; }
    const gate = researchGate("UC05", baseline, data.intent);
    if (!gate.allowed) { rec.status = "blocked"; rec.error = gate.reason; return rec; }
    try { getKey(); } catch (e) { failRun(rec, e); return rec; }
    rec.steps = ["Connect mock-enterprise MCP", "Public context filter", "Connect Parallel MCP", "web_search", "web_fetch", "web_research", "Join & brief"].map((name) => ({ name, status: "pending" as const }));
    const conn: Record<string, string> = { "mock-enterprise": "not connected", parallel: "not connected" };
    const tr = (t: Omit<TraceEntry, "at">) => rec.trace.push(R({ at: nowIso(), ...t }));
    const result: any = { scope_version: "baseline-first-v2", owner_id: context.userId, baseline_source: source, simulated_primary: source === "demo", demonstration_notice: source === "demo" ? demoWarning : null, research_intent: data.intent, baseline_snapshot: baseline, baseline_id: data.baselineId, mcp_connections: conn, internal_context_origin: "mock_enterprise", delay_causation: "not_established", sources_origin: "live_web" };
    rec.result = result;
    const callCap = () => { if (rec.calls.mcp >= LIMITS.maxMcpToolCalls) throw new Error("MCP tool call cap reached"); rec.calls.mcp++; };
    let internal: any = null;
    // 1. Mock enterprise over HTTP MCP
    try {
      const mcp = await readDemoEnterpriseMcp(new URL(request.url).origin, request.headers.get("authorization") ?? "");
      tr({ op: "mock-enterprise initialize + tools/list", transport: "mcp-http", status: "ok", response: { server: mcp.init?.serverInfo, tools: mcp.names } });
      callCap();
      callCap();
      internal = { context: mcp.context, rules: mcp.rules };
      tr({ op: "mock-enterprise.tools/call get_case_context, get_demo_rules", transport: "mcp-http", status: "ok", response: { retained_in_host: true, internal_context: "[kept local — not shown in outbound trace]" } });
      conn["mock-enterprise"] = "connected (HTTP MCP adaptation of stdio design)";
      if (rec.steps[0]) rec.steps[0].status = "done";
    } catch (e) {
      tr({ op: "mock-enterprise MCP", transport: "mcp-http", status: "error", note: (e as Error).message });
      if (rec.steps[0]) rec.steps[0].status = "error";
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
    if (rec.steps[1]) rec.steps[1].status = "done";
    tr({ op: "local.public_context_filter", transport: "none", status: "ok", request: { dropped: pub.dropped }, response: outbound });
    // This connection key is gateway-only, not a provider bearer token.
    // Keep enterprise MCP real; use the explicitly advertised Responses adaptation.
    result.capability = CAPABILITIES.UC05;
    result.mcp_connections.parallel = 'Unavailable on saved gateway; explicit Responses HTTP adaptation (not MCP)';
    result.outbound_context = outbound;
    rec.steps = [{ name: 'Enterprise HTTP MCP', status: 'done' }, { name: 'Public context filter', status: 'done' }, { name: 'Parallel Responses (HTTP, not MCP)', status: 'pending' }];
    const dbId = await saveRun(context.supabase, context.userId, rec);
    rec.provider_ids['db_run_id'] = dbId;
    try { await completeResponse(rec, context, dbId, data.parentDbId, `${data.intent.question}\nPublic context: ${JSON.stringify(outbound)}\nUse current official MCP transport/initialization/tool discovery documentation. Public facts do not establish internal root cause.`); }
    catch (e) { failRun(rec, e); }
    await saveRun(context.supabase, context.userId, rec, dbId);
    return rec;
  });

async function ownedPreviousResponse(rec: RunRecord, context: any, parentDbId: string): Promise<string> {
  const { data: row } = await context.supabase.from('research_runs').select('result').eq('id', parentDbId).eq('user_id', context.userId).single();
  const parent = row?.result as RunRecord | undefined;
  if (!parent || parent.status !== 'completed' || parent.case_id !== rec.case_id || parent.input_hash !== rec.input_hash || parent.result['owner_id'] !== context.userId || parent.result['baseline_id'] !== rec.result['baseline_id'] || parent.result['baseline_source'] !== rec.result['baseline_source'] || publicContextSignature(parent.result['outbound_context'] ?? parent.result['outbound_preview']) !== publicContextSignature(rec.result['outbound_context'] ?? rec.result['outbound_preview']) || !parent.provider_ids['response_id']) throw new Error('Follow-up requires your completed response with matching baseline, source and public context.');
  return parent.provider_ids['response_id'];
}
async function completeResponse(rec: RunRecord, context: any, dbId: string, parentDbId: string | undefined, input: string, schema?: unknown) {
  const previous = parentDbId ? await ownedPreviousResponse(rec, context, parentDbId) : undefined;
  const body = { model: 'parallel', input, reasoning: { effort: 'low' }, ...(previous ? { previous_response_id: previous } : {}), ...(schema ? { text: { format: { type: 'json_schema', name: 'case_result', schema } } } : {}) };
  if (containsCanary(body)) throw new Error('Private context rejected.');
  rec.result['responses_calls'] = 1;
  const raw = await parallelRequest('POST', '/v1/responses', body, { idempotent: false, timeoutMs: 120_000 });
  const parsed = parseResponses(raw);
  rec.result['responses'] = parsed;
  rec.result['usage'] = (raw as any)?.usage ?? null;
  if (!parsed.id || !parsed.text || parsed.refusal.length) throw new Error('Responses returned missing ID/text or refusal; retained for review, no fallback.');
  rec.provider_ids['response_id'] = parsed.id;
  rec.trace.push(R({ at: nowIso(), op: 'POST /v1/responses', transport: 'http', status: 'ok', request: body, response: parsed }));
  rec.summary = parsed.text;
  rec.facts = parsed.annotations.filter((a: any) => a.url).map((a: any, i: number) => fact({ fact_id: `response-source-${i}`, entity_id: 'public_question', attribute: 'source_annotation', evidence_type: 'other', origin: 'live_web', status: 'candidate', value_text: a.title ?? a.url, citations: [{ source_ref: a.url, url: a.url, excerpt: '' }], qualifiers: ['URL annotation only; no exact source excerpt proof. Numeric claims require independent evidence.'] }, nowIso()));
  if (rec.case_id === 'UC03') {
    const quotes = competitorTaskOutputSchema.safeParse(parsed.structured);
    if (!quotes.success) throw new ParallelError('schema', null, 'Responses quote schema invalid; no inferred rates.');
    rec.result['competitor_comparisons'] = compareCompetitorQuotes(rec.result['baseline_snapshot'], quotes.data.quotes, nowIso());
    rec.result['benchmark_purpose'] = quotes.data.benchmark_purpose;
    rec.summary = 'Public competitor research complete. Missing dates, rates, fees or inventory remain unknown and unranked.';
  }
  rec.status = 'completed'; rec.captured_at = nowIso();
  rec.steps = [{ name: 'Existing baseline gate', status: 'done' }, { name: 'Interactive Responses', status: 'done' }, { name: 'Evidence review', status: 'done' }];
  rec.result['incremental_metrics'] = incrementalMetrics(rec.result['baseline_snapshot'], rec);
  await saveRun(context.supabase, context.userId, rec, dbId);
}
