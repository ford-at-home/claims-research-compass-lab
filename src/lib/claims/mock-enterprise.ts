// Mock enterprise MCP tool logic (synthetic data only). Served over HTTP MCP by
// src/routes/api/mock-enterprise-mcp.ts — the host reaches it through the MCP protocol, not a direct import.
import { FIXTURE_INPUTS, MOCK_ENTERPRISE } from "./spec";
import type { CaseId } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function handleMockEnterpriseRpc(msg: any): any {
  const { id, method, params } = msg ?? {};
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
  if (method === "initialize")
    return ok({ protocolVersion: params?.protocolVersion ?? "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: MOCK_ENTERPRISE.server_name, version: "1.0.0" } });
  if (method === "tools/list") return ok({ tools: MOCK_ENTERPRISE.tools });
  if (method === "tools/call") {
    const caseId = params?.arguments?.case_id as CaseId;
    if (!FIXTURE_INPUTS[caseId]) return err(-32602, "Invalid case_id");
    if (params?.name === "get_case_context") {
      const payload = { data_origin: "mock_enterprise", case: FIXTURE_INPUTS[caseId], outbound_public_field_allowlist: MOCK_ENTERPRISE.outbound_public_field_allowlist };
      return ok({ content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload });
    }
    if (params?.name === "get_demo_rules") {
      const payload = { data_origin: "mock_enterprise", rules: ["Simulated comparison rules only; no production insurance policy.", "A public notice does not establish internal delay causation.", "Only question, public_vehicle and region may leave the host."] };
      return ok({ content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload });
    }
    return err(-32601, "Unknown tool");
  }
  if (typeof method === "string" && method.startsWith("notifications/")) return null;
  return err(-32601, "Method not found");
}
