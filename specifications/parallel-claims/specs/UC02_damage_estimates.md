[Inference] Proposed demo specification. All sample observations are simulated.

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
