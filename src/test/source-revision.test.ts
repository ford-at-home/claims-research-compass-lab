import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "../../specifications/SOURCE_REVISION_MANIFEST.json";
import { ACCEPTANCE, FIXTURE_INPUTS, SPEC_REVISION } from "@/lib/claims/spec";
import { competitorTaskJsonSchema, competitorTaskOutputSchema, compareCompetitorQuotes } from "@/lib/claims/rental-benchmark";
import { runBaselineFixture } from "@/lib/claims/baseline-run";
import { runBenchmarkFixture } from "@/lib/claims/benchmark-fixture";
import { incrementalPrompt } from "@/lib/claims/incremental";
import { researchGate } from "@/lib/claims/baseline";

describe("authorized canonical source revision", () => {
  it("all 48 actual source byte hashes match the supplied complete manifest", () => {
    expect(manifest.files).toHaveLength(48);
    const root = resolve("specifications/parallel-claims");
    for (const f of manifest.files) expect(createHash("sha256").update(readFileSync(resolve(root, f.path))).digest("hex")).toBe(f.expected_sha256);
    expect(readdirSync(root, { recursive: true }).filter((p) => typeof p === "string" && existsSync(resolve(root, p)) && manifest.files.some((f) => f.path === p)).length).toBe(48);
    expect(existsSync(resolve(root, "specs/UC02_rental_extensions.md"))).toBe(false);
  });
  it("51 specification acceptance cases are unique and use the authorized revision", () => {
    expect(SPEC_REVISION).toBe("2026-11-08-existing-systems-first");
    expect(ACCEPTANCE).toHaveLength(51);
    expect(new Set(ACCEPTANCE.map((c) => c.id)).size).toBe(51);
  });
  it("rental Task output requires the explicit canonical benchmark purpose", () => {
    expect(competitorTaskJsonSchema.required).toContain("benchmark_purpose");
    expect(competitorTaskOutputSchema.safeParse({ quotes: [] }).success).toBe(false);
    expect(competitorTaskOutputSchema.safeParse({ benchmark_purpose: "supplier_pricing", quotes: [] }).success).toBe(false);
    expect(competitorTaskOutputSchema.parse({ benchmark_purpose: "competitor_market_benchmark", quotes: [] }).benchmark_purpose).toBe("competitor_market_benchmark");
  });
  it("canonical fixture components yield 150, 153, 3, 2 percent and separate 188", () => {
    const b = runBaselineFixture("UC03", FIXTURE_INPUTS.UC03, "h");
    const r = runBenchmarkFixture(b, "h");
    const q = r.result["competitor_comparisons"][0];
    expect(b.result["supplier_pricing"].total_usd).toBe("150.00");
    expect(q.total_usd).toBe("153.00");
    expect(q.delta_vs_supplier_usd).toBe("3.00");
    expect(q.delta_vs_supplier_percent).toBe("2.00");
    expect(q.separate_switching_scenario.total_including_switching_usd).toBe("188.00");
    expect(r.result["benchmark_purpose"]).toBe("competitor_market_benchmark");
    expect(q.baseline_rate_basis).toBe("simulated_supplier_agreement");
    expect(q.rate_basis).toBe("simulated_public_retail");
    expect(researchGate("UC03", b, { benchmark_purpose: "competitor_market_benchmark" }).allowed).toBe(false);
  });
  it("known same-group competitors cannot become comparable quotes", () => {
    const b = runBaselineFixture("UC03", FIXTURE_INPUTS.UC03, "h");
    const q = runBenchmarkFixture(b, "h").result["competitor_comparisons"][0];
    b.input = structuredClone(b.input);
    b.input.input.supplier_fixture.excluded_supplier_groups = [q.supplier];
    expect(compareCompetitorQuotes(b, [q], q.quoted_at)[0]?.total_usd).toBeNull();
  });
  it("runtime prompts include the exact canonical case prompt", () => {
    for (const [id, name] of Object.entries({ UC01: "salvage_valuation", UC02: "damage_estimates", UC03: "rental_extensions", UC04: "loss_verification", UC05: "war_room_research" })) {
      const prompt = readFileSync(`specifications/parallel-claims/prompts/${id}_${name}.txt`, "utf8");
      expect(incrementalPrompt(id as "UC01", "specific question").includes(prompt)).toBe(true);
    }
  });
});