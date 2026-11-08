# Generic Parallel Web Systems Claims Engineering Use Cases

Demo specifications and implementation package
Revised 8 November 2026

[Inference] Proposed incremental research demos around existing claims capabilities. The user confirmed an existing rental supplier pricing integration. Actual interface names and coverage for other insurer systems remain to be confirmed; the examples below are candidate experiments, not verified deficiencies. All supplied case and offline data remain simulated.

Start with the existing system response. Invoke Parallel only for a specific unanswered external question or an explicitly requested independent market benchmark. Routine primary workflows make zero Parallel calls. Rental research compares outside competitor rates with the existing supplier quote; it does not recreate supplier pricing.

| ID | Existing capability baseline | Candidate Parallel question |
| --- | --- | --- |
| UC01 | existing valuation and salvage tools | A specifically identified missing comparable or an explicitly requested outside market comparison. |
| UC02 | existing estimating parts labor and repair sources | A defined part availability, repair guidance or other exception not answered by the existing sources. |
| UC03 | existing rental supplier integration | Competitor rates from different suppliers in the same area for the same dates, class and rental terms. |
| UC04 | existing weather catastrophe and incident sources | A specific missing local corroboration question after the existing source response is examined. |
| UC05 | existing enterprise systems and tools | A genuinely external vendor, public documentation or incident question that internal tools cannot answer. |

A candidate is dropped when existing data already answers it. Evaluate additional supported findings and reviewer effort against that baseline. Do not attribute routine integration benefits to Parallel.

### Implementation approach

Proposed stack: Python, a Streamlit interface, a background research worker, and SQLite for run metadata and review records. Use Parallel HTTP APIs for UC01 through UC04. Use an MCP client connected to a local mock enterprise MCP server and Parallel MCP for UC05. Fixed workflow steps avoid a second model API key.

### Package contents

The developer Markdown, five JSON input scenarios, research prompts, provider request templates, evidence schemas, output field contracts, offline storyboards, environment example, and acceptance cases accompany this document. They specify the demos; a running application and recorded live outputs are separate build deliverables.

## 1 Shared application behavior

### Environment and secrets

Read PARALLEL_API_KEY only in the Python service. Do not put it in client code, browser storage, request traces, exports, screenshots, or fixture files. Configuration status may report configured or missing. It must not return the key or a prefix of it. A missing key blocks external live research; it does not block the existing primary integration path or change the selected mode.

```python
import os
parallel_api_key = os.environ["PARALLEL_API_KEY"]
# Server-side use only; never print this value.
```

### Three explicit data modes

| Mode | Behavior | Required label |
| --- | --- | --- |
| Fixture | Read fabricated storyboard observations; make no provider calls | Simulated scenario and evidence |
| Live | Use real Parallel requests with synthetic claim context | Live research with simulated claim input |
| Replay | Read a previously captured live response and its original timestamps | Recorded live research and capture date |

Switching mode requires an explicit user action. Live failures stay visible. A fixture response cannot become a replay record or acquire a live research label. Provider access does not convert the supplied hypothetical claim into a real claim.

### Screen and presenter controls

- A suite index opens the five screens. Each screen provides a sample scenario, baseline response, explicit research question, mode selector, Load baseline, Research gap or Benchmark competitor rates, and run history.
- A progress panel shows planned steps, completed calls, elapsed time, source counts, and any reported usage. Research may continue in the background while the interface remains usable.
- A findings table opens an evidence drawer with the exact source excerpt, URL, dates, qualifiers and origin. Tabs show Sources, Calculations, Redacted trace and Review.
- Review actions accept evidence, reject evidence or request further research. Store these locally. Export JSON and a readable report with origins and citations preserved.

Do not add settlement, claim approval, denial, payment, booking, cancellation, or outbound messaging actions. A presenter can use fixture mode for a predictable walkthrough and live mode to show actual retrieval, including missing evidence.

## 2 Research APIs and execution

