import { emptyRun, fact } from "./fixtures";
import { compareCompetitorQuotes, type CompetitorQuote } from "./rental-benchmark";
import type { RunRecord } from "./types";
import { STORYBOARDS } from "./spec";

export function runBenchmarkFixture(baseline: RunRecord, hash: string) {
  const now = new Date().toISOString();
  const rec = emptyRun("UC03", "fixture", baseline.input, hash, now);
  const observation = STORYBOARDS.UC03.observations[0];
  const quote: CompetitorQuote = { supplier: "SIMULATED competitor supplier", supplier_identity_verified: true, branch_area: "23220 VA", pickup_at: baseline.result["resolved_window"]?.pickup_at ?? null, return_at: baseline.result["resolved_window"]?.return_at ?? null, days: 3, vehicle_class: "midsize", seats: 5, currency: "USD", daily_rate: "45.00", required_fees: "18.00", all_required_fees_known: true, rate_basis: "SIMULATED public retail", quoted_at: now, availability_basis: "SIMULATED advertised only; not confirmed", url: "https://simulation.invalid/competitor-quote", excerpt: "SIMULATED quote: midsize, five seats, 23220 VA, three days, 45.00 USD/day plus 18.00 USD required fees; matching synthetic dates. Not real evidence.", supported_terms: ["branch_area", "pickup_at", "return_at", "days", "vehicle_class", "seats", "currency", "daily_rate", "required_fees", "quoted_at"] };
  quote.supplier = observation.provider_name;
  quote.daily_rate = observation.daily_usd;
  quote.days = observation.days;
  quote.required_fees = observation.mandatory_fees_usd;
  quote.rate_basis = observation.rate_basis;
  quote.supplier = "SIMULATED competitor A";
  quote.excerpt = `SIMULATED competitor A: ${quote.pickup_at} to ${quote.return_at}, midsize, five seats, 23220 VA, three days; 45.00 USD/day plus 18.00 USD mandatory fees. Fabricated public retail quote, advertised availability only.`;
  const second: CompetitorQuote = { ...quote, supplier: "SIMULATED competitor B", daily_rate: "48.00", required_fees: "12.00", url: "https://simulation.invalid/competitor-b", excerpt: `SIMULATED competitor B: ${quote.pickup_at} to ${quote.return_at}, midsize, five seats, 23220 VA, three days; 48.00 USD/day plus 12.00 USD mandatory fees. Fabricated public retail quote, advertised availability only.` };
  const incomplete: CompetitorQuote = { ...quote, supplier: "SIMULATED incomplete candidate", daily_rate: null, seats: null, required_fees: null, quoted_at: null, supported_terms: [], excerpt: "SIMULATED incomplete candidate: no retrievable dated quote; seating and mandatory fees unknown. No amount or availability established." };
  const comparisons = compareCompetitorQuotes(baseline, [quote, second, incomplete], now);
  rec.result = { scope_version: "baseline-first-v2", spec_revision: "2026-11-08-existing-systems-first", benchmark_purpose: "competitor_market_benchmark", competitor_comparisons: comparisons, baseline_snapshot: baseline };
  rec.facts = comparisons.map((q, i) => fact({ fact_id: `sim-competitor-${i}`, entity_id: q.supplier, attribute: "public_retail_rental_total", origin: "simulated_fixture", evidence_type: "posted_rate", status: q.comparable ? "simulated" : "insufficient", number_decimal: q.total_usd, unit: "USD", currency: "USD", qualifiers: q.mismatches, citations: [{ source_ref: "fixture://competitor-benchmark", url: null, excerpt: q.excerpt ?? "SIMULATED unknown" }] }, now));
  rec.summary = "SIMULATED competitor benchmark. Base market total excludes switching costs; incomplete terms stay non-comparable. No provider calls.";
  rec.coverage = [{ category: "competitor benchmark", status: "simulated", notes: "Fabricated scenario, not actual competitor prices or savings." }];
  return rec;
}