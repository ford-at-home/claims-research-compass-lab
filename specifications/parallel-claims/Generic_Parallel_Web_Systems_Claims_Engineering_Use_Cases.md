# Generic Parallel Web Systems Claims Engineering Use Cases

Demo specifications and implementation package
7 November 2026

[Inference] These are proposed engineering designs for five demonstrations. All supplied claim inputs and offline observations are simulated. Product interfaces are documented in the source register. No live research results, insurer integrations, savings, or claim outcomes are asserted.

Build one generic demo suite with five use case screens and a shared evidence viewer. The only required external secret for live research is PARALLEL_API_KEY, supplied to the server environment. Use mock enterprise data for the demonstrations and keep insurer names out of the interface and outputs.

| ID | Demo | Visible result |
| --- | --- | --- |
| UC01 | Salvage valuation | Separate vehicle value and damaged recovery evidence |
| UC02 | Damage estimate verification | Line by line fitment and price findings |
| UC03 | Rental supplier integration baseline | Supplier pricing, local rules and repair timing for reviewer evidence |
| UC04 | Loss verification | Event timeline and geographic match evidence |
| UC05 | War room research with MCP | Cited brief and trace across two MCP servers |

### Implementation approach

Proposed stack: Python, a Streamlit interface, a background research worker, and SQLite for run metadata and review records. Use Parallel HTTP APIs for UC01, UC02 and UC04. UC03 ordinary requests use the existing supplier integration and make zero Parallel calls. Use an MCP client connected to a local mock enterprise MCP server and Parallel MCP for UC05. Fixed workflow steps avoid a second model API key.

### Package contents

The developer Markdown, five JSON input scenarios, research prompts, provider request templates, evidence schemas, output field contracts, offline storyboards, environment example, and acceptance cases accompany this document. They specify the demos; a running application and recorded live outputs are separate build deliverables.

## 1 Shared application behavior

### Environment and secrets

Read PARALLEL_API_KEY only in the Python service. Do not put it in client code, browser storage, request traces, exports, screenshots, or fixture files. Configuration status may report configured or missing. It must not return the key or a prefix of it. A missing key blocks live execution and leaves the chosen mode unchanged.

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

- A suite index opens the five screens. Each screen provides a sample scenario, editable public research inputs, mode selector, Run research, and run history.
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

1. Validate inputs, resolve relative dates, compute the input hash, and display the call plan. Reject unresolved rental dates before any quote request.
2. Create an allowlisted public context. Keep claim IDs, identities, internal prices, policy terms, private notes and enterprise credentials local.
3. Search and fetch within the selected case budget. Reuse the actual returned session_id for related Search and Extract calls. Preserve access failures per URL.
4. Submit at most one Task for the structured research step. Add retrieved source excerpts to its context. The Task may perform further research; its own search work is not included in the host Search call count.
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

### User story and scenario

A total loss specialist wants current vehicle and damaged salvage comparisons with reviewable sources. Use the hypothetical 2018 Camry in fixtures/UC01_salvage_valuation.input.json. Its mileage, location, condition and fees are simulated inputs.

### Visible experience

The screen has separate Vehicle market evidence, Damaged salvage evidence and Recall context tabs. Tables show vehicle attributes, mileage, location, price basis, sale status, sale date and citations. A candidate drawer explains inclusion or exclusion. A range is shown only when a documented comparison method and adequate supported observations exist; the base demo returns research only.

### Parallel workflow

1. Search retail listing and salvage auction candidates. Extract the vehicle attributes and price semantics; deduplicate by vehicle or lot identity.
2. Use the case Task prompt to return atomic price, status and qualifier findings. Reject wrong model, trim, damage, title or date context for the comparison being made.
3. Use public model recall evidence as context. A VIN specific lookup requires a separately approved access route. Do not present model campaigns as VIN repair history.
4. Compute any permitted net recovery example from a supported completed sale and explicit required deductions. Preserve gross sale and deductions as separate facts.

### What the presenter demonstrates

In fixture mode, show a simulated retail ask of $14,500, a completed damaged sale of $2,450 and an active bid of $2,800. The bid stays out of the completed sale comparison. With simulated auction and transport deductions of $220 and $140, the net example is $2,090. This is a fabricated arithmetic scenario, not a vehicle valuation.

### Acceptance and real data boundary

Pass when asks, bids and final sales remain distinct, every external amount opens its evidence, duplicate candidates are excluded, and missing completed sale data produces insufficient evidence. Completed auction results may require licensed access; do not replace them with asking prices. NHTSA recall lookup has scope exclusions, including repaired recalls. [D1, D2]

Use contracts/use_case_outputs.json UC01 for the output fields. Research quality and review time are measured later; this demo does not establish faster total loss decisions.

## 5 UC02 Damage estimate verification

### User story and scenario

