import { baselineSchema, BASELINE_INFO } from "./baseline";
import { emptyRun, fact, runFixture } from "./fixtures";
import { mockSupplierAdapter, rentalScenarioSchema, runRentalBaseline } from "./rental";
import type { CaseId, Mode, RunRecord } from "./types";

export type BaselineAdapter = { read: (caseId: CaseId, input: unknown) => { status: "ok" | "error" | "incomplete" | "unconfigured"; answered_questions: string[]; coverage: string[]; error?: string } };
export function runBaseline(caseId: CaseId, wrapper: unknown, hash: string, mode: Mode, adapter: BaselineAdapter, now = new Date().toISOString()): RunRecord {
  const rec = emptyRun(caseId, mode, wrapper, hash, now);
  rec.result = { scope_version: "baseline-first-v2", workflow: "existing_capability_baseline", capability: BASELINE_INFO[caseId].capability, adapter_state: "unconfigured", answered_questions: [], baseline_coverage: [], incremental_metrics: null };
  rec.coverage = [{ category: "Parallel", status: "not_searched", notes: "Primary adapter path: zero Parallel calls. No outage fallback." }];
  try {
    const response = adapter.read(caseId, wrapper);
    rec.result = { ...rec.result, adapter_state: response.status === "ok" ? mode === "fixture" ? "simulated" : "configured" : response.status, answered_questions: response.answered_questions, baseline_coverage: response.coverage };
    rec.trace.push({ at: now, op: "baseline_adapter.read", transport: mode === "fixture" ? "simulated" : "none", status: response.status === "ok" ? mode === "fixture" ? "simulated" : "ok" : "error", response });
    if (response.status !== "ok") { rec.status = "error"; rec.error = response.error ?? "Existing integration response incomplete. No public substitute."; return rec; }
    if (caseId === "UC03") {
      const scenario = rentalScenarioSchema.safeParse(wrapper);
      if (!scenario.success) { rec.status = "blocked"; rec.error = "Invalid rental scenario contract."; return rec; }
      const rental = runRentalBaseline(wrapper, hash, mode, mockSupplierAdapter(scenario.data), now);
      rental.result = { ...rental.result, ...rec.result, adapter_state: rental.result["adapter_state"], workflow: "supplier_integration_baseline" };
      return rental;
    }
    rec.facts = response.answered_questions.map((q, i) => fact({ fact_id: `baseline-${i}`, entity_id: "existing_system", attribute: "answered_question", origin: "simulated_fixture", evidence_type: "other", value_text: q, status: "simulated", citations: [{ source_ref: `mock://baseline/${caseId}`, url: null, excerpt: `SIMULATED existing adapter response: ${q}. Not a claim about any insurer's actual coverage.` }] }, now));
    rec.steps = [{ name: "Read existing adapter", status: "done" }, { name: "Baseline coverage", status: "done" }, { name: "Reviewer evidence", status: "done" }];
    rec.summary = "SIMULATED existing-capability baseline. No external lookup. Actual vendor names, interfaces and coverage are unverified.";
    if (caseId === "UC05") rec.result = { ...rec.result, mcp_connections: { "mock-enterprise": "simulated baseline adapter", parallel: "not requested" }, private_canary_outbound: false, internal_context: (wrapper as { input?: { internal_context?: unknown } })?.input?.internal_context ?? null, brief: { supported_facts: [], hypotheses: [], contradictions: [], open_questions: [], next_actions: [] }, delay_causation: "not_established" };
  } catch { rec.status = "error"; rec.error = "Baseline integration error. Zero Parallel calls; no automatic public substitute."; }
  return rec;
}
export const mockBaselineAdapter: BaselineAdapter = { read: (_caseId, wrapper) => {
  const parsed = baselineSchema.safeParse((wrapper as { baseline?: unknown })?.baseline);
  if (!parsed.success) return { status: "incomplete", answered_questions: [], coverage: [], error: "Missing or invalid simulated baseline response." };
  return parsed.data;
} };
export function runBaselineFixture(caseId: CaseId, wrapper: unknown, hash: string, now?: string) {
  return runBaseline(caseId, wrapper, hash, "fixture", mockBaselineAdapter, now);
}
// Retain the imported arithmetic walkthroughs only as explicitly simulated OUTSIDE research.
export function runIncrementalFixture(caseId: CaseId, wrapper: unknown, hash: string) {
  return runFixture(caseId, wrapper, hash);
}