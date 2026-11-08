import { z } from "zod";
import type { CaseId, RunRecord } from "./types";

export const baselineSchema = z.object({
  status: z.enum(["ok", "error", "incomplete"]),
  answered_questions: z.array(z.string()),
  coverage: z.array(z.string()),
  origin: z.literal("simulated_fixture"),
});
export const researchIntentSchema = z.object({
  action: z.enum(["research_incremental_question", "benchmark_competitor_rates"]),
  question: z.string().trim().min(1),
  reason: z.enum(["uncovered_question", "requested_benchmark"]),
});
export type ResearchIntent = z.infer<typeof researchIntentSchema>;
export const BASELINE_INFO: Record<CaseId, { capability: string; question: string }> = {
  UC01: { capability: "Existing valuation and salvage outputs", question: "A documented outside comparable question or requested market benchmark" },
  UC02: { capability: "Existing estimating, parts, labor and repair sources", question: "A defined unresolved exception or requested independent benchmark" },
  UC03: { capability: "Existing rental supplier pricing integration (confirmed)", question: "Benchmark competitor rates from different suppliers in the same area" },
  UC04: { capability: "Existing catastrophe, weather and incident feeds", question: "A precise missing corroboration question or missing public source" },
  UC05: { capability: "Existing enterprise tools and internal facts", question: "A genuinely external evidence question, joined to internal context locally" },
};
export function baselineSample(caseId: CaseId) {
  return { status: "ok", answered_questions: ["Routine primary question"], coverage: [BASELINE_INFO[caseId].capability], origin: "simulated_fixture" };
}
export function researchGate(caseId: CaseId, baseline: RunRecord, intent: unknown) {
  const parsed = researchIntentSchema.safeParse(intent);
  if (!parsed.success) return { allowed: false, reason: "A separate research action, explicit question and reason are required." };
  if (baseline.status !== "completed" || baseline.result["adapter_state"] === "unconfigured") return { allowed: false, reason: "Baseline integration is failed, incomplete or unconfigured. Research cannot replace it." };
  const answered: string[] = baseline.result["answered_questions"] ?? [];
  if (answered.some((q) => q.trim().toLowerCase() === parsed.data.question.toLowerCase())) return { allowed: false, reason: "The existing baseline already answers this question. Zero Parallel calls." };
  if (caseId === "UC03" && (parsed.data.action !== "benchmark_competitor_rates" || parsed.data.reason !== "requested_benchmark")) return { allowed: false, reason: "Rental research is limited to the explicitly requested competitor benchmark." };
  return { allowed: true, reason: "Explicit incremental question; no claim of a verified business deficiency." };
}
export function incrementalMetrics(baseline: RunRecord, outside: RunRecord) {
  const known = new Set(baseline.facts.map((f) => `${f.entity_id}|${f.attribute}|${f.number_decimal ?? f.value_text}`));
  const supported = outside.facts.filter((f) => f.origin !== "calculation" && ["supported", "simulated"].includes(f.status) && f.citations.some((c) => c.excerpt && (outside.mode === "fixture" || c.url)));
  const added = supported.filter((f) => !known.has(`${f.entity_id}|${f.attribute}|${f.number_decimal ?? f.value_text}`));
  return { additional_supported_findings: added.length, redundant_findings: supported.length - added.length, additional_fact_ids: added.map((f) => f.fact_id), non_redundant_coverage: [...new Set(added.flatMap((f) => f.citations.map((c) => c.url ?? c.source_ref)))], reviewer_effort: null, effort_basis: "Not measured; no savings claim", simulation: outside.mode === "fixture" };
}