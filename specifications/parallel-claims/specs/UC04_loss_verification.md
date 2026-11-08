[Inference] Proposed demo specification. All sample observations are simulated.

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