A damage reviewer checks a part, local labor rate and shop details before making an estimate decision. Use the hypothetical Camry estimate in fixtures/UC02_damage_estimates.input.json. A missing part number triggers candidate identification and fitment review; it is not an assumed exact match.

### Visible experience

Upload or edit estimate lines. Show the original line beside researched candidates, part condition, fitment evidence, stock basis, fees and comparable total. The reviewer can expand Match reasoning, Labor evidence and Shop details. A lower headline price is shown separately from its comparable full cost.

### Parallel workflow

1. Search OEM, dealer, supplier and recycler pages by vehicle and part identity. Extract exact identifiers, left or right side, trim/options, condition, price, quantity basis, shipping, core charges and stock statements.
2. Research posted labor rates for the same repair discipline, geography and effective period. Keep sample coverage and methodology. Mechanic wages, national averages and negotiated insurer rates are different categories.
3. Check shop identity and published certifications using shop or certifier sources. Do not search the fabricated shop name in the seed as if it were a real business; select a real public shop for a live identity check.
4. Use Task findings and optional Decisions classification for a narrow published certification fact. Locally calculate comparable totals and differences only after fitment and terms are resolved.

### What the presenter demonstrates

The offline case estimates $420 for a simulated headlamp. One simulated exact OEM candidate is $395 plus $25 shipping, also $420. An aftermarket item at $160 and an unavailable OEM item at $310 are excluded from that comparison. The comparable delta is $0. Local labor evidence remains insufficient in the fixture.

### Acceptance and review boundary

Pass when wrong part condition, missing fitment, unavailable stock and missing cost components remain visible; unmatched items cannot become price reduction findings. Every computed difference lists its evidence inputs and formula. Repair necessity, labor hours, repair procedures and estimate approval remain outside the demo. There is no claimed supplement reduction.

Use contracts/use_case_outputs.json UC02 and UC02 acceptance cases for exact output and test requirements.

## 6 UC03 Rental supplier integration baseline

### User story and scenario

User-authorized correction, November 8, 2026: the insurer already has a rental supplier integration. Supplier-confirmed pricing belongs to that integration, not open-web research. Pricing is confirmed as a capability; availability, inventory, reservation and extension fields remain unverified. No real supplier interface contract, endpoint or credential has been supplied to this project.

An associate reviews supplier pricing with local insurer rules and repair timing. The synthetic sample has three requested days, midsize class, five seats and simulated repair context. Resolve dates locally; unknown branch reference and insurer rules stay unknown.

### Visible experience

Show supplier integration -> local insurer rules and repair timing -> reviewer evidence. Label UC03 as the supplier integration baseline, not a Parallel value claim. Fixture supplier prices and local context remain explicitly simulated. Live exposes an unconfigured supplier adapter until the actual contract is provided. Display only known interface fields; keep unverified availability, reservation and extension confirmation null. Remove the public-rental-versus-contract-rate comparison.

### Ordinary supplier workflow — zero Parallel calls

1. Validate the scenario and obtain authoritative pricing through the supplier adapter. Do not use fixture response fields in Live.
2. Combine returned supplier data with local insurer rules and repair timing; retain origin and provenance.
3. Calculate complete known costs using decimal-safe helpers, formulas and input fact references. Missing required pricing yields an integration error, never a fabricated amount.
4. Present evidence to the reviewer. Failed or incomplete supplier responses stay integration errors and never invoke web research or quote fallback. No Search, Extract, Task or MCP calls occur on this path, including resume.

### Optional external exception research

Keep a distinct explicit External exception research action requiring a specific unanswered external question outside the supplier integration's known capabilities. No validated gap is supplied, so eligibility is blocked and no external call is made. Do not invent a need or duplicate supplier price research. Future exception results are advisory and cannot override supplier prices, coverage or reservations.

### What the presenter demonstrates

The mock supplier response is an explicitly simulated all-in $50 per day for three requested days, totaling $150. The calculation stays simulated, and unknown availability and extension confirmation stay null. There is no public alternative price, transfer-cost comparison or savings claim. Local repair context and rules are simulated; no real insurer duration limit is invented.

### Acceptance and real data boundary

Pass when normal requests call the supplier adapter and make zero Parallel calls, supplier failures and missing pricing never trigger Parallel, mock prices stay labeled simulated, and exception eligibility requires an explicit question and separate action. Live remains unconfigured without the actual supplier interface contract. Do not infer insurer integration capabilities from vendor documentation. The executable contract is documented in STACK_ADAPTATION.md; historical imported UC03 research templates, output schema and storyboard alternatives are superseded for ordinary execution. These authorized amendments do not resolve the original import-integrity warning.

The demo may recommend an associate review step. It does not set coverage, authorize rental duration, reserve a car or modify an existing reservation.

## 7 UC04 Loss verification

