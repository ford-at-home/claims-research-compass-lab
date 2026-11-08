import { describe, expect, it, vi } from "vitest";
import { runBaseline, runBaselineFixture, mockBaselineAdapter } from "@/lib/claims/baseline-run";
import { FIXTURE_INPUTS } from "@/lib/claims/spec";
import { researchGate } from "@/lib/claims/baseline";
import { compareCompetitorQuotes, competitorBenchmarkContext, benchmarkPrompt } from "@/lib/claims/rental-benchmark";
import { runBenchmarkFixture } from "@/lib/claims/benchmark-fixture";
import type { CaseId } from "@/lib/claims/types";

describe("all five existing-capability-first workflows", () => {
  for (const id of ["UC01", "UC02", "UC03", "UC04", "UC05"] as CaseId[]) {
    it(`${id}: an answered baseline makes zero Parallel calls`, () => {
      const read = vi.fn(mockBaselineAdapter.read);
      const r = runBaseline(id, FIXTURE_INPUTS[id], "hash", "fixture", { read });
      expect(read).toHaveBeenCalledTimes(1);
      expect(r.calls).toEqual({ search: 0, extract_urls: 0, task: 0, decisions: 0, mcp: 0 });
      expect(researchGate(id, r, { action: id === "UC03" ? "benchmark_competitor_rates" : "research_incremental_question", question: "Routine primary question", reason: "requested_benchmark" }).allowed).toBe(false);
    });
    it(`${id}: integration error cannot trigger web substitution`, () => {
      const r = runBaseline(id, FIXTURE_INPUTS[id], "hash", "fixture", { read: () => { throw new Error("outage"); } });
      expect(r.status).toBe("error");
      expect(r.facts).toEqual([]);
      expect(r.calls.search + r.calls.extract_urls + r.calls.task + r.calls.mcp).toBe(0);
      expect(researchGate(id, r, { action: "research_incremental_question", question: "outside question", reason: "uncovered_question" }).allowed).toBe(false);
    });
  }
  it("explicit rental benchmark researches only competitors without outbound contracted pricing", () => {
    const b = runBaselineFixture("UC03", FIXTURE_INPUTS.UC03, "hash");
    expect(researchGate("UC03", b, { action: "benchmark_competitor_rates", question: "Competitor rates", reason: "requested_benchmark" }).allowed).toBe(true);
    const c = competitorBenchmarkContext(b.input, b, "Competitor rates");
    expect(c.excluded_supplier).toBe("SIMULATED integrated supplier");
    expect(JSON.stringify(c)).not.toContain("50.00");
    expect(benchmarkPrompt("Competitor rates")).toContain("DIFFERENT suppliers");
  });
  it("matched retail total excludes switching costs and mismatches remain null", () => {
    const sample = structuredClone(FIXTURE_INPUTS.UC03);
    sample.input.switching_cost_usd = "35.00";
    const b = runBaselineFixture("UC03", sample, "hash");
    const r = runBenchmarkFixture(b, "hash");
    const quotes = r.result["competitor_comparisons"];
    expect(quotes[0].total_usd).toBe("153.00");
    expect(quotes[0].delta_vs_supplier_usd).toBe("3.00");
    expect(quotes[0].separate_switching_scenario.total_including_switching_usd).toBe("188.00");
    expect(quotes[1].total_usd).toBeNull();
    expect(quotes[1].mismatches.length).toBeGreaterThan(0);
    const same = { ...quotes[0], supplier: "SIMULATED integrated supplier" };
    expect(compareCompetitorQuotes(b, [same], new Date().toISOString())[0]?.comparable).toBe(false);
    expect(compareCompetitorQuotes(b, [{ ...quotes[0], quoted_at: "2020-01-01T00:00:00Z" }], new Date().toISOString())[0]?.total_usd).toBeNull();
  });
});