| Capability | Documented interface | Demo role |
| --- | --- | --- |
| Search | POST /v1/search | Discover public pages and retain excerpts |
| Extract | POST /v1/extract | Read selected public pages and qualifiers |
| Decisions | POST /v1/decisions | Classify a narrow published fact with an unknown option |
| Task | POST /v1/tasks/runs | Produce structured researched findings |
| Task result | GET /v1/tasks/runs/{run_id}/result | Retrieve an existing research result |
| Parallel MCP | https://mcp.parallel.ai/mcp | Expose research tools beside mock enterprise tools |

HTTP examples use https://api.parallel.ai with x-api-key. Search requires search_queries; Extract requires urls. On v1 Extract, fetch_policy and full_content belong under advanced_settings. Task JSON output uses task_spec.output_schema with type json and json_schema. [P1, P2, P4, P5]

### Fixed execution plan

1. Load and validate the existing system response first. If it answers the question, return it with zero Parallel calls. Require an explicit uncovered question or requested competitor benchmark before the external call plan. Resolve rental dates before any outside quote request.
2. Create an allowlisted public context. Keep claim IDs, identities, internal prices, policy terms, private notes and enterprise credentials local.
3. Search and fetch within the selected case budget. Reuse the actual returned session_id for related Search and Extract calls. Preserve access failures per URL.
4. Only after the local research gate permits the explicit question, submit at most one Task for the structured research step. Add retrieved source excerpts to its context. The Task may perform further research; its own search work is not included in the host Search call count.
5. Persist the returned provider run ID immediately. Retrieve its result using short waits, then validate the content and Basis. Normalize facts and run calculations locally.
6. Render the result, coverage gaps, provenance and review controls. Keep the original input hash and provider output with the run.

Use Task for background research, rather than assuming an instant answer. The result endpoint can wait for completion. A local deadline stops waiting, preserves the provider ID and offers Resume. It does not establish that a remote run has stopped. [P4, P6]

## 3 Evidence and run contracts

### Every external number needs specific evidence

Use one atomic attribute per finding. Store the source URL and supporting excerpt, entity identity, number as a decimal string, unit, currency, evidence type, qualifiers and applicable time. Keep application retrieval time separate from publisher observation time and publication date. Unknown source times stay null.

Task Basis includes top level field evidence and individual entries for elements of top level lists. Preserve output.content and output.basis. Link findings.0, findings.1 and later paths to evidence records. A list element citation alone is insufficient when its excerpt does not support the particular numeric value and context. [P7]

| Contract | Mandatory behavior |
| --- | --- |
| Origins | Distinguish live_web, licensed_source, mock_enterprise, simulated_fixture and calculation |
| Validation | Check identifiers, values, units, dates, source meaning and comparability; keep unsupported candidates non-actionable |
| Calculations | Use Decimal and explicit input fact IDs, formula, rounding and rule version; unknown required components yield a null total |
| Source conflict | Retain both observations and their scope; do not average unrelated observations |
| Review | Record disposition, timestamp and evidence version; provider confidence is shown separately from observed correctness |

### Stable application records

schemas/evidence_fact.schema.json defines facts. schemas/demo_run.schema.json defines the envelope and selects UC01 through UC05 result schemas by case ID. contracts/use_case_outputs.json maps each field to its purpose. Validate the selected case schema and all referenced fact IDs before displaying a completed result.

A run records run ID, case ID, mode, input hash, spec version, provider IDs, state, facts, gaps, reported usage and estimates. Use queued, researching, validating, awaiting_review, partial, submission_unknown, failed and stopped as UI states. case_result stays null until a result exists. Preserve the provider state verbatim in the raw response.

Use supported or simulated facts in calculations as appropriate to the selected mode. Do not mix simulated and live external observations in the same comparison without separate, explicit scenario columns. A citation check is a validation step, not an accuracy guarantee.

## 4 UC01 Salvage valuation

### Existing capability baseline

Use the vehicle valuation and salvage outputs already in the claims workflow. The exact insurer vendors, valuation method and data coverage have not been supplied here. The demo uses a named mock adapter and does not imply that these basic capabilities are absent.

### Candidate external question

A reviewer identifies a specific comparable or market question that the existing sources do not answer. Possible experiments include an unusual vehicle configuration or a requested independent regional market comparison. These are hypotheses to check against actual feed coverage, not known gaps.

### Workflow

