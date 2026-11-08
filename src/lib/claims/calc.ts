import Decimal from "decimal.js";

/** Decimal-safe helpers. Any unknown (null) required component yields null. */
export function dec(v: string | null | undefined): Decimal | null {
  if (v === null || v === undefined || v === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(String(v).trim())) return null;
  return new Decimal(String(v).trim());
}

export function fmt(d: Decimal | null): string | null {
  return d === null ? null : d.toFixed(2);
}

export function sum(parts: (string | null)[]): string | null {
  let acc = new Decimal(0);
  for (const p of parts) {
    const d = dec(p);
    if (d === null) return null;
    acc = acc.plus(d);
  }
  return acc.toFixed(2);
}

export function minus(gross: string | null, deductions: (string | null)[]): string | null {
  const g = dec(gross);
  const ded = sum(deductions);
  if (g === null || ded === null) return null;
  return g.minus(ded).toFixed(2);
}

export function times(a: string | null, n: number | string | null): string | null {
  const d = dec(a);
  const m = n === null ? null : dec(String(n));
  if (d === null || m === null) return null;
  return d.times(m).toFixed(2);
}

/** Haversine distance in km, decimal string with 2 dp; null when any coordinate unknown. */
export function distanceKm(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null,
): string | null {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined || Number.isNaN(v))) return null;
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2! - lat1!);
  const dLon = rad(lon2! - lon1!);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1!)) * Math.cos(rad(lat2!)) * Math.sin(dLon / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a));
  return new Decimal(km).toFixed(2);
}

/** Offset in minutes of a timezone at a given instant (e.g. -300 for CDT). */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

export function parseOffset(iso: string): number | null {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!m) return /Z$/.test(iso) ? 0 : null;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** UC04: convert local time + window to UTC; reject if the supplied offset disagrees with the timezone. */
export function lossWindowUtc(reportedLocal: string, timeZone: string, windowMinutes: number) {
  const t = new Date(reportedLocal);
  if (Number.isNaN(t.getTime())) return { ok: false as const, reason: "Unparseable reported_local_time" };
  const supplied = parseOffset(reportedLocal);
  let zoneOffset: number;
  try {
    zoneOffset = tzOffsetMinutes(timeZone, t);
  } catch {
    return { ok: false as const, reason: `Unknown timezone ${timeZone}` };
  }
  if (supplied === null) return { ok: false as const, reason: "Reported time has no UTC offset" };
  if (supplied !== zoneOffset)
    return { ok: false as const, reason: `UTC offset ${supplied} min disagrees with ${timeZone} (${zoneOffset} min)` };
  const start = new Date(t.getTime() - windowMinutes * 60000).toISOString().replace(".000", "");
  const end = new Date(t.getTime() + windowMinutes * 60000).toISOString().replace(".000", "");
  return { ok: true as const, start, end, center: t.toISOString().replace(".000", "") };
}

export function overlaps(eventIso: string | null, start: string, end: string): "overlap" | "no_overlap" | "unknown" {
  if (!eventIso) return "unknown";
  const e = new Date(eventIso).getTime();
  if (Number.isNaN(e)) return "unknown";
  return e >= new Date(start).getTime() && e <= new Date(end).getTime() ? "overlap" : "no_overlap";
}

/** UC03: resolve pickup_offset_days against run date in timezone. Pickup 10:00 local. */
export function resolveRentalWindow(runDate: Date, timeZone: string, offsetDays: number, days: number) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(runDate);
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const mk = (addDays: number) => {
    const guess = new Date(Date.UTC(y, m - 1, d + addDays, 10, 0, 0));
    const off = tzOffsetMinutes(timeZone, guess);
    const inst = new Date(guess.getTime() - off * 60000);
    const sign = off < 0 ? "-" : "+";
    const a = Math.abs(off);
    const local = new Date(Date.UTC(y, m - 1, d + addDays, 10, 0, 0)).toISOString().slice(0, 19);
    return { local: `${local}${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`, utc: inst.toISOString() };
  };
  const p = mk(offsetDays);
  const r = mk(offsetDays + days);
  return { pickup_at: p.local, return_at: r.local, pickup_utc: p.utc, return_utc: r.utc, timezone: timeZone };
}
