const SENSITIVE_KEYS = /^(x-api-key|authorization|api[_-]?key|token|secret|password|cookie|mcp_token|x-mock-enterprise-token)$/i;

/** Deep-redacts sensitive keys and any literal secret values supplied. */
export function redact<T>(value: T, secrets: (string | undefined | null)[] = []): T {
  const lits = secrets.filter((s): s is string => typeof s === "string" && s.length >= 6);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let s = v;
      for (const l of lits) s = s.split(l).join("[REDACTED]");
      return s.replace(/Bearer\s+[A-Za-z0-9._\-]{8,}/g, "Bearer [REDACTED]");
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) o[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : walk(val);
      return o;
    }
    return v;
  };
  return walk(value) as T;
}

export const PRIVATE_CANARY = "MOCK_INTERNAL_ONLY_9F";

export function containsCanary(v: unknown): boolean {
  return JSON.stringify(v ?? null).includes(PRIVATE_CANARY);
}
