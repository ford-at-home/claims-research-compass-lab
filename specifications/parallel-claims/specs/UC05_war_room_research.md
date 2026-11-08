[Inference] Proposed demo specification. All sample observations are simulated.

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
