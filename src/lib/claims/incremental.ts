import type { CaseId } from "./types";

export function incrementalPrompt(caseId: CaseId, question: string) {
  const domain: Record<CaseId, string> = {
    UC01: "Existing valuation/salvage outputs remain primary. Investigate only requested outside comparables; keep retail asks, completed sales and active bids distinct.",
    UC02: "Existing estimating/parts/labor data remain primary. Investigate only this exception or independent benchmark; do not routinely approve estimates or look up rates.",
    UC03: "Competitor public retail benchmarking only; integrated supplier pricing is authoritative and never researched.",
    UC04: "Existing weather/catastrophe/incident feeds remain primary. Seek only the precise missing corroboration/source. Warnings do not prove observations or damage.",
    UC05: "Enterprise tools provide internal facts. Seek only genuinely external evidence; do not reconstruct internal company data.",
  };
  return `Candidate experiment, not a verified insurer deficiency: ${domain[caseId]}\nEXPLICIT QUESTION: ${question}\nResearch this question only. Null for unknown values. Every numeric finding needs the specific source excerpt and URL supporting entity, units, dates and qualifiers. Retain contradictions, unknowns and sources. Report only extra supported findings beyond the existing baseline. No settlement, approval, coverage, booking, reservation or messaging actions.`;
}