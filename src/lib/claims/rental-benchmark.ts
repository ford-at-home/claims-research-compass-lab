import { z } from "zod";
import { dec, minus, sum, times } from "./calc";
import { incrementalPrompt } from "./incremental";
import { rentalScenarioSchema } from "./rental";
import type { RunRecord } from "./types";

export const competitorQuoteSchema = z.object({
  supplier: z.string(), supplier_identity_verified: z.boolean(), branch_area: z.string().nullable(),
  pickup_at: z.string().nullable(), return_at: z.string().nullable(), days: z.number().nullable(), vehicle_class: z.string().nullable(), seats: z.number().nullable(), currency: z.string().nullable(),
  daily_rate: z.string().nullable(), required_fees: z.string().nullable(), all_required_fees_known: z.boolean(), rate_basis: z.string().nullable(), quoted_at: z.string().nullable(),
  availability_basis: z.string().nullable(), url: z.string().nullable(), excerpt: z.string().nullable(), supported_terms: z.array(z.string()),
});
export type CompetitorQuote = z.infer<typeof competitorQuoteSchema>;
export const competitorTaskOutputSchema = z.object({ benchmark_purpose: z.literal("competitor_market_benchmark"), quotes: z.array(competitorQuoteSchema) });
export const competitorTaskJsonSchema = {
  type: "object", required: ["benchmark_purpose", "quotes"], additionalProperties: false,
  properties: {
    benchmark_purpose: { type: "string", enum: ["competitor_market_benchmark"] },
    quotes: { type: "array", items: { type: "object", additionalProperties: false, required: Object.keys(competitorQuoteSchema.shape), properties: Object.fromEntries(Object.keys(competitorQuoteSchema.shape).map((key) => [key, key === "supported_terms" ? { type: "array", items: { type: "string" } } : ["supplier_identity_verified", "all_required_fees_known"].includes(key) ? { type: "boolean" } : ["days", "seats"].includes(key) ? { type: ["number", "null"] } : { type: key === "supplier" ? "string" : ["string", "null"] }])) } },
  },
};
export function competitorBenchmarkContext(input: unknown, baseline: RunRecord, question: string) {
  const s = rentalScenarioSchema.parse(input);
  return {
    benchmark_purpose: "competitor_market_benchmark",
    question, branch_area: `${s.input.location.zip} ${s.input.location.state}`,
    pickup_at: baseline.result["resolved_window"]?.pickup_at, return_at: baseline.result["resolved_window"]?.return_at,
    days: s.input.requested_days, vehicle_class: s.input.vehicle_class, seats: s.input.seats_needed, currency: "USD",
    excluded_supplier: s.input.public_supplier_exclusion?.name ?? s.input.supplier_fixture.supplier_identity ?? null,
    excluded_supplier_groups: s.input.public_supplier_exclusion?.same_group_names ?? s.input.supplier_fixture.excluded_supplier_groups ?? [],
    baseline_identity_basis: baseline.result["baseline_source"] === "demo" ? "SIMULATED target, not an actual insurer vendor. Optional exclusion name is public-only." : "Connected supplier identity",
    purpose: "Public RETAIL quotes from different suppliers only. Do not obtain or verify integrated supplier pricing, contact suppliers or change reservations.",
    // Contracted prices, insurer rules and private context are intentionally absent.
  };
}
export function compareCompetitorQuotes(baseline: RunRecord, quotes: CompetitorQuote[], now: string) {
  const input = rentalScenarioSchema.parse(baseline.input).input;
  const window = baseline.result["resolved_window"];
  const supplier = baseline.result["supplier_pricing"];
  const expected = { branch_area: `${input.location.zip} ${input.location.state}`, pickup_at: window?.pickup_at, return_at: window?.return_at, days: input.requested_days, vehicle_class: input.vehicle_class, seats: input.seats_needed, currency: "USD" };
  const seen = new Set<string>();
  return quotes.map((q) => {
    const mismatches: string[] = [];
    const identity = `${q.supplier.trim().toLowerCase()}|${q.branch_area?.trim().toLowerCase() ?? ''}`;
    if (seen.has(identity)) mismatches.push('Duplicate supplier/branch or locale listing; not an independent competitor');
    seen.add(identity);
    if (/equipment|tool hire|heavy machinery/i.test(`${q.supplier} ${q.rate_basis ?? ''}`)) mismatches.push('Irrelevant equipment rental, not passenger cars');
    if (/aggregator|broker|comparison site/i.test(q.rate_basis ?? '')) mismatches.push('Aggregator observation, independent supplier identity needs direct evidence');
    if (!q.supplier_identity_verified || !input.supplier_fixture.supplier_identity || q.supplier.toLowerCase() === input.supplier_fixture.supplier_identity.toLowerCase()) mismatches.push("Different supplier identity is not established");
    if (input.public_supplier_exclusion?.name.toLowerCase() === q.supplier.toLowerCase()) mismatches.push("Specified public supplier exclusion");
    if ((input.public_supplier_exclusion?.same_group_names ?? []).some((name) => name.toLowerCase() === q.supplier.toLowerCase())) mismatches.push("Specified public same-group supplier exclusion");
    if ((input.supplier_fixture.excluded_supplier_groups ?? []).some((name) => name.toLowerCase() === q.supplier.toLowerCase())) mismatches.push("Known same-group supplier is excluded");
    for (const [key, value] of Object.entries(expected)) {
      if (q[key as keyof CompetitorQuote] !== value || !q.supported_terms.includes(key)) mismatches.push(`${key} mismatch or unsupported`);
    }
    if (!q.url?.startsWith("https://") || !q.excerpt) mismatches.push("Specific source URL/excerpt missing");
    if (!q.all_required_fees_known || !q.supported_terms.includes("daily_rate") || !q.supported_terms.includes("required_fees")) mismatches.push("Required fee/price evidence incomplete");
    const age = q.quoted_at ? Date.parse(now) - Date.parse(q.quoted_at) : NaN;
    if (!Number.isFinite(age) || age < 0 || age > 86400000 || !q.supported_terms.includes("quoted_at")) mismatches.push("Quote freshness unverified or older than 24h review window");
    if (!q.rate_basis || !q.availability_basis) mismatches.push("Rate or availability basis missing");
    const total = mismatches.length ? null : sum([times(q.daily_rate, input.requested_days), q.required_fees]);
    if (total === null && !mismatches.length) mismatches.push("Invalid price components");
    const switching = input.switching_cost_usd ?? null;
    const supplierTotal = dec(supplier?.total_usd);
    const delta = total === null ? null : minus(total, [supplier?.total_usd ?? null]);
    return { ...q, mismatches, comparable: mismatches.length === 0, total_usd: total,
      delta_vs_supplier_usd: total === null ? null : minus(total, [supplier?.total_usd ?? null]),
      delta_vs_supplier_percent: delta === null || !supplierTotal || supplierTotal.isZero() ? null : dec(delta)?.div(supplierTotal).times(100).toFixed(2) ?? null,
      baseline_rate_basis: supplier?.rate_basis ?? "integrated_supplier_contracted", baseline_origin: supplier?.origin ?? null,
      comparison_basis: supplier?.origin === "simulated_fixture" ? "Simulation-only comparison, not live market savings" : "Public retail versus contracted supplier rate",
      separate_switching_scenario: { switching_cost_usd: switching, total_including_switching_usd: total === null || switching === null ? null : sum([total, switching]) },
    };
  });
}
export function benchmarkPrompt(question: string) {
  return `${incrementalPrompt("UC03", question)}\nResearch ONLY the requested competitor benchmark: ${question}. Return benchmark_purpose as competitor_market_benchmark. Find actual retrievable public retail quotes from DIFFERENT suppliers in the SAME area; exclude known same-group brands. Require exact dates, length, vehicle class, seating, currency, daily rate and every mandatory fee. Null if unknown; never infer a quote from a branch landing page. Include exact supporting excerpt and URL for numeric facts and all matched terms, quote timestamp, rate basis, availability/confirmation basis. supported_terms lists ONLY fields explicitly evidenced in the excerpt. Do not research the integrated supplier's pricing, assume retail equals contracted pricing, add switching costs to market totals, book, message or modify reservations.`;
}