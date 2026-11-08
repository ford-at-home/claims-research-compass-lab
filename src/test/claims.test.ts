import { describe, expect, it } from "vitest";
import { runFixture } from "@/lib/claims/fixtures";
import { FIXTURE_INPUTS } from "@/lib/claims/spec";
import { buildPublicContext } from "@/lib/claims/public-context";
import { containsCanary, redact } from "@/lib/claims/redact";
import { lossWindowUtc, minus, sum } from "@/lib/claims/calc";
import { normalizeTaskOutput } from "@/lib/claims/normalize";
import { canonical } from "@/lib/claims/hash";

const num = (r: ReturnType<typeof runFixture>, id: string) => r.facts.find((f) => f.fact_id === id)?.number_decimal;

describe("UC01 salvage fixture", () => {
  const r = runFixture("UC01", FIXTURE_INPUTS.UC01, "h");
  it("net example is 2450 - 220 - 140 = 2090.00", () => expect(num(r, "calc-net-recovery")).toBe("2090.00"));
  it("active bid excluded from completed sales", () =>
    expect((r.result["excluded_candidates"] as { entity_id: string }[]).map((c) => c.entity_id)).toEqual(["auction-B"]));
  it("no settlement value", () => expect(r.result["settlement_value"]).toBeNull());
  it("fixture mode makes zero provider calls and labels simulated", () => {
    expect(r.calls).toEqual({ search: 0, extract_urls: 0, task: 0, decisions: 0, mcp: 0 });
    expect(r.facts.filter((f) => f.origin === "simulated_fixture").every((f) => f.status === "simulated")).toBe(true);
    expect(r.trace.every((t) => t.transport === "simulated")).toBe(true);
  });
});

describe("UC02 damage fixture", () => {
  const r = runFixture("UC02", FIXTURE_INPUTS.UC02, "h");
  it("comparable total 420.00 and delta 0.00", () => {
    expect(num(r, "calc-comparable-total")).toBe("420.00");
    expect(num(r, "calc-delta")).toBe("0.00");
  });
  it("aftermarket and unavailable OEM excluded; labor insufficient", () => {
    const ms = r.result["match_status"] as { candidate_id: string; status: string }[];
    expect(ms.find((m) => m.candidate_id === "aftermarket-B")?.status).toBe("mismatch");
    expect(ms.find((m) => m.candidate_id === "OEM-C")?.status).toBe("insufficient_evidence");
    expect((r.result["labor_checks"] as { labor_rate_status: string }[])[0]?.labor_rate_status).toBe("insufficient_evidence");
  });
});

describe("UC03 rental fixture", () => {
  const r = runFixture("UC03", FIXTURE_INPUTS.UC03, "h", "2026-11-08T04:43:00Z");
  it("supplier scenario totals 150.00 with no public comparison", () => {
    expect(num(r, "calc-supplier-total")).toBe("150.00");
    expect(r.result["alternative_quotes"]).toBeUndefined();
    expect(r.result["availability"]).toBeNull();
    expect(r.result["extension_confirmed"]).toBeNull();
  });
  it("resolves explicit dates in timezone (run date Nov 7 local, +1 day)", () => {
    const w = r.result["resolved_window"] as { pickup_at: string; return_at: string };
    expect(w.pickup_at).toBe("2026-11-08T10:00:00-05:00");
    expect(w.return_at).toBe("2026-11-11T10:00:00-05:00");
  });
  it("unresolved dates block outbound context", () => {
    const bad = { input: { ...FIXTURE_INPUTS.UC03.input, pickup_offset_days: null } };
    expect(buildPublicContext("UC03", bad).ok).toBe(false);
  });
  it("incomplete totals stay null", () => expect(sum(["45.00", null])).toBeNull());
});

