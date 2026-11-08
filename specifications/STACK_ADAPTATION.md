# Stack adaptation (Lovable implementation)

The files under `parallel-claims/` are the unchanged source package. This note records how the reference design was adapted.

| Reference choice | Lovable implementation |
| --- | --- |
| Python service | TanStack Start server functions (`src/lib/claims/research.functions.ts`) on the edge runtime |
| Streamlit UI | React + Tailwind + shadcn screens (`src/components/claims/CaseScreen.tsx`) |
| SQLite run store | Lovable Cloud table `research_runs`, row-level security scoped to the signed-in owner |
| SQLite review records | Browser-local review dispositions (`localStorage`), exported with runs |
| Python `Decimal` | `decimal.js` (`src/lib/claims/calc.ts`) |
| Background worker | Task created once, provider `run_id` persisted immediately; browser polls `resumeLiveRun`, which only reads status/result and never resubmits |
| mock-enterprise MCP over **stdio** | Same tools served over **Streamable HTTP MCP** at `/api/mock-enterprise-mcp`, guarded by a server-only token. The host reaches it through MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`), not a direct import. Edge workers cannot spawn stdio subprocesses. |
| Parallel MCP | Streamable HTTP to `https://mcp.parallel.ai/mcp` with `Authorization: Bearer` (server-side key) |

Live research functions require an authenticated session. Fixture mode runs entirely in the browser with no provider calls.
Import note: see `IMPORT_MANIFEST.json` — the decompressed archive did not match the expected SHA-256.
