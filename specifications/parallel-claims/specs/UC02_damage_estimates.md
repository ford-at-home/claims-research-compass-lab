[Inference] Proposed demo specification. All sample observations are simulated.

## 5 UC02 Damage estimate verification

### Existing capability baseline

Use the estimating system, parts and labor sources, repair information and vendor data already in the review workflow. Their exact interfaces and coverage must be confirmed before connecting; do not present normal estimating capabilities as missing.

### Candidate external question

Research an explicitly unresolved exception or requested independent comparison. Potential experiments include availability for an unusual part or a public manufacturer statement not represented in the response being reviewed. First check whether existing licensed or vendor data already answers the question.

### Workflow

1. Load the estimate and relevant existing source response. Mark which attributes are answered, unresolved or unavailable. A routine answered line causes zero Parallel calls.
2. For an approved external question, use the exact vehicle, part, condition, options and dates. Retrieve supporting source statements instead of re-running every routine price and labor lookup.
3. Show only the incremental facts beside the existing answer. Calculate a delta only when identity and terms are comparable. Keep conflicting information and missing cost components visible.

### Presenter and acceptance

Demonstrate a normal estimate line answered by the mock estimating adapter, then an explicitly selected exception. The labeled $395 plus $25 shipping fixture remains $420; it demonstrates why headline prices alone are insufficient. It does not imply that the insurer lacks parts pricing.

Pass when answered questions make zero Parallel calls, integration failures cannot trigger public replacements, and every exception has a specific question and source evidence. Review necessity, hours, repair procedures and approval remain with existing methods. Measure additional supported answers and reviewer effort, not time spent duplicating a source already available.
