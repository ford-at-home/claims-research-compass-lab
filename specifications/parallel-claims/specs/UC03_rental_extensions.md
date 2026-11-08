[Inference] Proposed demo specification. All sample observations are simulated.

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
