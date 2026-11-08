import { z } from "zod";
import { dec, resolveRentalWindow, times } from "./calc";
import type { Mode, RunRecord } from "./types";
import canonicalRental from "../../../specifications/parallel-claims/fixtures/UC03_rental_extensions.input.json";

export const rentalScenarioSchema = z.object({
  case_id: z.literal("UC03"),
  data_origin: z.literal("synthetic"),
  input: z.object({
    location: z.object({ zip: z.string(), state: z.string(), timezone: z.string() }),
    branch_reference: z.string().nullable(),
    pickup_offset_days: z.number().int(),
    requested_days: z.number().int().positive(),
    vehicle_class: z.string(),
    seats_needed: z.number().int().positive(),
    repair_status: z.object({ remaining_days: z.number().int().nonnegative().nullable(), origin: z.literal("mock_enterprise") }),
    insurer_rules: z.object({ rule_version: z.string(), max_review_days: z.number().int().positive().nullable(), origin: z.literal("simulated_fixture") }),
    supplier_fixture: z.object({ daily_all_in_usd: z.string().nullable(), supplier_identity: z.string().nullable().optional(), excluded_supplier_groups: z.array(z.string()).optional(), rate_basis: z.string().optional(), response_status: z.enum(["ok", "error", "incomplete"]) }),
    switching_cost_usd: z.string().nullable().optional(),
    public_supplier_exclusion: z.object({ name: z.string().max(120), same_group_names: z.array(z.string().max(120)).max(10) }).optional(),
  }),
});
export type RentalScenario = z.infer<typeof rentalScenarioSchema>;
export const RENTAL_CAPABILITIES = {
  pricing: "confirmed_by_user",
  availability: "unverified",
  reservation_read: "unverified",
  extension_read: "unverified",
  reservation_write: "not_enabled",
} as const;
export const RENTAL_SAMPLE: RentalScenario = {
  case_id: "UC03", data_origin: "synthetic",
  input: {
    location: canonicalRental.input.location,
    branch_reference: null, pickup_offset_days: canonicalRental.input.pickup_offset_days, requested_days: canonicalRental.input.requested_days, vehicle_class: canonicalRental.input.vehicle_class, seats_needed: canonicalRental.input.seats_needed,
    repair_status: { remaining_days: canonicalRental.input.repair_status.remaining_days, origin: "mock_enterprise" },
    insurer_rules: { rule_version: "simulation-v1", max_review_days: null, origin: "simulated_fixture" },
    supplier_fixture: { daily_all_in_usd: canonicalRental.input.existing_extension.daily_all_in_usd, supplier_identity: "SIMULATED integrated supplier", excluded_supplier_groups: canonicalRental.input.existing_supplier.group_ids, rate_basis: canonicalRental.input.existing_supplier.rate_basis, response_status: "ok" },
    switching_cost_usd: canonicalRental.input.transfer_cost_usd,
  },
};

export type SupplierRequest = { branch_reference: string | null; pickup_at: string; return_at: string; requested_days: number; vehicle_class: string };
export type SupplierResponse =
  | { status: "unconfigured" | "error" | "incomplete"; error: string }
  | { status: "ok"; origin: "simulated_fixture" | "supplier_integration"; daily_all_in_usd: string | null; source_ref: string; excerpt: string };
export type SupplierAdapter = { getPricing: (request: SupplierRequest) => SupplierResponse };

export function mockSupplierAdapter(scenario: RentalScenario): SupplierAdapter {
  return { getPricing: () => {
    const fixture = scenario.input.supplier_fixture;
    if (fixture.response_status !== "ok") return { status: fixture.response_status, error: "Simulated supplier response failed or is incomplete. No web-price fallback." };
    return { status: "ok", origin: "simulated_fixture", daily_all_in_usd: fixture.daily_all_in_usd, source_ref: "mock://supplier/UC03/pricing", excerpt: `SIMULATED supplier pricing response: daily all-in USD ${fixture.daily_all_in_usd ?? "unknown"}. No availability or extension confirmation supplied.` };
  } };
}

export function rentalExceptionEligibility(action: unknown, question: unknown) {
  if (action !== "benchmark_competitor_rates") return { allowed: false, reason: "A separate Benchmark competitor rates action is required." };
  if (typeof question !== "string" || !question.trim()) return { allowed: false, reason: "An explicit external question is required." };
  return { allowed: true, reason: "Competitor benchmarking is explicitly requested; a successful baseline and matched source terms are still required." };
}

