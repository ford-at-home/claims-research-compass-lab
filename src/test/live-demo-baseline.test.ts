import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("http://localhost:8080", { headers: { authorization: "Bearer test-session" } }) }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/claims/parallel.server", () => ({ getKey: vi.fn(() => "test-key"), parallelRequest: vi.fn(), ParallelError: class extends Error {} }));
import { startLiveRun, runWarRoomLive } from "@/lib/claims/research.functions";
import { getKey, parallelRequest } from "@/lib/claims/parallel.server";
import { FIXTURE_INPUTS } from "@/lib/claims/spec";
import { handleMockEnterpriseRpc } from "@/lib/claims/mock-enterprise";
import { toReport } from "@/lib/claims/export";
import type { CaseId, RunRecord } from "@/lib/claims/types";

const ids: CaseId[] = ["UC01", "UC02", "UC03", "UC04", "UC05"];
const start = startLiveRun as unknown as (a: any) => Promise<RunRecord>;
const war = runWarRoomLive as unknown as (a: any) => Promise<RunRecord>;
const wire: { url: string; body: any; authorization: string | null }[] = [];
function store(row?: RunRecord) {
  const writes: any[] = [];
  const selection = { eq: vi.fn(() => selection), single: async () => ({ data: row ? { result: row } : null, error: null }) };
  const context = { userId: "owner", supabase: { from: () => ({ select: () => selection, insert: (value: any) => { writes.push(value); return { select: () => ({ single: async () => ({ data: { id: "stored-id" }, error: null }) }) }; }, update: (value: any) => { writes.push(value); return { eq: async () => ({ error: null }) }; } }) } };
  return { context, writes, selection };
}
const intent = (id: CaseId, question = "Explicit outside question") => ({ action: id === "UC03" ? "benchmark_competitor_rates" : "research_incremental_question", reason: id === "UC03" ? "requested_benchmark" : "uncovered_question", question });
async function baseline(id: CaseId) {
  const db = store();
  const rec = await start({ data: { caseId: id, input: FIXTURE_INPUTS[id], baselineSource: "demo" }, context: db.context });
  return { rec, db };
}
beforeEach(() => {
  wire.length = 0;
  vi.mocked(getKey).mockReset().mockReturnValue("test-key");
  vi.mocked(parallelRequest).mockReset().mockImplementation(async (_method, path) => path === "/v1/search" ? { results: [] } : path === "/v1/responses" ? { id: "actual-mocked-response", output: [{type:"message",content:[{type:"output_text",text: JSON.stringify({benchmark_purpose:"competitor_market_benchmark",quotes:[]}),annotations:[]}]}] } : { run_id: "test-task" });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    wire.push({ url: String(url), body, authorization: new Headers(options.headers).get("authorization") });
    if (String(url).includes("mock-enterprise-mcp")) {
      const out = handleMockEnterpriseRpc(body);
      return out === null ? new Response(null, { status: 202 }) : Response.json(out, { headers: { "mcp-session-id": "test-mock-session" } });
    }
    const result = body.method === "initialize" ? { serverInfo: { name: "test-parallel" } } : body.method === "tools/list" ? { tools: ["web_search", "web_fetch", "web_research"].map((name) => ({ name, inputSchema: { properties: { query: { type: "string" }, urls: { type: "array" } } } })) } : { content: [{ type: "text", text: "Provider test evidence https://source.example/notice" }] };
    return Response.json({ jsonrpc: "2.0", id: body.id, result });
  }));
});
describe("explicit Live demo baselines", () => {
  for (const id of ids) {
    it(`${id}: selected demo loads an owned simulated baseline without Parallel`, async () => {
      const { rec, db } = await baseline(id);
      expect(rec.mode).toBe("live"); expect(rec.status).toBe("completed");
      expect(rec.result["baseline_source"]).toBe("demo"); expect(rec.result["owner_id"]).toBe("owner");
      expect(rec.captured_at).toBeNull(); expect(rec.input_hash).not.toBe("");
      expect(rec.facts.some((f) => f.status === "simulated")).toBe(true);
      expect(db.writes[0].user_id).toBe("owner");
      expect(parallelRequest).not.toHaveBeenCalled(); expect(getKey).not.toHaveBeenCalled();
      expect(wire.filter((w) => w.url.includes("parallel.ai"))).toHaveLength(0);
      expect(toReport(rec, {})).toContain("SIMULATED PRIMARY BASELINE");
    });
    it(`${id}: explicit outside action reaches mocked provider only after demo baseline`, async () => {
      const { rec } = await baseline(id); const db = store(rec);
      const data = { caseId: id, input: FIXTURE_INPUTS[id], baselineSource: "demo", baselineId: "stored-id", intent: intent(id), selectedItemIds: id === "UC01" ? ["auction-status"] : id === "UC02" ? ["bumper-guidance"] : undefined };
      const output = await (id === "UC05" ? war : start)({ data, context: db.context });
      expect(output.result["demonstration_notice"]).toContain("not real supplier savings");
      expect(db.selection.eq).toHaveBeenCalledWith("user_id", "owner");
      if (id === "UC05") {
        expect(output.status).toBe("completed");
        expect(parallelRequest).toHaveBeenCalledWith("POST", "/v1/responses", expect.anything(), expect.anything());
        expect(wire.some(w => w.url.includes("parallel.ai"))).toBe(false);
        expect(JSON.stringify(wire.filter((w) => w.url.includes("parallel.ai")))).not.toContain("MOCK_INTERNAL_ONLY_9F");
        expect(wire.filter((w) => w.url.includes("mock-enterprise-mcp")).map((w) => w.body.method)).toContain("tools/list");
      } else expect(parallelRequest).toHaveBeenCalledWith("POST", id === "UC03" || id === "UC04" ? "/v1/responses" : "/v1/tasks/runs", expect.anything(), expect.anything());
    });
    for (const block of ["answered", "missing-key", "cross-owner", "wrong-source", "unauthorized", "missing-baseline", "connected-error"] as const) it(`${id}: ${block} makes no external calls`, async () => {
      const { rec } = await baseline(id);
      if (block === "cross-owner") rec.result["owner_id"] = "other-owner";
      if (block === "connected-error") { rec.status = "error"; rec.result["baseline_source"] = "connected"; rec.result["adapter_state"] = "unconfigured"; }
      if (block === "missing-key") vi.mocked(getKey).mockImplementation(() => { throw new Error("Live configuration: missing key"); });
      const db = store(block === "missing-baseline" ? undefined : rec);
      const context = block === "unauthorized" ? { ...db.context, userId: "" } : db.context;
      const data = { caseId: id, input: FIXTURE_INPUTS[id], baselineSource: block === "wrong-source" || block === "connected-error" ? "connected" : "demo", baselineId: "stored-id", intent: intent(id, block === "answered" ? "Routine primary question" : "Explicit outside question") };
      wire.length = 0;
      if (block === "unauthorized") await expect((id === "UC05" ? war : start)({ data, context })).rejects.toThrow("Unauthorized");
      else expect((await (id === "UC05" ? war : start)({ data, context })).status).not.toBe("running");
      expect(parallelRequest).not.toHaveBeenCalled(); expect(wire).toHaveLength(0);
    });
    it(`${id}: connected load stays unconfigured and never substitutes demo`, async () => {
      const db = store(); const r = await start({ data: { caseId: id, input: FIXTURE_INPUTS[id], baselineSource: "connected" }, context: db.context });
      expect(r.status).toBe("error"); expect(r.result["baseline_source"]).toBe("connected");
      expect(r.facts).toHaveLength(0); expect(parallelRequest).not.toHaveBeenCalled(); expect(wire).toHaveLength(0);
    });
  }
});