1. Load the existing valuation/salvage response and identify the precise unanswered question. An answered question returns the baseline without Parallel.
2. On explicit research request, search only for evidence relevant to that question. Keep retail asks, completed damaged sales, bids, dates, condition and title qualifiers separate.
3. Present baseline facts beside genuinely additional evidence, excluded candidates and coverage gaps. Keep insurer valuation methods and specialist judgment authoritative.

### Presenter and acceptance

Show an ordinary mock case resolved from the primary tools with zero Parallel calls, then select an explicit exception scenario. The existing fabricated ask, bid and completed-sale observations demonstrate evidence distinctions only. The $2,090 net example remains a labeled fixture calculation and is not a valuation recommendation.

Pass when the primary response is used first, a specific research question is recorded, public observations cannot silently override authoritative values, and the demo reports what the research added. An integration error stays an integration error. Completed sold data access and recall scope still need appropriate source handling. [D1, D2]

## 5 UC02 Damage estimate verification

### Existing capability baseline

Use the estimating system, parts and labor sources, repair information and vendor data already in the review workflow. Their exact interfaces and coverage must be confirmed before connecting; do not present normal estimating capabilities as missing.

### Candidate external question

Research an explicitly unresolved exception or requested independent comparison. Potential experiments include availability for an unusual part or a public manufacturer statement not represented in the response being reviewed. First check whether existing licensed or vendor data already answers the question.

### Workflow

1. Load the estimate and relevant existing source response. Mark which attributes are answered, unresolved or unavailable. A routine answered line causes zero Parallel calls.
2. For an approved external question, use the exact vehicle, part, condition, options and dates. Retrieve supporting source statements instead of re-running every routine price and labor lookup.
3. Show only the incremental facts beside the existing answer. Calculate a delta only when identity and terms are comparable. Keep conflicting information and missing cost components visible.

### Presenter and acceptance

Demonstrate a normal estimate line answered by the mock estimating adapter, then an explicitly selected exception. The labeled $395 plus $25 shipping fixture remains $420; it demonstrates why headline prices alone are insufficient. It does not imply that the insurer lacks parts pricing.

Pass when answered questions make zero Parallel calls, integration failures cannot trigger public replacements, and every exception has a specific question and source evidence. Review necessity, hours, repair procedures and approval remain with existing methods. Measure additional supported answers and reviewer effort, not time spent duplicating a source already available.

## 6 UC03 Rental competitor rate benchmark

### Confirmed existing capability

The insurer already has a rental supplier integration providing supplier-confirmed pricing. Read that quote from the existing adapter. Do not use Parallel to obtain or verify the same supplier price. The demo adapter remains explicitly simulated until an actual interface contract is provided.

### Requested external question

What do different rental suppliers in the same area quote for the same dates and vehicle requirements, and how do those public market quotes compare with the existing integrated supplier rate? This competitor benchmark is the Parallel task.

### Workflow

1. Load the integrated supplier quote. Resolve dates, times, duration, area, currency, class, seating and fee context. The ordinary supplier lookup makes zero Parallel calls.
2. When the reviewer selects Benchmark competitor rates, research different suppliers and exclude the integrated supplier and any known same-group providers. Do not send private account terms or internal claim data outside.
3. Capture actual retrievable quotes, mandatory fees, rate basis, quote time and availability/confirmation basis. A public retail quote stays labeled as a public retail quote; missing or incomparable offers stay unknown or excluded.
4. Compute complete base rental totals and deltas for matching contexts. Keep switching and transfer costs in a separate decision scenario. Return sources and terms for reviewer interpretation, without changing a reservation.

### Presenter and acceptance

The fixture supplier quote is $150 for three days. A simulated different supplier quotes $45 per day plus $18 mandatory fees, totaling $153. The base benchmark delta is $3 or 2 percent. A $35 transfer cost yields a separate $188 switching scenario. Every value here is fabricated and labeled.

Pass when the integrated supplier remains the pricing source, only explicit competitor research calls Parallel, comparison context and rate basis stay visible, and unavailable quotes are not invented. Competitor advertised availability does not become supplier-confirmed inventory. The comparison is a market benchmark, not proof that unlike rate agreements are equivalent. [D3]

## 7 UC04 Loss verification

### Existing capability baseline