### User story and scenario

An associate seeks public event evidence for the date and location of a reported loss. The fixture describes a hypothetical Dallas hail loss on May 26 2024. The date and location are scenario inputs, not an assertion that a damaging event occurred. The supplied UTC offset and timezone must agree.

### Visible experience

Show a loss time window, an event timeline, source coverage and a location view. Distinguish observed events, preliminary reports, warnings and forecasts. A drawer shows exact location precision, time basis, intensity, source date and citation. Switchable subcases cover weather, road closures and public incident reports using their own source policies.

### Parallel workflow

1. Convert the reported local time and uncertainty window to UTC. For the live seed, send ZIP and state by default; precise coordinates require a separate explicit demo setting.
2. Search official weather sources for events, and transportation or public agency sources for closure/incident subcases. Extract event time, geometry or point, intensity and reporting status.
3. Perform temporal overlap and distance or area overlap in local code. A ZIP-only result remains an area match. Unknown timezones or coordinates remain unresolved.
4. Return corroborating, conflicting or insufficient evidence with the searched date, place and source coverage. Keep a warning separate from an observation.

### What the presenter demonstrates

The fabricated offline observation occurs at the same synthetic point and within the loss time window. Its computed point distance is 0 km and its time overlaps. A second fabricated source is a warning without a reported point; it does not become an observed hail event. Corroboration does not establish that a vehicle was damaged.

### Acceptance and source timing

Pass when timezone boundaries, adjacent areas, coarse locations, warnings and missing reports retain their distinctions. A missing report yields insufficient evidence. The NWS describes a publication delay for Storm Data and the Storm Events Database, so the recent-loss path needs a separately validated recent source. [D4]

Do not classify coverage, fraud, liability or claim clearance. Use the UC04 output contract and both recent and historical event acceptance cases.

## 8 UC05 War room research with MCP

### User story and scenario

A research lead wants a cited outside brief related to an internal operational question. Use a simulated repair delay context and a public research question about manufacturer notices and repair guidance. A public notice does not establish why an internal repair was delayed.

### Two actual MCP connections in the demo build

The Python host connects to mock-enterprise over stdio and Parallel over Streamable HTTP. Discover tools on both connections. The mock server exposes get_case_context and get_demo_rules, defined in contracts/mock_enterprise_mcp.json. These are proposed demo tools, not claims about any insurer system. The Parallel connection uses Authorization: Bearer plus PARALLEL_API_KEY. [P8, P9]

1. Call mock-enterprise.get_case_context and get_demo_rules for UC05. Retain the complete mock response inside the host.
2. Construct the outbound question from question, public_vehicle and region only. Drop the private canary, internal counts and private record identifiers.
3. Call the discovered Parallel web_search and web_fetch tools. Call web_research for a cited narrative; an optional web_decisions call can check a narrow published fact.
4. Join the returned outside facts to internal context within the host. Display supported facts, hypotheses, contradictions, open questions and reviewer next actions as separate sections.

### Visible experience and presenter sequence

Show an Internal context panel marked Mock enterprise, a Public question preview, an actual redacted MCP trace, and a cited brief. The presenter opens the outbound preview before running, expands the tool calls, and opens a source supporting one finding. The private canary MOCK_INTERNAL_ONLY_9F must be absent from serialized outbound requests.

### Acceptance and deployment boundary

Pass when both MCP servers are initialized and tools are discovered, real tool invocations are logged, the canary is absent outside, and sources support the brief. Importing a mock Python object directly does not satisfy this MCP demonstration. In fixture mode all traces and findings remain labeled simulated.

Use the unified Parallel MCP endpoint and selected tools in contracts/parallel_mcp.json. Do not pass enterprise MCP credentials or a private enterprise server to Parallel. web_research returns a cited response when ready; structured background Task work remains a separate API operation. [P8]

## 9 Request templates and field mapping

### Request assembly requirements

requests contains five historical Search requests and five Task body templates. UC03 Search and Task templates are superseded and must not be dispatched for ordinary rentals. Its current scenario contract is supplier-first. For the other cases, load the selected prompt and schema as actual JSON values. Do not send file paths or unresolved placeholders as research context. For UC05, the Task body is an optional API comparison variant; it does not replace the required MCP path.

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
2. Wire damage estimates to Search, Extract and structured Task output. Add source validation and deterministic comparisons.
3. Add salvage, rental and loss screens using their separate output contracts and source semantics.
4. Implement the mock enterprise MCP server and the two connection war room workflow.
5. Run the acceptance cases and one actual live smoke run per supported path after the key is available. Record missing licensed data as a dependency.

Completion requires a runnable UI, five fixture walkthroughs, live request traces, evidence exports and passing acceptance cases. Claim outcomes and cycle time improvements require a later evaluated pilot. This specification package contains no live smoke run evidence.

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
