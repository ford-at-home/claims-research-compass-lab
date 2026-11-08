[Inference] Proposed demo specification. All sample observations are simulated.

## 6 UC03 Rental extension research

### User story and scenario

An associate considers a rental extension when a customer requests more time. The supplied scenario has three requested days, a midsize class, five seats and simulated repair progress. Resolve pickup_offset_days against the run date in the supplied timezone; convert it to explicit pickup and return times before calling Parallel.

### Visible experience

Show the existing extension option beside alternative branch quotes. Each column exposes exact dates, class, location, mandatory fees, mileage terms, quote time, expiry if supplied, availability basis and customer effort. Mark public price observations and supplier confirmed quotes differently.

### Parallel workflow

1. Read simulated repair timing and the existing rate from the local enterprise adapter. Send only public location, exact dates, vehicle requirements and the research question outside.
2. Search supplier branches and public quote paths. Fetch terms and any retrievable actual quotes. Use Task to extract dated observations and identify inaccessible interactive quoting steps.
3. Keep quotes incomparable when class, dates, rate basis or required fees are unresolved. Public branch pages cannot substitute for a quote that was never obtained.
4. Calculate complete known scenarios locally, including transfer cost. Return supplier confirmation needed when inventory or an extension offer is not actually confirmed.

### What the presenter demonstrates

The existing extension is a simulated all in $50 per day for three days, totaling $150. An alternative advertises $45 per day; three days plus $18 mandatory fees and $35 transfer cost totals $188. The alternative has advertised availability only. The display exposes both the cost difference and confirmation gap.

### Acceptance and real data boundary

Pass when dates and branch match, required fees are explicit, incomplete totals stay null, and advertised availability is never labeled supplier confirmed. A public lookup can legitimately end with no retrievable quote. The complete live inventory demonstration depends on an authorized supplier interface; a Parallel key alone does not establish that access. Enterprise describes date and location based availability checks and price changes for extensions. [D3]

The demo may recommend an associate review step. It does not set coverage, authorize rental duration, reserve a car or modify an existing reservation.