Use existing catastrophe, weather, traffic and incident sources before public research. Actual source names and coverage have not been provided. An ordinary loss already covered by the existing response is demonstrated without Parallel calls.

### Candidate external question

A reviewer identifies a missing corroboration question: for example, a dated local closure notice or public incident detail absent from the source response being reviewed. Validate that the detail is actually missing; do not replace standard weather verification with a generic web search.

### Workflow

1. Load the existing source response and normalize the reported time, timezone and location uncertainty. Record the exact unresolved question.
2. On explicit request, retrieve only relevant public event, closure or incident evidence. Preserve source type, time, geography, publication delay and precision.
3. Calculate time and geography matches locally. Show what is new relative to the baseline. Keep warnings, forecasts, observations and preliminary reports distinct.

### Presenter and acceptance

Run a baseline-covered fixture with zero external calls, followed by a selected missing-public-detail scenario. The existing 0 km observation and warning remain labeled simulation records demonstrating geography and source distinctions. Neither proves vehicle damage.

Pass when baseline coverage is checked first, missing public records stay insufficient evidence, and public corroboration is not promoted into a coverage, liability or fraud decision. Historical archive delays remain relevant when choosing a genuinely additional recent source. [D4]

## 8 UC05 War room research with MCP

### Existing capability baseline

Use enterprise systems and available internal tools for company facts. The mock enterprise MCP is a demonstration adapter, not an assertion that an insurer lacks internal tools or has a particular MCP deployment.

### Candidate external question

Identify the actual outside question: for example, current public vendor documentation or a published incident statement relevant to an internal investigation. Internal records and public evidence answer different questions. Do not research public sources to reconstruct private operational facts.

### Workflow

1. Discover and query the mock enterprise MCP tools. If their response answers the question, return it with zero Parallel calls.
2. For an explicit external question, build the minimum allowlisted context and call actual Parallel MCP tools where supported. Retain a trace of which question required the outside source.
3. Join outside evidence to internal context in the host. Show supported facts, hypotheses, contradictions and open questions separately. A public notice does not establish internal delay causation.

### Presenter and acceptance

Show an internal-only query first, then a selected external documentation question. The private canary MOCK_INTERNAL_ONLY_9F stays out of serialized outbound context. Fixture traces remain labeled simulated; a live MCP label requires actual protocol calls and tool discovery.

Pass when the internal answer is not redundantly researched, external facts have citations, private context remains internal and connection failures are accurately displayed. Document the actual transport adaptation rather than inventing a deployed enterprise MCP. [P8, P9]

## 9 Request templates and field mapping

### Request assembly requirements

requests contains five Search requests and five Task body templates. Load the selected prompt and schema as actual JSON values. Do not send file paths or unresolved placeholders as research context. All request bodies are dormant until contracts/research_gate.json permits an explicit external question. For UC03, fill exact times and exclude the existing supplier; its confirmed price stays in the primary integration. For UC05, the Task body is an optional API comparison variant; it does not replace the required MCP path.

Before submission, remove nonpublic fields and record the resulting outbound context. The fixture claim values are never factual assertions about the web. Add actual Search/Extract results to discovered_source_excerpts, retaining their source and timestamp provenance.

contracts/source_policy.json sets explicit weather and public agency filters. Search places a policy under advanced_settings; Task uses top level source_policy. Choose include_domains or exclude_domains for a request. Source preferences can remain in the research objective. [P10]

### Structured Task body shape

```json
{
  "processor": "core",
  "input": {
    "research_instructions": "loaded case prompt",
    "public_case_context": {},
    "discovered_source_excerpts": []
  },
  "task_spec": {
    "output_schema": {
      "type": "json",
      "json_schema": "replace with the loaded schema object"
    }
  }
}
```

The schema file has an object root, required properties and additionalProperties false for provider output objects. It avoids Task unsupported validation keywords such as format, pattern and numeric bounds. Enforce dates, decimals, identifiers, counts and business comparisons in application code. [P5]

### Decisions and evidence mapping

requests/decisions.template.json uses type choice with an explicit unknown category. Populate a real entity and exact public question before use. Treat a refusal as unresolved evidence. Do not translate a probability into claim approval. [P3]

