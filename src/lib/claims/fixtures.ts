import { dec, distanceKm, lossWindowUtc, minus, overlaps, resolveRentalWindow, sum, times } from "./calc";
import { buildPublicContext } from "./public-context";
import { containsCanary } from "./redact";
import { MOCK_ENTERPRISE, PARALLEL_MCP, STORYBOARDS } from "./spec";
import type { CaseId, EvidenceFact, RunRecord, TraceEntry } from "./types";
import { MODE_LABEL } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function fact(p: Partial<EvidenceFact> & Pick<EvidenceFact, "fact_id" | "entity_id" | "attribute" | "origin" | "evidence_type">, now: string): EvidenceFact {
  return {
    value_text: null,
    number_decimal: null,
    unit: null,
    currency: null,
    status: p.origin === "simulated_fixture" ? "simulated" : "candidate",
    citations: [],
    retrieved_at: now,
    effective_at: null,
    published_at: null,
    source_observed_at: null,
    qualifiers: [],
    provider_basis_paths: [],
    vendor_confidence: null,
    formula: null,
    input_fact_ids: [],
    ...p,
  };
}

const simCite = (ref: string, text: string) => [{ source_ref: ref, url: null, excerpt: `SIMULATED — ${text}` }];
const short = (ref: string) => ref.split("/").pop() ?? ref;

