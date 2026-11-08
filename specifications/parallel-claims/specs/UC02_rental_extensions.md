[Inference] Proposed demo specification. All sample observations are simulated.

## 6 UC03 Rental supplier integration baseline

### User story and scenario

User-authorized correction, November 8, 2026: the insurer already has a rental supplier integration. Supplier-confirmed pricing comes from that integration, not Parallel. Pricing is the only confirmed capability; availability, reservation and extension fields are unverified until the real interface contract is provided. No supplier endpoint or credentials exist in this project.

An associate reviews supplier pricing alongside local insurer rules and repair timing. The synthetic sample requests three days, midsize class and five seats. Resolve relative dates locally. Branch reference and insurer duration limits remain unknown; do not invent them.

### Visible experience

Show the supplier integration baseline above the scenario: supplier integration -> local insurer rules -> repair timing -> reviewer evidence. Fixture supplier prices and local context are explicitly simulated. Live shows an unconfigured supplier adapter. Display only fields actually returned under a verified contract; unknown availability, reservations and extension confirmation remain null. Remove public-rental-versus-contract-rate comparisons.

### Ordinary supplier workflow — zero Parallel calls

1. Validate the scenario and request supplier pricing through the supplier adapter. Live never consumes fixture response fields.
2. Retain supplier provenance and combine returned pricing with local insurer rules and repair timing.
3. Calculate requested-duration costs using decimal-safe arithmetic and input fact references only when the rate basis is complete.
4. Present evidence and unresolved capabilities to the reviewer. A failed or incomplete supplier response remains an integration error. Never fall back to web quotes, Search, Extract, Task or MCP.

### Optional external exception research

A separate explicit External exception research action requires an explicit external question the supplier integration cannot answer. No validated external gap has been supplied; label that honestly and do not execute research or claim Parallel value. The action currently checks eligibility only. Future advisory results cannot override supplier prices, coverage or reservation state. Do not research or verify supplier pricing on the open web.

### What the presenter demonstrates

The simulated supplier adapter returns an all-in $50 per day for three requested days, totaling $150. Both the rate and calculation remain labeled simulated. There is no public alternative, cost-saving assertion or confirmed availability. Repair timing is simulated; the local insurer duration limit is null pending real rules.

### Acceptance and real data boundary

Pass when a normal UC03 run calls the supplier adapter and makes zero Parallel calls, errors and missing pricing never trigger fallback, mock prices remain simulated, unverified fields stay null, and exception eligibility requires an explicit action and question. Live is unconfigured until a real supplier contract is supplied. Vendor documentation does not establish the insurer's interface capabilities. Historical imported UC03 web-research templates and schemas are superseded for ordinary execution; see STACK_ADAPTATION.md for the executable scenario contract. The original import-integrity warning remains unresolved.

The demo may recommend an associate review step. It does not set coverage, authorize rental duration, reserve a car or modify an existing reservation.
