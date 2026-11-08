import { dec } from "./calc";
import type { EvidenceFact } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Maps provider output.content.findings + output.basis to evidence_fact records. */
export function normalizeTaskOutput(output: any, retrievedAt: string): EvidenceFact[] {
  const content = output?.content ?? {};
  const basis: any[] = Array.isArray(output?.basis) ? output.basis : [];
  const findings: any[] = Array.isArray(content.findings) ? content.findings : [];
  return findings.map((f, i) => {
    const path = `findings.${i}`;
    const b = basis.filter((x) => x?.field === path || String(x?.field ?? "").startsWith(path + "."));
    const cites = (Array.isArray(f.citations) ? f.citations : [])
      .filter((c: any) => typeof c?.url === "string" && /^https?:\/\//.test(c.url))
      .map((c: any) => ({ source_ref: c.url, url: c.url, excerpt: String(c.excerpt ?? "") }));
    const num = dec(f.number_decimal ?? null);
    const statusMap: Record<string, EvidenceFact["status"]> = { candidate: "candidate", conflicting: "conflicting", insufficient: "insufficient", blocked: "blocked" };
    let status = statusMap[f.research_status] ?? "candidate";
    if (cites.length === 0 || cites.every((c: any) => !c.excerpt)) status = status === "candidate" ? "insufficient" : status;
    return {
      fact_id: `live-${i}-${String(f.finding_id ?? i).slice(0, 40)}`,
      entity_id: String(f.entity_id ?? "unknown"),
      attribute: String(f.attribute ?? "unknown"),
      origin: "live_web" as const,
      value_text: f.value_text ?? null,
      number_decimal: num ? num.toString() : null,
      unit: f.unit ?? null,
      currency: f.currency ?? null,
      evidence_type: String(f.evidence_type ?? "other"),
      status,
      citations: cites,
      retrieved_at: retrievedAt,
      effective_at: f.effective_at ?? null,
      published_at: f.published_at ?? null,
      source_observed_at: f.source_observed_at ?? null,
      qualifiers: Array.isArray(f.qualifiers) ? f.qualifiers.map(String) : [],
      provider_basis_paths: [path, ...b.map((x) => String(x.field)).filter((p) => p !== path)],
      vendor_confidence: b[0]?.confidence ?? null,
      formula: null,
      input_fact_ids: [],
    };
  });
}