export function emptyRun(caseId: CaseId, mode: RunRecord["mode"], input: unknown, inputHash: string, now: string): RunRecord {
  return {
    run_id: `${mode}-${caseId}-${Date.parse(now).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    case_id: caseId,
    mode,
    label: MODE_LABEL[mode],
    status: "completed",
    input,
    input_hash: inputHash,
    created_at: now,
    captured_at: null,
    steps: [],
    facts: [],
    result: {},
    gaps: [],
    coverage: [],
    trace: [],
    provider_ids: {},
    calls: { search: 0, extract_urls: 0, task: 0, decisions: 0, mcp: 0 },
    error: null,
    summary: null,
  };
}

/** Fixture mode: reads fabricated storyboard observations; makes no provider calls. */
export function runFixture(caseId: CaseId, wrapper: any, inputHash: string, now = new Date().toISOString()): RunRecord {
  const run = emptyRun(caseId, "fixture", wrapper, inputHash, now);
  const input = wrapper?.input ?? {};
  const sb = STORYBOARDS[caseId];
  const tr = (op: string, note: string, request?: unknown, response?: unknown): TraceEntry => ({ at: now, op, transport: "simulated", status: "simulated", request, response, note });
  run.trace.push(tr("fixture.load_storyboard", "Fabricated storyboard loaded; zero provider calls made.", { case_id: caseId }));
  run.coverage.push({ category: "public web", status: "simulated", notes: "Fixture mode: no Search, Extract, Task or MCP request was sent." });
  const F = (p: any) => fact(p, now);

  if (caseId === "UC01") {
    const fees = input.fees ?? {};
    const facts = sb.observations.map((o: any) =>
      F({ fact_id: `f-${short(o.source_ref)}`, entity_id: short(o.source_ref), attribute: o.type === "asking_price" ? "retail_asking_price" : o.type === "completed_sale" ? "salvage_final_sale" : "salvage_active_bid", origin: "simulated_fixture", evidence_type: o.type, number_decimal: dec(o.amount_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", value_text: `$${o.amount_usd}`, citations: simCite(o.source_ref, `${o.type} ${o.amount_usd} USD`), qualifiers: ["Fabricated observation"] }),
    );
    const feeA = F({ fact_id: "f-auction-fee", entity_id: "fees", attribute: "auction_fee", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(fees.auction_fee_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", citations: [{ source_ref: "mock://enterprise/UC01/fees", url: null, excerpt: "Simulated internal deduction" }] });
    const feeT = F({ fact_id: "f-transport", entity_id: "fees", attribute: "transport_cost", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(fees.transport_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", citations: [{ source_ref: "mock://enterprise/UC01/fees", url: null, excerpt: "Simulated internal deduction" }] });
    const sale = facts.find((f: EvidenceFact) => f.evidence_type === "completed_sale");
    const net = minus(sale?.number_decimal ?? null, [feeA.number_decimal, feeT.number_decimal]);
    const netF = F({ fact_id: "calc-net-recovery", entity_id: sale?.entity_id ?? "none", attribute: "net_recovery_example", origin: "calculation", evidence_type: "other", status: net === null ? "insufficient" : "simulated", number_decimal: net, unit: "USD", currency: "USD", formula: `${sale?.number_decimal ?? "?"} - ${feeA.number_decimal ?? "?"} - ${feeT.number_decimal ?? "?"}`, input_fact_ids: [sale?.fact_id ?? "", feeA.fact_id, feeT.fact_id].filter(Boolean), qualifiers: ["Fabricated arithmetic scenario, not a vehicle valuation"] });
    run.facts = [...facts, feeA, feeT, netF];
    const bid = facts.find((f: EvidenceFact) => f.evidence_type === "active_bid");
    const ask = facts.find((f: EvidenceFact) => f.evidence_type === "asking_price");
    run.result = {
      retail_comparables: ask ? [{ entity_id: ask.entity_id, fact_ids: [ask.fact_id], inclusion: "included", reason: "Simulated retail asking price (pre-loss market evidence)" }] : [],
      salvage_comparables: [
        ...(sale ? [{ entity_id: sale.entity_id, fact_ids: [sale.fact_id], inclusion: "included", reason: "Simulated completed damaged sale" }] : []),
        ...(bid ? [{ entity_id: bid.entity_id, fact_ids: [bid.fact_id], inclusion: "excluded", reason: "Active bid is not a completed sale" }] : []),
      ],
      excluded_candidates: bid ? [{ entity_id: bid.entity_id, fact_ids: [bid.fact_id], inclusion: "excluded", reason: "Active bid excluded from completed sale comparison" }] : [],
      recall_evidence: [],
      net_recovery_examples: sale && net !== null ? [{ entity_id: sale.entity_id, gross_fact_id: sale.fact_id, deduction_fact_ids: [feeA.fact_id, feeT.fact_id], net_fact_id: netF.fact_id }] : [],
      valuation_status: sale ? "research_only" : "insufficient_evidence",
      settlement_value: null,
    };
    run.gaps.push("No settlement value is produced; pre-loss market evidence and damaged recovery are kept separate.", "Recall evidence not researched in fixture mode.");
    run.summary = `Simulated: retail ask ${ask?.number_decimal}, completed damaged sale ${sale?.number_decimal}, active bid ${bid?.number_decimal} (excluded). Net example ${net ?? "null"}.`;
  }

  if (caseId === "UC02") {
    const line = (input.lines ?? []).find((l: any) => l.estimate_price_usd !== undefined) ?? {};
    const qty = line.quantity ?? 1;
    const estF = F({ fact_id: `est-${line.id}`, entity_id: line.id ?? "L1", attribute: "estimate_line_price", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(line.estimate_price_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", value_text: line.description, citations: [{ source_ref: "mock://enterprise/UC02/estimate", url: null, excerpt: `Simulated estimate line ${line.id}: ${line.description} (${line.condition})` }], qualifiers: [String(line.condition ?? "condition unknown"), line.part_number ? `part ${line.part_number}` : "no exact part number"] });
    const cands = sb.observations.map((o: any) => {
      const id = short(o.source_ref);
      const conditionOk = /OEM/i.test(o.part_identity) && /OEM/i.test(line.condition ?? "");
      const exact = /exact/i.test(o.part_identity);
      const inStock = o.stock === "simulated_in_stock";
      const status = !conditionOk ? "mismatch" : !exact ? "needs_fitment_review" : !inStock ? "insufficient_evidence" : "exact_supported";
      const unitF = F({ fact_id: `f-${id}-unit`, entity_id: id, attribute: "part_unit_price", origin: "simulated_fixture", evidence_type: "supplier_quote", number_decimal: dec(o.unit_price_usd)?.toFixed(2) ?? null, unit: "USD per part", currency: "USD", value_text: o.part_identity, citations: simCite(o.source_ref, `${o.part_identity} ${o.unit_price_usd} USD, ${o.stock}`), qualifiers: [o.part_identity, o.stock] });
      const shipF = F({ fact_id: `f-${id}-ship`, entity_id: id, attribute: "shipping", origin: "simulated_fixture", evidence_type: "supplier_quote", number_decimal: o.shipping_usd ? dec(o.shipping_usd)!.toFixed(2) : null, unit: "USD", currency: "USD", status: o.shipping_usd ? "simulated" : "insufficient", citations: simCite(o.source_ref, o.shipping_usd ? `shipping ${o.shipping_usd}` : "shipping not stated") });
      const total = status === "exact_supported" ? sum([times(unitF.number_decimal, qty), shipF.number_decimal]) : null;
      return { id, status, unitF, shipF, total, reason: status === "mismatch" ? "Part condition does not match estimate (aftermarket vs OEM new)" : status === "insufficient_evidence" ? "Unavailable stock" : status === "needs_fitment_review" ? "Fitment not established" : "Exact simulated OEM part in stock" };
    });
    const comparable = cands.find((c: any) => c.status === "exact_supported");
    const totalF = comparable ? F({ fact_id: "calc-comparable-total", entity_id: comparable.id, attribute: "comparable_total", origin: "calculation", evidence_type: "other", status: comparable.total ? "simulated" : "insufficient", number_decimal: comparable.total, unit: "USD", currency: "USD", formula: `${comparable.unitF.number_decimal} * ${qty} + ${comparable.shipF.number_decimal ?? "?"} (core charge: not stated in fixture)`, input_fact_ids: [comparable.unitF.fact_id, comparable.shipF.fact_id] }) : null;
    const delta = totalF ? minus(totalF.number_decimal, [estF.number_decimal]) : null;
    const deltaF = totalF ? F({ fact_id: "calc-delta", entity_id: line.id, attribute: "comparable_delta", origin: "calculation", evidence_type: "other", status: delta === null ? "insufficient" : "simulated", number_decimal: delta, unit: "USD", currency: "USD", formula: `${totalF.number_decimal} - ${estF.number_decimal}`, input_fact_ids: [totalF.fact_id, estF.fact_id] }) : null;
    const labor = (input.lines ?? []).find((l: any) => l.hours !== undefined);
    const laborF = labor ? F({ fact_id: `est-${labor.id}`, entity_id: labor.id, attribute: "estimate_labor", origin: "mock_enterprise", evidence_type: "other", number_decimal: times(labor.rate_usd_per_hour, labor.hours), unit: "USD", currency: "USD", formula: `${labor.hours} h * ${labor.rate_usd_per_hour}`, citations: [{ source_ref: "mock://enterprise/UC02/estimate", url: null, excerpt: `Simulated ${labor.description}` }] }) : null;
    run.facts = [estF, ...cands.flatMap((c: any) => [c.unitF, c.shipF]), ...(totalF ? [totalF] : []), ...(deltaF ? [deltaF] : []), ...(laborF ? [laborF] : [])];
    run.result = {
      line_findings: [{ line_id: line.id, fact_ids: [estF.fact_id, ...cands.map((c: any) => c.unitF.fact_id)] }],
      match_status: cands.map((c: any) => ({ candidate_id: c.id, line_id: line.id, status: c.status, reason: c.reason })),
      price_components: cands.map((c: any) => ({ candidate_id: c.id, part: c.unitF.number_decimal, quantity: qty, shipping: c.shipF.number_decimal, core_charge: null, mandatory_fees: null })),
      comparisons: [{ line_id: line.id, comparable_total_usd: totalF?.number_decimal ?? null, delta_usd: delta, reason: totalF ? "Exact simulated match with all stated components" : "No exact, in-stock, fully priced candidate" }],
      shop_checks: [{ status: "not_checked", reason: "Seed shop name is fabricated; select a real public shop for a live identity check" }],
      labor_checks: [{ line_id: labor?.id ?? null, labor_rate_status: "insufficient_evidence", reason: "No local posted labor rate evidence in fixture" }],
    };
    run.gaps.push("Local labor rate evidence insufficient.", "Unmatched items cannot become price reduction findings.");
    run.summary = `Simulated: comparable total ${totalF?.number_decimal ?? "null"}, delta ${delta ?? "null"}. Excluded: ${cands.filter((c: any) => c !== comparable).map((c: any) => c.id).join(", ")}.`;
  }

  if (caseId === "UC03") {
    const w = resolveRentalWindow(new Date(now), input.location?.timezone ?? "UTC", input.pickup_offset_days ?? 0, input.requested_days ?? 0);
    const days = input.requested_days;
    const ex = input.existing_extension ?? {};
    const exDaily = F({ fact_id: "f-existing-daily", entity_id: "existing", attribute: "daily_all_in_rate", origin: "mock_enterprise", evidence_type: "supplier_quote", number_decimal: dec(ex.daily_all_in_usd)?.toFixed(2) ?? null, unit: "USD per day", currency: "USD", qualifiers: [String(ex.availability)], citations: [{ source_ref: "mock://enterprise/UC03/existing", url: null, excerpt: "Simulated existing extension (simulated supplier confirmed)" }] });
    const exTotal = times(exDaily.number_decimal, days);
    const exTotalF = F({ fact_id: "calc-existing-total", entity_id: "existing", attribute: "scenario_total", origin: "calculation", evidence_type: "other", status: exTotal ? "simulated" : "insufficient", number_decimal: exTotal, unit: "USD", currency: "USD", formula: `${exDaily.number_decimal} * ${days}`, input_fact_ids: [exDaily.fact_id] });
    const transferF = F({ fact_id: "f-transfer", entity_id: "alternative", attribute: "transfer_cost", origin: "mock_enterprise", evidence_type: "other", number_decimal: dec(input.transfer_cost_usd)?.toFixed(2) ?? null, unit: "USD", currency: "USD", citations: [{ source_ref: "mock://enterprise/UC03/transfer", url: null, excerpt: "Simulated transfer cost" }] });
    const alts = sb.observations.map((o: any) => {
      const id = short(o.source_ref);
      const daily = F({ fact_id: `f-${id}-daily`, entity_id: id, attribute: "advertised_daily_rate", origin: "simulated_fixture", evidence_type: "posted_rate", number_decimal: dec(o.daily_usd)?.toFixed(2) ?? null, unit: "USD per day", currency: "USD", qualifiers: [o.availability, "public price observation — not a supplier confirmed quote"], citations: simCite(o.source_ref, `${o.daily_usd}/day, availability ${o.availability}`) });
      const feesF = F({ fact_id: `f-${id}-fees`, entity_id: id, attribute: "mandatory_fees", origin: "simulated_fixture", evidence_type: "posted_rate", number_decimal: o.mandatory_fees_usd ? dec(o.mandatory_fees_usd)!.toFixed(2) : null, status: o.mandatory_fees_usd ? "simulated" : "insufficient", unit: "USD", currency: "USD", citations: simCite(o.source_ref, `mandatory fees ${o.mandatory_fees_usd ?? "not stated"}`) });
      const total = o.days === days ? sum([times(daily.number_decimal, days), feesF.number_decimal, transferF.number_decimal]) : null;
      const totalF = F({ fact_id: `calc-${id}-total`, entity_id: id, attribute: "scenario_total_including_transfer", origin: "calculation", evidence_type: "other", status: total ? "simulated" : "insufficient", number_decimal: total, unit: "USD", currency: "USD", formula: `${daily.number_decimal} * ${days} + ${feesF.number_decimal ?? "?"} + ${transferF.number_decimal ?? "?"}`, input_fact_ids: [daily.fact_id, feesF.fact_id, transferF.fact_id] });
      return { id, o, daily, feesF, totalF };
    });
    run.facts = [exDaily, exTotalF, transferF, ...alts.flatMap((a: any) => [a.daily, a.feesF, a.totalF])];
    const confirmNeeded = alts.some((a: any) => a.o.availability !== "supplier_confirmed");
    run.result = {
      resolved_window: w,
      existing_option: { fact_ids: [exDaily.fact_id, exTotalF.fact_id], origin: "mock_enterprise", total_usd: exTotal },
      alternative_quotes: alts.map((a: any) => ({ entity_id: a.id, fact_ids: [a.daily.fact_id, a.feesF.fact_id], availability_basis: a.o.availability, supplier_confirmed: a.o.availability === "supplier_confirmed" })),
      scenario_totals: [{ entity_id: "existing", total_usd: exTotal, fact_id: exTotalF.fact_id }, ...alts.map((a: any) => ({ entity_id: a.id, total_usd: a.totalF.number_decimal, fact_id: a.totalF.fact_id, difference_vs_existing_usd: minus(a.totalF.number_decimal, [exTotal]) }))],
      suitability: [{ vehicle_class: input.vehicle_class, seats_needed: input.seats_needed, status: "unknown", notes: "Class and seating not confirmed by supplier" }],
      next_action: confirmNeeded ? "confirm_supplier" : "review_existing",
      supplier_confirmation_required: confirmNeeded,
    };
    run.gaps.push("Alternative availability is advertised only; supplier confirmation needed. No booking or reservation action is offered.");
    run.summary = `Simulated: existing ${exTotal}, alternative incl. transfer ${alts[0]?.totalF.number_decimal ?? "null"}; supplier confirmation required.`;
  }

  if (caseId === "UC04") {
    const w = lossWindowUtc(input.reported_local_time, input.timezone, Number(input.window_minutes ?? 0));
    if (!w.ok) {
      run.status = "blocked";
      run.error = w.reason;
      run.result = { assessment: "insufficient_evidence" };
      return run;
    }
    const lat = input.location?.latitude ?? null;
    const lon = input.location?.longitude ?? null;
    const evs = sb.observations.map((o: any) => {
      const id = short(o.source_ref);
      const isObs = o.type === "event_observation";
      const f = F({ fact_id: `f-${id}`, entity_id: id, attribute: isObs ? "event_observation_time" : "warning_time", origin: "simulated_fixture", evidence_type: o.type, value_text: o.event_time, effective_at: o.event_time, qualifiers: [isObs ? "observed event (fabricated)" : "warning — not an observation", o.latitude !== null ? "point location" : "no reported point"], citations: simCite(o.source_ref, `${o.type} at ${o.event_time}`) });
      const dist = distanceKm(lat, lon, o.latitude, o.longitude);
      const dF = dist !== null ? F({ fact_id: `calc-${id}-distance`, entity_id: id, attribute: "point_distance_km", origin: "calculation", evidence_type: "other", status: "simulated", number_decimal: dist, unit: "km", formula: "haversine(loss point, event point)", input_fact_ids: [f.fact_id] }) : null;
      const temporal = overlaps(o.event_time, w.start, w.end);
      return { id, o, isObs, f, dF, temporal };
    });
    run.facts = evs.flatMap((e: any) => [e.f, ...(e.dF ? [e.dF] : [])]);
    const corroborating = evs.some((e: any) => e.isObs && e.temporal === "overlap" && e.dF && dec(e.dF.number_decimal)!.lte(dec(input.radius_km) ?? 0));
    run.result = {
      loss_window_utc: { start: w.start, end: w.end },
      events: evs.map((e: any) => ({ entity_id: e.id, fact_ids: [e.f.fact_id], inclusion: e.isObs ? "included" : "excluded", reason: e.isObs ? "Fabricated observed event" : "Warning is not an observed event" })),
      geographic_matches: evs.map((e: any) => ({ event_id: e.id, method: e.dF ? "point distance" : "none — no reported point", distance_fact_id: e.dF?.fact_id ?? null, precision: e.dF ? "point" : "unknown" })),
      temporal_matches: evs.map((e: any) => ({ event_id: e.id, status: e.temporal, reason: `Event ${e.o.event_time} vs window ${w.start}–${w.end}` })),
      assessment: corroborating ? "corroborating" : "insufficient_evidence",
      source_coverage: [{ category: "weather", query_window: `${w.start}/${w.end}`, status: "not_searched", notes: "Fixture mode: fabricated sources only" }],
      vehicle_damage_proven: false,
      warning_is_observation: false,
    };
    run.gaps.push("Corroboration does not establish that a vehicle was damaged. No coverage, fraud, liability or claim clearance classification.");
    run.summary = `Simulated: ${corroborating ? "corroborating" : "insufficient"} — observation at 0 km within window; warning kept separate.`;
  }

  if (caseId === "UC05") {
    const pub = buildPublicContext("UC05", wrapper);
    const outbound = pub.ok ? pub.context : {};
    const canaryOut = containsCanary(outbound);
    run.trace.push(
      tr("mock-enterprise.initialize + tools/list", "SIMULATED walkthrough — no MCP connection opened.", null, { tools: MOCK_ENTERPRISE.tools.map((t: any) => t.name) }),
      tr("mock-enterprise.get_case_context", "SIMULATED; retained inside host", { case_id: "UC05" }, { internal_context: "[kept local]" }),
      tr("mock-enterprise.get_demo_rules", "SIMULATED", { case_id: "UC05" }, { rules: "simulated comparison rules" }),
      tr("local.public_context_filter", `Outbound fields: ${Object.keys(outbound).join(", ")}; canary outbound: ${canaryOut}`, outbound),
      ...PARALLEL_MCP.required_tools.filter((t: string) => t !== "web_decisions").map((t: string) => tr(`parallel.${t}`, "SIMULATED — not a live MCP call", outbound, { source_ref: "fixture://UC05/notice-A" })),
    );
    const notice = sb.observations[0];
    const nF = F({ fact_id: "f-notice-A", entity_id: "notice-A", attribute: "official_notice", origin: "simulated_fixture", evidence_type: "other", value_text: notice.text, citations: simCite(notice.source_ref, notice.text) });
    const iF = F({ fact_id: "m-internal-delay", entity_id: "internal", attribute: "reported_delay_days", origin: "mock_enterprise", evidence_type: "other", number_decimal: String(input.internal_context?.reported_delay_days ?? ""), unit: "days", citations: [{ source_ref: "mock://enterprise/UC05/context", url: null, excerpt: "Mock enterprise internal context (kept local)" }] });
    run.facts = [nF, iF];
    run.result = {
      outbound_preview: outbound,
      private_canary_outbound: canaryOut,
      internal_context_origin: "mock_enterprise",
      mcp_connections: { "mock-enterprise": "simulated", parallel: "simulated" },
      brief: {
        supported_facts: [{ text: notice.text, fact_ids: [nF.fact_id] }],
        hypotheses: [{ text: "Parts availability tied to a notice could contribute to repair delays (hypothesis only).", fact_ids: [] }],
        contradictions: [],
        open_questions: ["Does the shop confirm a parts backorder for these repairs?"],
        next_actions: ["Request direct shop confirmation", "Review the public notice source"],
      },
      delay_causation: "not_established",
      sources_origin: "simulated_fixture",
    };
    run.summary = "Simulated war-room brief. Delay causation not established.";
  }

  run.steps = ["Validate input", "Load fabricated storyboard", "Normalize facts", "Local calculations", "Render"].map((name) => ({ name, status: "done" as const }));
  return run;
}
