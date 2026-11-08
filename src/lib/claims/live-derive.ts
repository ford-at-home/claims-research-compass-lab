import { dec, minus, overlaps } from "./calc";
import { fact } from "./fixtures";
import type { CaseId, EvidenceFact } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Local calculations over normalized live facts. Unknown components yield null. */
export function deriveLiveResult(caseId: CaseId, facts: EvidenceFact[], wrapper: any, ctx: any, now: string) {
  const input = wrapper?.input ?? {};
  const by = (t: string) => facts.filter((f) => f.evidence_type === t);
  const ref = (f: EvidenceFact, inclusion: string, reason: string) => ({ entity_id: f.entity_id, fact_ids: [f.fact_id], inclusion, reason });
  const extra: EvidenceFact[] = [];
  const supported = (f: EvidenceFact) => f.citations.length > 0 && f.status !== "insufficient" && f.status !== "blocked";

  if (caseId === "UC01") {
    const fees = input.fees ?? {};
    const feeA = fact({ fact_id: "m-auction-fee", entity_id: "fees", attribute: "auction_fee", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(fees.auction_fee_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", citations: [{ source_ref: "mock://enterprise/UC01/fees", url: null, excerpt: "Simulated internal deduction" }] }, now);
    const feeT = fact({ fact_id: "m-transport", entity_id: "fees", attribute: "transport_cost", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(fees.transport_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", citations: [{ source_ref: "mock://enterprise/UC01/fees", url: null, excerpt: "Simulated internal deduction" }] }, now);
    extra.push(feeA, feeT);
    const sales = by("completed_sale").filter((f) => supported(f) && f.number_decimal);
    const nets = sales.map((s, i) => {
      const n = fact({ fact_id: `calc-net-${i}`, entity_id: s.entity_id, attribute: "net_recovery_example", origin: "calculation", evidence_type: "other", number_decimal: minus(s.number_decimal, [feeA.number_decimal, feeT.number_decimal]), unit: "USD", currency: "USD", formula: `${s.number_decimal} - ${feeA.number_decimal} - ${feeT.number_decimal}`, input_fact_ids: [s.fact_id, feeA.fact_id, feeT.fact_id], qualifiers: ["Example only; deductions are simulated internal values"] }, now);
      extra.push(n);
      return { entity_id: s.entity_id, gross_fact_id: s.fact_id, deduction_fact_ids: [feeA.fact_id, feeT.fact_id], net_fact_id: n.fact_id };
    });
    return {
      extra,
      result: {
        retail_comparables: by("asking_price").map((f) => ref(f, supported(f) ? "needs_review" : "excluded", supported(f) ? "Retail asking price; reviewer to confirm comparability" : "No supporting citation")),
        salvage_comparables: [...by("completed_sale").map((f) => ref(f, supported(f) ? "needs_review" : "excluded", "Completed sale")), ...by("active_bid").map((f) => ref(f, "excluded", "Active bid is not a completed sale"))],
        excluded_candidates: by("active_bid").map((f) => ref(f, "excluded", "Active bid excluded from completed sale comparison")),
        recall_evidence: [...by("recall_campaign"), ...by("vin_recall_status")].map((f) => f.fact_id),
        net_recovery_examples: nets,
        valuation_status: sales.length ? "research_only" : "insufficient_evidence",
        settlement_value: null,
      },
      gaps: sales.length ? [] : ["No supported completed damaged sale: insufficient evidence. Asking prices are not substituted."],
    };
  }
  if (caseId === "UC02") {
    const cands = facts.filter((f) => ["supplier_quote", "asking_price"].includes(f.evidence_type));
    return {
      extra,
      result: {
        line_findings: (input.lines ?? []).map((l: any) => ({ line_id: l.id, fact_ids: facts.filter((f) => f.entity_id === l.id).map((f) => f.fact_id) })),
        match_status: cands.map((f) => ({ candidate_id: f.fact_id, line_id: f.entity_id, status: supported(f) ? "needs_fitment_review" : "insufficient_evidence", reason: "Exact part number not supplied; fitment and condition need reviewer confirmation" })),
        price_components: cands.map((f) => ({ candidate_id: f.fact_id, part: f.number_decimal, quantity: null, shipping: null, core_charge: null, mandatory_fees: null })),
        comparisons: (input.lines ?? []).filter((l: any) => l.estimate_price_usd).map((l: any) => ({ line_id: l.id, comparable_total_usd: null, delta_usd: null, reason: "No exact_supported candidate with all cost components; total stays null" })),
        shop_checks: by("shop_detail").map((f) => ({ fact_id: f.fact_id, status: "candidate" })),
        labor_checks: [{ labor_rate_status: by("posted_rate").some(supported) ? "candidate" : "insufficient_evidence", fact_ids: by("posted_rate").map((f) => f.fact_id), reason: "Same discipline/geography/period must be reviewed" }],
      },
      gaps: ["Missing labor data stays unresolved unless posted-rate evidence is reviewed."],
    };
  }
  if (caseId === "UC03") {
    const quotes = facts.filter((f) => ["posted_rate", "supplier_quote"].includes(f.evidence_type));
    return {
      extra,
      result: {
        resolved_window: { pickup_at: ctx?.pickup_at, return_at: ctx?.return_at, timezone: ctx?.location?.timezone },
        existing_option: { origin: "mock_enterprise", daily_all_in_usd: input.existing_extension?.daily_all_in_usd ?? null },
        alternative_quotes: quotes.map((f) => ({ entity_id: f.entity_id, fact_ids: [f.fact_id], availability_basis: f.evidence_type === "supplier_quote" ? "supplier_quote_reported" : "advertised_only", supplier_confirmed: false })),
        scenario_totals: quotes.map((f) => ({ entity_id: f.entity_id, total_usd: null, reason: "Branch, class, dates and all mandatory fees must be confirmed before a total" })),
        suitability: [{ vehicle_class: input.vehicle_class, seats_needed: input.seats_needed, status: "unknown" }],
        next_action: quotes.length ? "confirm_supplier" : "insufficient_evidence",
        supplier_confirmation_required: true,
      },
      gaps: ["No inventory is confirmed by public research. No booking or reservation is made."],
    };
  }
  if (caseId === "UC04") {
    const w = ctx?.loss_window_utc ?? {};
    const evs = facts.filter((f) => ["event_observation", "warning"].includes(f.evidence_type));
    const tm = evs.map((f) => ({ event_id: f.fact_id, status: overlaps(f.effective_at, w.start, w.end), reason: `effective_at ${f.effective_at ?? "unknown"}` }));
    const corroborating = evs.some((f, i) => f.evidence_type === "event_observation" && supported(f) && tm[i]?.status === "overlap");
    return {
      extra,
      result: {
        loss_window_utc: w,
        events: evs.map((f) => ref(f, f.evidence_type === "event_observation" ? "needs_review" : "excluded", f.evidence_type === "warning" ? "Warning is not an observed event" : "Observed event candidate")),
        geographic_matches: evs.map((f) => ({ event_id: f.fact_id, method: ctx?.location?.latitude !== undefined ? "point distance not computed (no event coordinates in finding)" : "ZIP-only area match", distance_fact_id: null, precision: ctx?.location?.latitude !== undefined ? "unknown" : "area" })),
        temporal_matches: tm,
        assessment: corroborating ? "corroborating" : "insufficient_evidence",
        source_coverage: [{ category: "weather", query_window: `${w.start}/${w.end}`, status: "searched", notes: "Official weather domains (source policy)" }],
        vehicle_damage_proven: false,
        warning_is_observation: false,
      },
      gaps: corroborating ? [] : ["No supported observation in window: insufficient evidence (not evidence of no event)."],
    };
  }
  return { extra, result: {}, gaps: [] };
}
