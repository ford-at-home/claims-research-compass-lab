// Server-only Parallel HTTP client. The API key is read per call and never returned or logged.
import { LIMITS } from "./spec";

export const PARALLEL_BASE = "https://connector-gateway.lovable.dev/parallel";

export class ParallelError extends Error {
  constructor(
    public kind: "config" | "auth" | "credit_or_access" | "schema" | "rate_limit" | "transient" | "submission_unknown" | "other",
    public httpStatus: number | null,
    message: string,
  ) {
    super(message);
  }
}

export function getKey(): string {
  const k = process.env["PARALLEL_API_KEY"];
  if (!k) throw new ParallelError("config", null, "Server configuration error: PARALLEL_API_KEY is not set in the server environment. Live research is unavailable; mode was not changed.");
  return k;
}

function classify(status: number, body: string): ParallelError {
  const snippet = body.slice(0, 400);
  if (status === 401) return new ParallelError("auth", status, "Authentication failed (401). Check the server PARALLEL_API_KEY.");
  if (status === 402 || status === 403) return new ParallelError("credit_or_access", status, `Credit or access failure (${status}): ${snippet}`);
  if (status === 422 || status === 400) return new ParallelError("schema", status, `Schema/input error (${status}): ${snippet}`);
  if (status === 429) return new ParallelError("rate_limit", status, `Rate limited (429): ${snippet}`);
  if (status >= 500) return new ParallelError("transient", status, `Provider error (${status}): ${snippet}`);
  return new ParallelError("other", status, `Unexpected response (${status}): ${snippet}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Idempotent POST/GET reads (search, extract, status, result) get bounded retries. */
export async function parallelRequest<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  opts: { idempotent: boolean; retries?: { count: number }; timeoutMs?: number },
): Promise<T> {
  const key = getKey();
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new ParallelError("config", null, "Parallel connection configuration is unavailable. No provider substitution.");
  const maxAttempts = opts.idempotent ? 1 + LIMITS.maxReadRetries : 1;
  let lastErr: ParallelError | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0 && opts.retries) opts.retries.count++;
    let res: Response;
    try {
      res = await fetch(`${PARALLEL_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key, "content-type": "application/json" },
        body: method === "POST" ? JSON.stringify(body) : null,
        signal: AbortSignal.timeout(opts.timeoutMs ?? (path === '/v1/responses' ? 120_000 : LIMITS.httpTimeoutMs)),
      });
    } catch (e) {
      if (!opts.idempotent) throw new ParallelError("submission_unknown", null, "Response lost after submission (network/timeout). Recorded as submission_unknown; not resubmitted automatically.");
      lastErr = new ParallelError("transient", null, `Network/timeout: ${(e as Error).name}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ParallelError("other", res.status, "Provider returned non-JSON");
      }
    }
    const err = classify(res.status, text);
    if (opts.idempotent && (res.status === 429 || res.status >= 500)) {
      lastErr = err;
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1500 * (attempt + 1), 8000));
      continue;
    }
    throw err;
  }
  throw lastErr ?? new ParallelError("other", null, "Request failed");
}