/** Only the supplier adapter is a dependency. No Parallel client or fallback is reachable. */
export function runRentalBaseline(wrapper: unknown, inputHash: string, mode: Mode, adapter: SupplierAdapter, now = new Date().toISOString()): RunRecord {
  const run: RunRecord = {
    run_id: `${mode}-UC03-${Date.parse(now).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    case_id: "UC03", mode, label: mode === "fixture" ? "Simulated supplier integration baseline" : "Supplier integration baseline",
    status: "error", input: wrapper, input_hash: inputHash, created_at: now, captured_at: null,
    steps: [], facts: [], result: { workflow: "supplier_integration_baseline", capabilities: RENTAL_CAPABILITIES, adapter_state: "unconfigured", external_gap: "not_identified", pricing_authority: "supplier_integration", reservation_modified: false, coverage_decision: null },
    gaps: [], coverage: [{ category: "Parallel", status: "not_searched", notes: "Zero Parallel calls in the ordinary supplier workflow. No web-price fallback." }],
    trace: [], provider_ids: {}, calls: { search: 0, extract_urls: 0, task: 0, decisions: 0, mcp: 0 }, error: null, summary: null,
  };
  const parsed = rentalScenarioSchema.safeParse(wrapper);
  if (!parsed.success) { run.status = "blocked"; run.error = "Invalid supplier baseline scenario contract. Check dates, rules and simulated supplier fields."; return run; }
  const input = parsed.data.input;
  try {
    const window = resolveRentalWindow(new Date(now), input.location.timezone, input.pickup_offset_days, input.requested_days);
    run.result["resolved_window"] = window;
    const request: SupplierRequest = { branch_reference: input.branch_reference, ...window, requested_days: input.requested_days, vehicle_class: input.vehicle_class };
    run.steps.push({ name: "Validate scenario", status: "done" });
    const response = adapter.getPricing(request);
    run.result["adapter_state"] = response.status === "ok" ? response.origin === "simulated_fixture" ? "simulated" : "configured" : response.status;
    run.trace.push({ at: now, op: "supplier_adapter.getPricing", transport: response.status === "ok" && response.origin === "simulated_fixture" ? "simulated" : "none", status: response.status === "ok" ? response.origin === "simulated_fixture" ? "simulated" : "ok" : "error", request, response });
    run.steps.push({ name: "Supplier pricing", status: response.status === "ok" ? "done" : "error" });
    if (response.status !== "ok") { run.error = `Supplier integration ${response.status}: ${response.error}`; return run; }
    // Never accept injected simulated supplier evidence in a Live run.
    if (mode !== "fixture" && response.origin === "simulated_fixture") { run.error = "Supplier integration error: simulated pricing cannot be used in Live or Replay."; return run; }
    const rate = dec(response.daily_all_in_usd);
    if (!rate || rate.isNegative()) { run.error = "Supplier integration incomplete: valid all-in pricing is missing. No web-price fallback."; run.result["adapter_state"] = "incomplete"; return run; }
    const daily = rate.toFixed(2);
    const total = times(daily, input.requested_days);
    const isSim = response.origin === "simulated_fixture";
    const baseFact = { value_text: null, currency: "USD", retrieved_at: now, effective_at: null, published_at: null, source_observed_at: null, qualifiers: [isSim ? "SIMULATED supplier response" : "Supplier integration response"], provider_basis_paths: [], vendor_confidence: null, formula: null, input_fact_ids: [] };
    run.facts = [
      { ...baseFact, fact_id: "f-supplier-daily", entity_id: "supplier", attribute: "supplier_daily_all_in_rate", origin: isSim ? "simulated_fixture" : "licensed_source", status: isSim ? "simulated" : "supported", evidence_type: "supplier_quote", number_decimal: daily, unit: "USD per day", citations: [{ source_ref: response.source_ref, url: null, excerpt: response.excerpt }] },
      { ...baseFact, fact_id: "calc-supplier-total", entity_id: "supplier", attribute: "requested_duration_cost", origin: "calculation", status: isSim ? "simulated" : "supported", evidence_type: "other", number_decimal: total, unit: "USD", citations: [], formula: `${daily} * ${input.requested_days}`, input_fact_ids: ["f-supplier-daily"] },
    ];
    run.result = { ...run.result, supplier_pricing: { daily_all_in_usd: daily, total_usd: total, origin: response.origin, rate_basis: isSim ? input.supplier_fixture.rate_basis ?? "simulated_supplier_agreement" : "supplier_agreement" }, availability: null, extension_confirmed: null, reservation: null,
      repair_context: input.repair_status, insurer_rules: input.insurer_rules,
      local_review: { requested_days: input.requested_days, repair_remaining_days: input.repair_status.remaining_days, within_rule_limit: input.insurer_rules.max_review_days === null ? null : input.requested_days <= input.insurer_rules.max_review_days, matches_repair_timing: input.repair_status.remaining_days === null ? null : input.requested_days === input.repair_status.remaining_days, decision: "reviewer_required" },
    };
    run.gaps = ["Supplier availability, reservation and extension capabilities are unverified; fields remain null.", "Branch reference is not supplied in the synthetic sample; exact-branch pricing cannot be asserted.", "Insurer rules and repair context are simulated; no coverage or duration approval is made."];
    run.steps.push({ name: "Local rules & repair timing", status: "done" }, { name: "Reviewer evidence", status: "done" });
    run.status = "completed";
    run.captured_at = mode === "live" ? now : null;
    run.summary = `${isSim ? "SIMULATED — " : ""}Supplier integration baseline: ${daily} USD/day × ${input.requested_days} days = ${total} USD. Reviewer evidence only; zero Parallel calls.`;
  } catch {
    run.error = "Supplier integration error: request failed or dates could not be resolved. No web-price fallback.";
    run.result["adapter_state"] = "error";
  }
  return run;
}