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

describe("UC03 server dispatch", () => {
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