# Scope correction on November 8 2026

The user confirmed an existing rental supplier integration and requested competitor rate comparison, then required the same baseline-first logic for all use cases.

Existing systems provide the routine answer. Parallel researches a precise unanswered external question or an explicitly requested independent benchmark. If the primary response answers it, make zero Parallel calls. An integration failure is not a web fallback trigger.

UC03 reads the existing supplier quote and separately benchmarks different suppliers in the same area for matched dates, class, length and required fee context. Keep public retail and integrated supplier rate bases explicit. Keep transfer costs in a separate scenario. Do not invent unavailable competitor quotes or confirmed inventory.

Other candidate research gaps must be checked against actual existing coverage. Vendor names, detailed insurer interfaces, missing capabilities and savings are not asserted. The demonstration uses explicitly simulated primary adapters until real contracts are provided.


# Generic Parallel Web Systems Claims Engineering Use Cases

[Inference] Proposed implementation specifications for five generic demonstrations.

Start with `Generic_Parallel_Web_Systems_Claims_Engineering_Use_Cases.md` or the Word document. This package is an engineering handoff, not a running application or a record of live API calls.

## Demos

1. UC01 Salvage valuation
2. UC02 Damage estimate verification
3. UC03 Rental competitor rate benchmark
4. UC04 Loss verification
5. UC05 War room research with MCP

## Environment contract

Assume `PARALLEL_API_KEY` is supplied to the server environment. Do not ask for a browser key field or embed the secret. No second model provider key is required by the proposed design: Parallel Task and MCP research perform synthesis. The enterprise MCP server uses mock data.

`environment.env.example` contains names and proposed execution defaults. It contains no key. Read the server environment directly; do not log it.

## Modes

- Fixture makes no provider calls and labels every fabricated observation.
- Live calls Parallel and preserves source evidence; failures remain visible.
- Replay requires a genuine previously captured live response and its original times.

No mode switches automatically. The five `*.input.json` files are hypothetical claim inputs, not real claims. `offline_storyboards.json` contains invented source observations with fixture references and no public citation URLs.

## Implementation details

`requests/UC*_task.template.json` bodies contain the complete provider output schema. Populate runtime dates and retrieved excerpts before submission. UC03 null dates block submission. UC05 Task is an optional comparison route; the required war room demo uses two actual MCP connections.

The seed damage estimate has no exact part number. Live candidate identification can return unresolved fitment. Select a real public shop before a live shop identity check; the seed shop name is fabricated. Salvage sold data and supplier confirmed rental inventory can require separately authorized sources.

`schemas/demo_run.schema.json` selects a case result schema by case ID. Five `UC*_result.schema.json` files define the exact result shapes. `contracts/use_case_outputs.json` documents their fields. `schemas/parallel_task_output.schema.json` is the provider schema; it intentionally omits validation keywords the Task API does not support. The application validates decimal strings, times, units, identifiers, fact references and comparisons.

## Acceptance

Use `contracts/acceptance_cases.json`. Offline arithmetic cases are deterministic specification fixtures, not findings from the web. A live test is complete only after actual responses and citations have been captured and reviewed. No live credential or research result is included in this package.
