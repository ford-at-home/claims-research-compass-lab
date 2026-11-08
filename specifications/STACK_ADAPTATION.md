# Stack adaptation (Lovable implementation)

The files under `parallel-claims/` are the recovered source package, except the user-authorized UC03 amendments listed below. This note records how the reference design was adapted.

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

## Authorized UC03 scope correction — November 8, 2026

The insurer already has a supplier integration providing confirmed pricing. UC03 is therefore a supplier integration baseline, not an open-web price-comparison pilot. The master specification's UC03 section and related rental dispatch statements, and `specs/UC02_rental_extensions.md`, are amended with user authorization. The original import manifest and its integrity warning remain unchanged and unresolved; these intentional amendments do not resolve the original mismatch.

The executable scenario contract and sample are in `src/lib/claims/rental.ts`. Imported UC03 price-search/task templates, prompt, storyboard observations and old output schema are historical/superseded for UC03 ordinary execution, not runnable default requirements. No imported artifacts for the other four cases are changed.

- Normal dispatch: supplier adapter -> local rules and repair timing -> reviewer evidence. Zero Search, Extract, Task or MCP calls, including supplier errors and resume requests. Old rental web-comparison history is not offered as current baseline evidence.
- Only pricing capability is confirmed by the user. Inventory/availability, reservation and extension read capabilities are unverified. No write operations are implemented.
- `rental.server.ts` exposes an unconfigured real adapter; no invented URL, credential or insurer connection. Fixture uses a separately labeled simulated supplier response, $50/day for 3 days = $150. No public alternative or contract-rate comparison. Branch identity and insurer duration limits remain unknown.
- `rentalScenarioSchema` validates synthetic input, local rules, repair context and fixture response separately. Missing/invalid prices and failed responses are integration errors without fallback. Live never consumes fixture pricing.
- The separate External exception research action checks a nonempty explicit question and eligibility. No validated gap has been supplied, so it performs zero research calls even when a question is entered. Future exception support requires a demonstrated public gap and stays advisory; it cannot change pricing, coverage or reservations.
- Replay remains stored completed genuine Live results only. No simulated run or unconfigured Live error is replayable.

## Superseding all-case steering — November 8, 2026

`CURRENT_SCOPE.md` is the current executable scope overlay pending the promised revised canonical package. It supersedes the earlier UC03 no-identified-gap note: the user explicitly requested competitor rental benchmarking. All five primary flows now use existing adapters; research requires a separate question/action, successful owned baseline, same input hash and current scope version. Runtime scenarios add mock baseline response contracts; Live adapters are unconfigured. Dedicated question-led prompts replace routine research prompts at dispatch. Competitor quotes are term-matched, retail-versus-contracted labeled, with switching scenarios separate. Added findings, redundancy and non-redundant source coverage are reported; effort is unmeasured. Original imported artifacts and integrity warning remain as historical material, not current runtime scope.
