[Inference] Proposed demo specification. All sample observations are simulated.

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
