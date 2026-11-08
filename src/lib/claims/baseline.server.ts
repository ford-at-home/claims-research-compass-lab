import { runBaseline, type BaselineAdapter } from "./baseline-run";
import { runRentalLive } from "./rental.server";
import type { CaseId } from "./types";

export const liveBaselineAdapter: BaselineAdapter = { read: () => ({ status: "unconfigured", answered_questions: [], coverage: [], error: "Existing-system adapter is unconfigured in this demo. The actual interface contract and coverage have not been supplied. No web substitute." }) };
export function readLiveBaseline(caseId: CaseId, input: unknown, hash: string, now: string) {
  if (caseId === "UC03") {
    const rental = runRentalLive(input, hash, now);
    rental.result = { ...rental.result, scope_version: "baseline-first-v2", answered_questions: [], baseline_coverage: [] };
    return rental;
  }
  return runBaseline(caseId, input, hash, "live", liveBaselineAdapter, now);
}