Store provider output.content as raw researched candidates and output.basis as provider evidence. Normalize each candidate to evidence_fact after validation. Attach calculation inputs and local mock record references separately. The brief output for MCP may remain a cited narrative instead of pretending that it is the Task JSON shape.

## 10 Failure handling and completion

### Bounded execution

environment.env.example sets proposed limits: four host Search requests, eight extracted URLs, one Task creation, one Decisions request and eight MCP tool calls per run. Use a 30 second HTTP timeout, two second poll interval, one second result wait and ten minute local UI wait. These are demo defaults, not vendor service guarantees or measured latency.

Enforce caps before making a call. Record retries and status checks separately from research operations. Persist all provider IDs. Internal Task tool activity is provider managed; host call caps are not a dollar spending guarantee. Show reported usage when returned and keep cost estimates separately labeled.

| Condition | Required behavior |
| --- | --- |
| Missing key or 401 | Configuration/authentication error; no secret in output |
| 402 or 403 | Show credit or access failure; no provider or mode substitution |
| 422 | Show schema/input error and stop that operation |
| 429 or transient read failure | Bounded retry for idempotent reads, honoring Retry-After |
| Task submission response lost | Record submission_unknown; do not auto-submit another Task |
| Known task still active | Persist ID and offer Resume on local deadline |
| Source blocked or incomplete | Partial evidence with null values and source coverage |

### Build order and completion criteria

1. Build shared modes, run store, evidence drawer and fixture scenarios. Validate all JSON artifacts.
2. Wire existing-system adapters and research gating first, then connect only the requested external questions to Search, Extract and Task.
3. Add salvage, rental and loss screens using their separate output contracts and source semantics.
4. Implement the mock enterprise MCP server and the two connection war room workflow.
5. Run the acceptance cases and one actual live smoke run per supported path after the key is available. Record missing licensed data as a dependency.

Completion requires a runnable UI, five baseline walkthroughs with zero Parallel calls, explicit incremental research demonstrations, evidence exports and passing acceptance cases. Claim outcomes and cycle time improvements require a later evaluated pilot. This specification package contains no live smoke run evidence.

## 11 Sources and package guide

Parallel API documentation was checked on November 7 2026. Domain source limitations were carried forward from the supplied pilot specifications and the primary sources below. Product documentation establishes interfaces, not the accuracy or business impact of these proposed demos.

[P1] [Parallel Search API](https://docs.parallel.ai/api-reference/search/search)

[P2] [Parallel Extract API](https://docs.parallel.ai/api-reference/extract/extract)

[P3] [Decisions question types](https://docs.parallel.ai/decisions/question-types)

[P4] [Task create API](https://docs.parallel.ai/api-reference/tasks/create-task-run)

[P5] [Task output schema requirements](https://docs.parallel.ai/task-api/guides/specify-a-task)

[P6] [Task result API](https://docs.parallel.ai/api-reference/tasks/retrieve-task-run-result)

[P7] [Task Research Basis](https://docs.parallel.ai/task-api/guides/access-research-basis)

[P8] [Parallel MCP setup and authentication](https://docs.parallel.ai/integrations/mcp/quickstart)

[P9] [MCP client development](https://modelcontextprotocol.io/docs/develop/build-client)

[P10] [Parallel source policies](https://docs.parallel.ai/resources/source-policy)

[D1] [Copart sales inventory and licensing](https://www.copart.com/content/us/en/buyer/sales/download-sales-data)

[D2] [NHTSA recall lookup scope](https://www.nhtsa.gov/recalls)

[D3] [Enterprise rental price factors](https://www.enterprise.com/en/car-rental-faqs/us-deposits-and-payments/how-much-is-a-rental-car.html)

[D4] [NWS storm report records and timing](https://www.weather.gov/unr/storm_reports)

### Developer files

| Folder or file | Purpose |
| --- | --- |
| README.md and specs/ | Master specification, case specs and implementation plan |
| schemas/ and contracts/ | Provider output schema, evidence schema, case outputs and acceptance cases |
| fixtures/ and prompts/ | Synthetic inputs, fabricated storyboards and case research instructions |
| requests/ | Provider request bodies; unresolved runtime values need assembly |
| environment.env.example | Server environment names and proposed execution limits |
