import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/claims/parallel.server", () => ({ getKey: vi.fn(() => { throw new Error("Parallel must not be reached"); }), parallelRequest: vi.fn(), ParallelError: class extends Error {} }));
import { startLiveRun, resumeLiveRun } from "@/lib/claims/research.functions";
import { getKey, parallelRequest } from "@/lib/claims/parallel.server";
import { RENTAL_SAMPLE } from "@/lib/claims/rental";
import { supplierAdapter } from "@/lib/claims/rental.server";
import { liveBaselineAdapter } from "@/lib/claims/baseline.server";
import { runBaselineFixture } from "@/lib/claims/baseline-run";
import { FIXTURE_INPUTS } from "@/lib/claims/spec";
import { inputHash } from "@/lib/claims/hash";

describe("UC03 server dispatch", () => {
  it("explicit competitor dispatch sends only outside competitor research and persists a single Task", async () => {
    const input = FIXTURE_INPUTS.UC03;
    const baseline = runBaselineFixture("UC03", input, await inputHash(input));
    const key = vi.mocked(getKey).mockReturnValue("test-only-key");
    const request = vi.mocked(parallelRequest).mockImplementation(async (_method, path) => path === "/v1/search" ? { results: [] } : { run_id: "competitor-task" });
    const from = () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { result: baseline }, error: null }) }) }), insert: () => ({ select: () => ({ single: async () => ({ data: { id: "stored-benchmark" }, error: null }) }) }), update: () => ({ eq: async () => ({ error: null }) }) });
    const handler = startLiveRun as unknown as (args: unknown) => Promise<{ provider_ids: Record<string, string> }>;
    const r = await handler({ data: { caseId: "UC03", input, baselineId: "baseline-id", intent: { action: "benchmark_competitor_rates", question: "Competitor prices same area", reason: "requested_benchmark" } }, context: { userId: "owner", supabase: { from } } });
    const calls = request.mock.calls;
    expect(calls.map((c) => c[1])).toEqual(["/v1/search", "/v1/tasks/runs"]);
    expect(JSON.stringify(calls)).not.toContain("50.00");
    expect(JSON.stringify(calls)).toContain("DIFFERENT suppliers");
    const task = calls.find((c) => c[1] === "/v1/tasks/runs")?.[2] as { task_spec: { output_schema: { json_schema: { required: string[]; properties: { benchmark_purpose: { enum: string[] } } } } }; input: { public_case_context: { benchmark_purpose: string }; research_scope: { specific_question: string } } };
    expect(task.task_spec.output_schema.json_schema.required).toContain("benchmark_purpose");
    expect(task.task_spec.output_schema.json_schema.properties.benchmark_purpose.enum).toEqual(["competitor_market_benchmark"]);
    expect(task.input.public_case_context.benchmark_purpose).toBe("competitor_market_benchmark");
    expect(task.input.research_scope.specific_question).toBe("Competitor prices same area");
    expect(r.provider_ids["task_run_id"]).toBe("competitor-task");
    key.mockReset(); key.mockImplementation(() => { throw new Error("Parallel must not be reached"); }); request.mockReset();
  });
  for (const caseId of ["UC01", "UC02", "UC04", "UC05"]) it(`${caseId} primary server dispatch never reaches Parallel`, async () => {
    const read = vi.spyOn(liveBaselineAdapter, "read");
    const context = { userId: "owner", supabase: { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: "baseline" }, error: null }) }) }) }) } };
    const handler = startLiveRun as unknown as (args: unknown) => Promise<{ status: string }>;
    const r = await handler({ data: { caseId, input: {} }, context });
    expect(read).toHaveBeenCalledTimes(1);
    expect(r.status).toBe("error");
    expect(parallelRequest).not.toHaveBeenCalled();
    expect(getKey).not.toHaveBeenCalled();
    read.mockRestore();
  });
  it("dispatches to the Live supplier adapter before any Parallel key check or call", async () => {
    const supplier = vi.spyOn(supplierAdapter, "getPricing");
    const single = vi.fn(async () => ({ data: { id: "stored-rental" }, error: null }));
    const context = { userId: "owner", supabase: { from: () => ({ insert: () => ({ select: () => ({ single }) }) }) } };
    const handler = startLiveRun as unknown as (args: unknown) => Promise<{ status: string; result: { adapter_state: string } }>;
    const run = await handler({ data: { caseId: "UC03", input: RENTAL_SAMPLE }, context });
    expect(supplier).toHaveBeenCalledTimes(1);
    expect(getKey).not.toHaveBeenCalled();
    expect(parallelRequest).not.toHaveBeenCalled();
    expect(run.status).toBe("error");
    expect(run.result.adapter_state).toBe("unconfigured");
    expect(single).toHaveBeenCalledTimes(1);
    supplier.mockRestore();
  });
  it("cannot resume an old rental task through Parallel", async () => {
    const old = { case_id: "UC03", status: "running", provider_ids: { task_run_id: "old-task" } };
    const context = { supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { result: old }, error: null }) }) }) }) } };
    const handler = resumeLiveRun as unknown as (args: unknown) => Promise<unknown>;
    expect(await handler({ data: { dbId: "old-record" }, context })).toEqual(old);
    expect(parallelRequest).not.toHaveBeenCalled();
  });
});