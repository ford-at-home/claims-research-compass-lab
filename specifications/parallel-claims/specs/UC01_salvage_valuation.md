[Inference] Proposed demo specification. All sample observations are simulated.

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