describe("UC04 loss fixture", () => {
  const r = runFixture("UC04", FIXTURE_INPUTS.UC04, "h");
  it("0.00 km, overlap, corroborating, warning not an observation", () => {
    expect(num(r, "calc-report-A-distance")).toBe("0.00");
    expect((r.result["temporal_matches"] as { status: string }[])[0]?.status).toBe("overlap");
    expect(r.result["assessment"]).toBe("corroborating");
    expect(r.result["warning_is_observation"]).toBe(false);
    expect(r.result["vehicle_damage_proven"]).toBe(false);
  });
  it("UTC window and offset/timezone agreement", () => {
    const w = lossWindowUtc("2024-05-26T18:30:00-05:00", "America/Chicago", 90);
    expect(w).toMatchObject({ ok: true, start: "2024-05-26T22:00:00Z", end: "2024-05-27T01:00:00Z" });
    expect(lossWindowUtc("2024-05-26T18:30:00-06:00", "America/Chicago", 90).ok).toBe(false);
  });
  it("ZIP-only by default; no coordinates sent", () => {
    const c = buildPublicContext("UC04", FIXTURE_INPUTS.UC04);
    expect(c.ok && JSON.stringify(c.context).includes("latitude")).toBe(false);
  });
});

describe("UC05 war room", () => {
  it("canary never in outbound context; only question/public_vehicle/region", () => {
    const c = buildPublicContext("UC05", FIXTURE_INPUTS.UC05);
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(Object.keys(c.context).sort()).toEqual(["public_vehicle", "question", "region"]);
      expect(containsCanary(c.context)).toBe(false);
    }
    expect(containsCanary(FIXTURE_INPUTS.UC05)).toBe(true);
    const r = runFixture("UC05", FIXTURE_INPUTS.UC05, "h");
    expect(r.result["private_canary_outbound"]).toBe(false);
    expect(r.result["delay_causation"]).toBe("not_established");
  });
});

describe("secret redaction", () => {
  it("removes headers, bearer values and literal secrets", () => {
    const secret = "sk_live_ABCDEFGH123456";
    const out = JSON.stringify(redact({ headers: { "x-api-key": secret, Authorization: `Bearer ${secret}` }, body: `echo ${secret}`, note: `Bearer ${secret}` }, [secret]));
    expect(out).not.toContain(secret);
    expect(out).not.toContain("ABCDEFGH");
  });
});

describe("schema mapping and null handling", () => {
  it("maps findings.N to facts with basis paths; unknown stays null", () => {
    const facts = normalizeTaskOutput(
      {
        content: {
          summary: "s",
          gaps: ["g"],
          findings: [
            { finding_id: "a", entity_id: "e", attribute: "price", value_text: "$1,200", number_decimal: "1200.00", unit: "USD", currency: "USD", evidence_type: "asking_price", effective_at: null, published_at: null, source_observed_at: null, qualifiers: [], citations: [{ url: "https://x.example/a", excerpt: "Price $1,200" }], research_status: "candidate", notes: "" },
            { finding_id: "b", entity_id: "e", attribute: "sale", value_text: null, number_decimal: "12,00", unit: null, currency: null, evidence_type: "completed_sale", effective_at: null, published_at: null, source_observed_at: null, qualifiers: [], citations: [], research_status: "insufficient", notes: "" },
          ],
        },
        basis: [{ field: "findings.0", confidence: "high", citations: [] }],
      },
      "2026-01-01T00:00:00Z",
    );
    expect(facts[0]?.provider_basis_paths).toEqual(["findings.0"]);
    expect(facts[0]?.vendor_confidence).toBe("high");
    expect(facts[0]?.origin).toBe("live_web");
    expect(facts[1]?.number_decimal).toBeNull(); // invalid decimal rejected
    expect(facts[1]?.source_observed_at).toBeNull();
    expect(facts[1]?.status).toBe("insufficient"); // no citation → non-actionable
  });
  it("arithmetic is decimal-safe", () => expect(minus("0.30", ["0.10", "0.10"])).toBe("0.10"));
  it("hash input is canonical", () => expect(canonical({ b: 1, a: [2] })).toBe('{"a":[2],"b":1}'));
});
