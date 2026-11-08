import type { RunRecord } from "./types";
import type { Review } from "./local-store";

export function runReviews(run: RunRecord, all: Record<string, Review>) {
  return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(run.run_id + ":")).map(([k, v]) => [k.slice(run.run_id.length + 1), v]));
}

export function toReport(run: RunRecord, reviews: Record<string, Review>): string {
  const L: string[] = [];
  L.push(`# ${run.case_id} research run ${run.run_id}`, "");
  L.push(`Mode: ${run.mode.toUpperCase()} — ${run.label}`);
  if (run.mode === "fixture") L.push("**SIMULATED: all observations below are fabricated for an offline demonstration.**");
  L.push(`Status: ${run.status}`, `Created: ${run.created_at}`, `Captured: ${run.captured_at ?? "n/a"}`, `Input hash: ${run.input_hash}`, "");
  if (run.error) L.push(`Error: ${run.error}`, "");
  if (run.summary) L.push("## Summary", run.summary, "");
  L.push("## Facts", "");
  for (const f of run.facts) {
    const r = reviews[f.fact_id];
    L.push(`- **${f.fact_id}** [${f.origin}] ${f.attribute} = ${f.number_decimal ?? f.value_text ?? "null"} ${f.unit ?? ""} (${f.evidence_type}, ${f.status})${r ? ` — review: ${r.disposition} @ ${r.at}` : ""}`);
    if (f.formula) L.push(`  - formula: ${f.formula}; inputs: ${f.input_fact_ids.join(", ")}`);
    for (const c of f.citations) L.push(`  - source: ${c.url ?? c.source_ref} — "${c.excerpt.slice(0, 300)}"`);
  }
  L.push("", "## Gaps", ...run.gaps.map((g) => `- ${g}`), "", "## Coverage", ...run.coverage.map((c) => `- ${c.category}: ${c.status} — ${c.notes}`));
  return L.join("\n");
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
