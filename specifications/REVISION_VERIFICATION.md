# Source revision verification

Revision: `2026-11-08-existing-systems-first`.

- Both supplied batches imported: 30 + 18 = 48 exact UTF-8 source files.
- Final actual-byte SHA-256 verification against the complete supplied manifest: **48 pass, 0 fail**. Individual content hashes also match. All source JSON parses.
- Exactly 48 files remain under `parallel-claims/`; stale `specs/UC02_rental_extensions.md` removed. Correct `specs/UC03_rental_extensions.md` and UC03 envelope schema reference installed.
- `SOURCE_REVISION_MANIFEST.json` records each expected/actual hash. Historical `IMPORT_MANIFEST.json` remains unchanged; its original archive mismatch is not resolved or claimed matched. No current source-import warning was found in app code; none was removed before verification.
- **51 specification acceptance cases** are present and unique. This is not an executed acceptance or live-test count.
- **54 automated tests passed across six files**: source verification, fixture arithmetic/provenance/nulls, all-five baseline gating, integration errors, rental adapter/competitor dispatch, source-term mismatches, same-group exclusion, purpose requirements and page routing. Dispatch tests mock provider responses; they are not live success evidence.
- Browser verification: all five baseline runs, answered-question gates and explicit simulated outside actions passed; UC03 shows $153 base cost/$3 delta and separate $188 switching scenario, with incomplete quotes unknown. Mobile had no horizontal overflow. No page errors were observed. Automatic preview build reported `build OK`; no manual build/typecheck was run.

## Remaining limitations

Real insurer adapters are unconfigured; only pricing capability of the existing rental integration is confirmed. No real supplier data, competitor quote, Parallel or two-server MCP success was verified. Authenticated live smoke testing was not performed. Reviewer effort and business benefit remain unmeasured. Existing host view-model exports are richer than the canonical envelope and are not claimed to validate against it; see `STACK_ADAPTATION.md`. No credentials were requested and no publication occurred.