import { lossWindowUtc, resolveRentalWindow } from "./calc";
import type { CaseId } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PublicContextResult =
  | { ok: true; context: Record<string, unknown>; dropped: string[] }
  | { ok: false; reason: string };

/**
 * Builds the allowlisted outbound context. Internal prices, mock enterprise
 * records, fabricated shop names, private notes and canaries stay local.
 */
export function buildPublicContext(caseId: CaseId, wrapper: any, runDate = new Date(), opts: { precisePoint?: boolean } = {}): PublicContextResult {
  const input = wrapper?.input ?? {};
  switch (caseId) {
    case "UC01": {
      const { vehicle, location, damage, valuation_mode, valuation_date } = input;
      if (!vehicle?.make || !vehicle?.model || !vehicle?.year) return { ok: false, reason: "Vehicle year, make and model are required" };
      return { ok: true, context: { vehicle, location, damage, valuation_mode, valuation_date: valuation_date ?? null }, dropped: ["fees (mock_enterprise)"] };
    }
    case "UC02": {
      const lines = (input.lines ?? []).map((l: any) => ({
        id: l.id,
        description: l.description,
        part_number: l.part_number ?? null,
        condition: l.condition ?? null,
        quantity: l.quantity ?? null,
      }));
      return {
        ok: true,
        context: { vehicle: input.vehicle, location: { zip: input.shop?.zip, state: input.shop?.state }, lines, required_fitment_options: input.required_fitment_options ?? [] },
        dropped: ["shop name (fabricated mock_enterprise)", "estimate prices", "labor rate", "estimate_version"],
      };
    }
    case "UC03": {
      const tz = input.location?.timezone;
      if (!tz || typeof input.pickup_offset_days !== "number" || typeof input.requested_days !== "number")
        return { ok: false, reason: "Unresolved rental dates: timezone, pickup_offset_days and requested_days are required before any quote request" };
      let w;
      try {
        w = resolveRentalWindow(runDate, tz, input.pickup_offset_days, input.requested_days);
      } catch {
        return { ok: false, reason: `Cannot resolve dates in timezone ${tz}` };
      }
      return {
        ok: true,
        context: { location: { zip: input.location.zip, state: input.location.state, timezone: tz }, pickup_at: w.pickup_at, return_at: w.return_at, requested_days: input.requested_days, vehicle_class: input.vehicle_class, seats_needed: input.seats_needed },
        dropped: ["repair_status (mock_enterprise)", "existing_extension (mock_enterprise)", "transfer_cost_usd"],
      };
    }
    case "UC04": {
      const w = lossWindowUtc(input.reported_local_time, input.timezone, Number(input.window_minutes ?? 0));
      if (!w.ok) return { ok: false, reason: w.reason };
      const loc: Record<string, unknown> = { zip: input.location?.zip, state: input.location?.state };
      if (opts.precisePoint) {
        loc["latitude"] = input.location?.latitude ?? null;
        loc["longitude"] = input.location?.longitude ?? null;
      }
      return {
        ok: true,
        context: { peril: input.peril, loss_window_utc: { start: w.start, end: w.end }, timezone: input.timezone, location: loc, radius_km: input.radius_km, question: input.question },
        dropped: opts.precisePoint ? [] : ["precise coordinates (ZIP and state sent by default)"],
      };
    }
    case "UC05": {
      return {
        ok: true,
        context: { question: input.question, public_vehicle: input.public_vehicle, region: input.region },
        dropped: ["internal_context (delayed_cases, reported_delay_days, private_canary)"],
      };
    }
  }
}

export function searchQueries(caseId: CaseId, ctx: any): string[] {
  const v = ctx.vehicle ?? ctx.public_vehicle;
  const veh = v ? `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}` : "";
  switch (caseId) {
    case "UC01":
      return [`${veh} used for sale`, `${veh} ${ctx.damage?.area ?? ""} damage salvage auction`.replace(/\s+/g, " "), `${v.year} ${v.make} ${v.model} recalls`];
    case "UC02":
      return [...(ctx.lines ?? []).filter((l: any) => l.condition).map((l: any) => `${veh} ${l.description} ${l.condition}`), `body labor rate ${ctx.location?.state ?? ""}`].slice(0, 3);
    case "UC03":
      return [`${ctx.vehicle_class} car rental ${ctx.location?.zip} ${ctx.location?.state}`, `car rental branch ${ctx.location?.zip} fees`];
    case "UC04":
      return [`${ctx.peril} ${ctx.location?.zip} ${ctx.location?.state} ${String(ctx.loss_window_utc?.start ?? "").slice(0, 10)}`, `NWS storm reports ${ctx.peril} ${ctx.location?.state} ${String(ctx.loss_window_utc?.start ?? "").slice(0, 10)}`];
    case "UC05":
      return [`${veh} manufacturer repair notices`, `${veh} official repair guidance parts`];
  }
}
