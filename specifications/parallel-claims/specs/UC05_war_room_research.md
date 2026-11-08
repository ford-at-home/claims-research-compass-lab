[Inference] Proposed demo specification. All sample observations are simulated.

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
