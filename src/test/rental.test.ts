import { describe, expect, it, vi } from "vitest";
import { mockSupplierAdapter, RENTAL_SAMPLE, rentalExceptionEligibility, runRentalBaseline } from "@/lib/claims/rental";
import { supplierAdapter } from "@/lib/claims/rental.server";
import { runFixture } from "@/lib/claims/fixtures";

const now = "2026-11-08T04:43:00Z";
describe("supplier-first UC03", () => {
  it("normal run calls the supplier adapter exactly once with zero Parallel operations", () => {
    const getPricing = vi.fn(mockSupplierAdapter(RENTAL_SAMPLE).getPricing);
    const run = runRentalBaseline(RENTAL_SAMPLE, "hash", "fixture", { getPricing }, now);
    expect(getPricing).toHaveBeenCalledTimes(1);
    expect(run.calls).toEqual({ search: 0, extract_urls: 0, task: 0, decisions: 0, mcp: 0 });
    expect(run.result.supplier_pricing.total_usd).toBe("150.00");
  });
  it("supplier failures return integration errors without fallback", () => {
    const getPricing = vi.fn(() => { throw new Error("supplier unavailable"); });
    const run = runRentalBaseline(RENTAL_SAMPLE, "hash", "fixture", { getPricing }, now);
    expect(getPricing).toHaveBeenCalledTimes(1);
    expect(run.status).toBe("error");
    expect(run.facts).toEqual([]);
    expect(run.calls.search + run.calls.extract_urls + run.calls.task + run.calls.mcp).toBe(0);
  });
  it("missing supplier price is an incomplete integration response, not web research", () => {
    const sample = structuredClone(RENTAL_SAMPLE);
    sample.input.supplier_fixture.daily_all_in_usd = null;
    const run = runRentalBaseline(sample, "hash", "fixture", mockSupplierAdapter(sample), now);
    expect(run.status).toBe("error");
    expect(run.result.adapter_state).toBe("incomplete");
    expect(run.calls.search).toBe(0);
    expect(run.facts).toEqual([]);
  });
  it("fixture prices and their calculations remain simulated", () => {
    const run = runFixture("UC03", RENTAL_SAMPLE, "hash", now);
    expect(run.facts).toHaveLength(2);
    expect(run.facts.map((f) => f.status)).toEqual(["simulated", "simulated"]);
    expect(run.facts[0]?.origin).toBe("simulated_fixture");
    expect(run.result.supplier_pricing.origin).toBe("simulated_fixture");
  });
  it("Live adapter is unconfigured and never uses fixture prices", () => {
    const run = runRentalBaseline(RENTAL_SAMPLE, "hash", "live", supplierAdapter, now);
    expect(run.status).toBe("error");
    expect(run.result.adapter_state).toBe("unconfigured");
    expect(run.facts).toEqual([]);
    expect(run.captured_at).toBeNull();
  });
  it("Live rejects a simulated supplier response", () => {
    const run = runRentalBaseline(RENTAL_SAMPLE, "hash", "live", mockSupplierAdapter(RENTAL_SAMPLE), now);
    expect(run.status).toBe("error");
    expect(run.facts).toEqual([]);
  });
  it("unverified supplier capabilities stay null and reservations are unchanged", () => {
    const run = runFixture("UC03", RENTAL_SAMPLE, "hash", now);
    expect(run.result.availability).toBeNull();
    expect(run.result.extension_confirmed).toBeNull();
    expect(run.result.reservation).toBeNull();
    expect(run.result.reservation_modified).toBe(false);
    expect(run.result.local_review.within_rule_limit).toBeNull();
  });
  it("exception research requires the separate explicit action", () => {
    expect(rentalExceptionEligibility("ordinary_run", "question")).toEqual({ allowed: false, reason: "A separate External exception research action is required." });
  });
  it("exception research requires a nonempty explicit question", () => {
    expect(rentalExceptionEligibility("external_exception_research", "  ")).toEqual({ allowed: false, reason: "An explicit external question is required." });
  });
  it("an entered question cannot bypass the missing validated gap", () => {
    expect(rentalExceptionEligibility("external_exception_research", "User-entered question").allowed).toBe(false);
  });
});