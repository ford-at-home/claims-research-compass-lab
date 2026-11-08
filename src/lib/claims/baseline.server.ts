import { runBaseline, runBaselineFixture, type BaselineAdapter } from "./baseline-run";
import { runRentalLive } from "./rental.server";
import type { CaseId } from "./types";
import { McpHttpClient, toolText } from "./mcp-client.server";
import { fact } from "./fixtures";

export type BaselineSource = "demo" | "connected";
export async function readDemoEnterpriseMcp(origin: string, authorization: string) {
  const client = new McpHttpClient(`${origin}/api/mock-enterprise-mcp`, { authorization });
  const init = await client.initialize();
  const tools = await client.listTools();
  const names = (tools?.tools ?? []).map((t: { name: string }) => t.name);
  if (!names.includes("get_case_context") || !names.includes("get_demo_rules")) throw new Error("Mock enterprise tools were not discovered");
  const response = await client.callTool("get_case_context", { case_id: "UC05" });
  const rules = await client.callTool("get_demo_rules", { case_id: "UC05" });
  return { init, names, context: response?.structuredContent ?? JSON.parse(toolText(response) || "{}"), rules: rules?.structuredContent ?? null };
}

export const liveBaselineAdapter: BaselineAdapter = { read: () => ({ status: "unconfigured", answered_questions: [], coverage: [], error: "Existing-system adapter is unconfigured in this demo. The actual interface contract and coverage have not been supplied. No web substitute." }) };
export async function readLiveBaseline(caseId: CaseId, input: unknown, hash: string, now: string, source: BaselineSource = "connected", request?: { origin: string; authorization: string }) {
  if (source === "demo") {
    const demo = runBaselineFixture(caseId, input, hash, now);
    demo.mode = "live";
    demo.run_id = `live-demo-${demo.run_id}`;
    demo.label = "Live mode · SIMULATED existing-system baseline (demo)";
    demo.captured_at = null;
    demo.result = { ...demo.result, baseline_source: "demo", simulated_primary: true, baseline_owner_required: true };
    if (caseId === "UC05" && demo.status === "completed") {
      try {
        if (!request?.authorization) throw new Error("Authenticated mock MCP session required");
        const mcp = await readDemoEnterpriseMcp(request.origin, request.authorization);
        const internal = mcp.context?.case?.input?.internal_context;
        demo.result["internal_context"] = internal ?? null;
        demo.result["mock_mcp_context"] = mcp.context;
        demo.result["mock_mcp_rules"] = mcp.rules;
        demo.result["mcp_connections"] = { "mock-enterprise": "connected · actual HTTP MCP, SIMULATED data", parallel: "not requested" };
        demo.calls.mcp = 2;
        demo.trace = [{ at: now, op: "mock-enterprise initialize + tools/list", transport: "mcp-http", status: "ok", response: { server: mcp.init?.serverInfo, tools: mcp.names }, note: "Actual protocol; SIMULATED enterprise data. Zero Parallel calls." }, { at: now, op: "mock-enterprise.tools/call get_case_context, get_demo_rules", transport: "mcp-http", status: "ok", response: { retained_in_host: true }, note: "Actual mock MCP tools, not an insurer connection." }];
        demo.facts.push(fact({ fact_id: "demo-internal-delay", entity_id: "internal", attribute: "reported_delay_days", origin: "mock_enterprise", status: "simulated", evidence_type: "other", number_decimal: internal?.reported_delay_days === undefined ? null : String(internal.reported_delay_days), unit: "days", qualifiers: ["SIMULATED enterprise data via actual mock MCP"], citations: [{ source_ref: "mcp://mock-enterprise/get_case_context", url: null, excerpt: `SIMULATED reported delay days: ${internal?.reported_delay_days ?? "unknown"}` }] }, now));
      } catch {
        demo.status = "error"; demo.error = "Demo enterprise MCP failed. No direct-import or public research substitute.";
      }
    }
    return demo;
  }
  if (caseId === "UC03") {
    const rental = runRentalLive(input, hash, now);
    rental.result = { ...rental.result, baseline_source: "connected", scope_version: "baseline-first-v2", answered_questions: [], baseline_coverage: [] };
    return rental;
  }
  const connected = runBaseline(caseId, input, hash, "live", liveBaselineAdapter, now);
  connected.result["baseline_source"] = "connected";
  return connected;
}