# Stack adaptation (Lovable implementation)

The canonical source is user-authorized revision `2026-11-08-existing-systems-first`. Both batches replace 48 files with exact supplied UTF-8 bytes; all 48 per-file hashes pass the complete expected manifest in `SOURCE_REVISION_MANIFEST.json`. The original failed `IMPORT_MANIFEST.json` remains historical evidence; no original archive hash match is claimed. Current revision integrity is verified; the old archive mismatch is not a current UI warning. The stale `specs/UC02_rental_extensions.md` is deleted and the correct `specs/UC03_rental_extensions.md` is canonical.

The revised source contains 51 specification acceptance cases. That count is not an executed test count or proof of live acceptance. The host remains TanStack Start/React/TypeScript with Lovable Cloud, not Python/Streamlit/SQLite. Earlier scope notes below are historical and superseded by the authorized revision and existing all-five baseline-first implementation.

## Current revision reconciliation

### Explicit Live demo baseline source

Live source selection is now explicit: `demo` invokes the mock primary adapter without Parallel; `connected` retains the unconfigured actual-adapter error. Fixture remains the default. No failed integration automatically loads a mock or public substitute. Demo baseline records remain Live-mode setup records with simulated facts, null capture time, source selection, owner ID and input hash; only completed genuine external runs are replayable.

Subsequent explicit research validates owner, source, matching input hash and unanswered-question eligibility before checking the key or making calls. Mixed displays and readable exports separate simulated primary values from live web evidence and label deltas as demo arithmetic, not real savings or insurer quotes. Rental may include only an optional allowlisted public supplier exclusion name/group, never private agreement prices or terms.

UC05 demo baseline and outside steps initialize, discover and call the mock enterprise service over actual HTTP MCP. The mock route now verifies the app user's bearer through Auth rather than requiring a separate mock token. No private insurer contract or new secret is required. Parallel still uses actual MCP HTTP, not the Task API relabeled as MCP. Raw protocol behavior is exercised with mocked fetch responses in tests, not claimed as provider success. Parallel HTTP remains gateway-backed and requires the configured connection key/project token; a manually saved provider key is not claimed to have been verified as a linked connection.

- Runtime case prompts include the exact canonical prompts plus host evidence/security instructions and the reviewer's explicit question. Canonical request templates remain dormant until the existing local gate permits research; runtime replaces template placeholder questions and context, never sends the supplier rate.
- UC03 maps canonical synthetic dates/class/seating, $50 daily rate and $35 separate switching cost into the host adapter contract. The competitor fixture reads $45/day and $18 mandatory fees from the canonical storyboard. Canonical simulated availability does not establish actual adapter inventory capability; runtime availability/extension fields remain null.
- Rental provider Task output uses a host-specific `{benchmark_purpose, quotes}` schema rather than the generic findings template, to preserve exact comparison terms. `benchmark_purpose` is required and validated as `competitor_market_benchmark`, then preserved with comparisons and raw provider content/Basis. The canonical UC03 result schema also requires this purpose. Unknown/mismatched source terms remain noncomparable; same-supplier and known same-group quotes are excluded. Base benchmark totals are $150/$153, delta $3/2%; the $188 switching scenario is separate and simulated.
- Canonical `demo_run.schema.json` now correctly references `UC03_result.schema.json`. Existing UI/storage `RunRecord` is a host view model, not the canonical envelope: `status/result/provider_ids` and additional baseline, comparison and trace fields remain explicit adaptations. Existing JSON exports contain that host model; they are not claimed to validate against the canonical envelope. Per-case display models also retain richer review fields. Full canonical-envelope export/validation remains a limitation, not proof of all 51 acceptance cases passing.
- All five ordinary primary paths and integration-error paths retain zero Parallel calls. Real insurer adapters remain unconfigured. No provider smoke calls, credentials, real integrations or publishing are introduced by this revision.

| Reference choice | Lovable implementation |
| --- | --- |
| Python service | TanStack Start server functions (`src/lib/claims/research.functions.ts`) on the edge runtime |
| Streamlit UI | React + Tailwind + shadcn screens (`src/components/claims/CaseScreen.tsx`) |
| SQLite run store | Lovable Cloud table `research_runs`, row-level security scoped to the signed-in owner |
| SQLite review records | Browser-local review dispositions (`localStorage`), exported with runs |
| Python `Decimal` | `decimal.js` (`src/lib/claims/calc.ts`) |
| Background worker | Task created once, provider `run_id` persisted immediately; browser polls `resumeLiveRun`, which only reads status/result and never resubmits |
| mock-enterprise MCP over **stdio** | Same tools served over **Streamable HTTP MCP** at `/api/mock-enterprise-mcp`, protected by authenticated app bearer verification. The host reaches it through MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`), not a direct import. Edge workers cannot spawn stdio subprocesses. |
| Parallel MCP | Streamable HTTP to `https://mcp.parallel.ai/mcp` with `Authorization: Bearer` (server-side key) |

Live research functions require an authenticated session. Fixture mode runs entirely in the browser with no provider calls.
Historical import note: see `IMPORT_MANIFEST.json` — the original decompressed archive did not match its expected SHA-256. The separate revised source passes all 48 hashes.

## Historical UC03 scope correction — superseded

The insurer already has a supplier integration providing confirmed pricing. UC03 is therefore a supplier integration baseline, not an open-web price-comparison pilot. The master specification's UC03 section and related rental dispatch statements, and `specs/UC02_rental_extensions.md`, are amended with user authorization. The original import manifest and its integrity warning remain unchanged and unresolved; these intentional amendments do not resolve the original mismatch.

The executable scenario contract and sample are in `src/lib/claims/rental.ts`. Imported UC03 price-search/task templates, prompt, storyboard observations and old output schema are historical/superseded for UC03 ordinary execution, not runnable default requirements. No imported artifacts for the other four cases are changed.

- Normal dispatch: supplier adapter -> local rules and repair timing -> reviewer evidence. Zero Search, Extract, Task or MCP calls, including supplier errors and resume requests. Old rental web-comparison history is not offered as current baseline evidence.
- Only pricing capability is confirmed by the user. Inventory/availability, reservation and extension read capabilities are unverified. No write operations are implemented.
- `rental.server.ts` exposes an unconfigured real adapter; no invented URL, credential or insurer connection. Fixture uses a separately labeled simulated supplier response, $50/day for 3 days = $150. No public alternative or contract-rate comparison. Branch identity and insurer duration limits remain unknown.
- `rentalScenarioSchema` validates synthetic input, local rules, repair context and fixture response separately. Missing/invalid prices and failed responses are integration errors without fallback. Live never consumes fixture pricing.
- The separate External exception research action checks a nonempty explicit question and eligibility. No validated gap has been supplied, so it performs zero research calls even when a question is entered. Future exception support requires a demonstrated public gap and stays advisory; it cannot change pricing, coverage or reservations.
- Replay remains stored completed genuine Live results only. No simulated run or unconfigured Live error is replayable.

## Historical all-case steering — now embodied in the canonical revision

`CURRENT_SCOPE.md` records the executable host scope aligned to the verified canonical revision. The user explicitly requested competitor rental benchmarking, superseding the earlier UC03 no-identified-gap note. All five primary flows use existing adapters; research requires a separate question/action, successful owned baseline, same input hash and current scope version. Runtime scenarios add mock baseline response contracts; Live adapters are unconfigured. Competitor quotes are term-matched, retail-versus-contracted labeled, with switching scenarios separate. Added findings, redundancy and non-redundant source coverage are reported; effort is unmeasured. Original archive integrity history is preserved separately, not current runtime scope.
