import type { CaseId, EvidenceFact, RunRecord } from "./types";
import { canonical } from "./hash";

export type Disposition = "accepted" | "rejected" | "more_research";
export interface Review {
  disposition: Disposition;
  at: string;
  evidence_version: string;
}

const RUNS = (c: CaseId) => `claims-lab:fixture-runs:${c}`;
const REVIEWS = "claims-lab:reviews";

function read<T>(k: string, d: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "null") ?? d;
  } catch {
    return d;
  }
}

/** Only fixture runs are kept in the browser; live runs live in the backend run store. */
export function loadFixtureRuns(c: CaseId): RunRecord[] {
  return read<RunRecord[]>(RUNS(c), []).filter((r) => r.mode === "fixture");
}
export function saveFixtureRun(r: RunRecord) {
  if (r.mode !== "fixture") return;
  const list = [r, ...loadFixtureRuns(r.case_id)].slice(0, 20);
  localStorage.setItem(RUNS(r.case_id), JSON.stringify(list));
}

export function evidenceVersion(f: EvidenceFact): string {
  const s = canonical({ v: f.number_decimal, t: f.value_text, c: f.citations });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `ev-${(h >>> 0).toString(16)}`;
}

export function loadReviews(): Record<string, Review> {
  return read<Record<string, Review>>(REVIEWS, {});
}
export function setReview(runId: string, f: EvidenceFact, d: Disposition) {
  const all = loadReviews();
  all[`${runId}:${f.fact_id}`] = { disposition: d, at: new Date().toISOString(), evidence_version: evidenceVersion(f) };
  localStorage.setItem(REVIEWS, JSON.stringify(all));
  return all;
}
