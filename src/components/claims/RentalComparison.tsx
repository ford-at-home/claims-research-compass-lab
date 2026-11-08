import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EvidenceFact, RunRecord } from "@/lib/claims/types";
import { Chip } from "./ui-bits";

export function RentalComparison({ run, onFact }: { run: RunRecord; onFact: (fact: EvidenceFact) => void }) {
  const baseline = run.result["baseline_snapshot"] as RunRecord | undefined;
  const pricing = baseline?.result["supplier_pricing"];
  const input = baseline?.input?.input;
  const window = baseline?.result["resolved_window"];
  const quotes = run.result["competitor_comparisons"] ?? [];
  const sim = run.mode === "fixture";
  const primarySim = sim || baseline?.result["baseline_source"] === "demo";
  const rows = [
    { supplier: input?.supplier_fixture?.supplier_identity ?? "Integrated supplier", baseline: true, comparable: true, branch_area: input ? `${input.location.zip} ${input.location.state}` : null, pickup_at: window?.pickup_at, return_at: window?.return_at, vehicle_class: input?.vehicle_class, seats: input?.seats_needed, days: input?.requested_days, daily_rate: pricing?.daily_all_in_usd, required_fees: null, total_usd: pricing?.total_usd, delta_vs_supplier_usd: "0.00", rate_basis: primarySim ? "SIMULATED supplier agreement · all-in" : "Supplier agreement · all-in", quoted_at: null, availability_basis: "Unknown — adapter capability unverified", mismatches: [] },
    ...quotes,
  ];
  return <section className="min-w-0 space-y-3 border-y py-4" aria-label="Competitor comparison">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">Public retail versus integrated supplier rate</h2>{sim && <Chip tone="sim">ALL NAMES & RATES SIMULATED</Chip>}</div>
    <div className="overflow-x-auto" tabIndex={0} aria-label="Rental quote comparison table">
      <Table className="min-w-[1050px] text-xs">
        <TableHeader><TableRow><TableHead>Supplier / status</TableHead><TableHead>Vehicle · dates · area</TableHead><TableHead>Daily rate / fees</TableHead><TableHead>Total / difference</TableHead><TableHead>Rate / quote basis</TableHead><TableHead>Evidence / availability</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((q, i) => {
          const evidence = q.baseline ? baseline?.facts.find((f) => f.fact_id === "f-supplier-daily") : run.facts.find((f) => f.entity_id === q.supplier);
          const rowSim = sim || (q.baseline && primarySim);
          return <TableRow key={`${q.supplier}-${i}`} className="align-top">
            <TableCell className="max-w-44 whitespace-normal"><Chip tone={rowSim ? "sim" : "live"}>{rowSim ? "SIMULATED" : "LIVE WEB"}</Chip><strong className="block mt-1">{rowSim && !q.supplier.toUpperCase().includes("SIMULATED") ? "SIMULATED " : ""}{q.supplier}</strong><div className="mt-1">{q.baseline ? "Integrated baseline" : q.comparable ? "Matched terms" : "Not comparable · Unranked / unknown"}</div></TableCell>
            <TableCell className="max-w-56 whitespace-normal"><div>{q.vehicle_class ?? "Unknown class"} · {q.seats ?? "Unknown"} seats · {q.days ?? "Unknown"} days</div><div className="mt-1 break-words">{q.pickup_at ?? "Unknown pickup"}<br />{q.return_at ?? "Unknown return"}</div><div className="mt-1">{q.branch_area ?? "Unknown area"}</div></TableCell>
            <TableCell className="whitespace-normal"><div>{rowSim ? "SIMULATED " : ""}{q.daily_rate ?? "Unknown"} USD/day{q.baseline ? " all-in" : " base"}</div><div className="mt-1">Mandatory fees: {q.baseline ? "Included; breakdown unknown" : `${q.required_fees ?? "Unknown"} USD`}</div></TableCell>
            <TableCell className="whitespace-normal"><strong>{rowSim ? "SIMULATED " : ""}{q.total_usd ?? "Unknown"} USD</strong><div className="mt-1">{primarySim ? "Demo difference" : "Difference"}: {q.delta_vs_supplier_usd ?? "Unknown"} USD{q.delta_vs_supplier_percent ? ` (${q.delta_vs_supplier_percent}%)` : ""}</div>{!q.baseline && q.comparable && <div className="mt-1 font-mono">{q.daily_rate} × {q.days} + {q.required_fees} = {q.total_usd}</div>}</TableCell>
            <TableCell className="max-w-44 whitespace-normal"><div className="break-words">{q.rate_basis ?? "Unknown rate basis"}</div><div className="mt-1 break-words">Quote time: {q.quoted_at ?? "Unknown — not supplied"}</div>{q.baseline && <div className="mt-1 break-words">Recorded: {baseline?.created_at}</div>}</TableCell>
            <TableCell className="max-w-48 whitespace-normal"><div>{q.availability_basis ?? "Unknown availability"}</div>{evidence && <Button size="sm" variant="link" className="h-auto px-0 py-1 text-xs" onClick={() => onFact(evidence)}>Open {sim ? "simulated " : ""}evidence</Button>}{q.mismatches?.length > 0 && <details className="mt-1 text-muted-foreground"><summary className="cursor-pointer">Unknown / unmatched terms ({q.mismatches.length})</summary><p className="mt-1">{q.mismatches.join("; ")}</p></details>}</TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
    </div>
    <p className="text-xs text-muted-foreground">{primarySim ? "Fabricated baseline: differences are demonstration arithmetic, not real supplier savings or a real insurer quote. " : ""}Public retail and supplier agreement rates are different bases. Advertised availability is not confirmed inventory.</p>
    <div className="border-t pt-3" aria-label="Separate switching scenario"><h3 className="text-xs font-semibold">Separate switching scenario{sim ? " · SIMULATED" : ""}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{quotes.map((q: any) => <div key={q.supplier} className="text-xs"><strong>{q.supplier}</strong><div>Base {q.total_usd ?? "unknown"} + transfer {q.separate_switching_scenario.switching_cost_usd ?? "unknown"} = {q.separate_switching_scenario.total_including_switching_usd ?? "unknown"} USD</div></div>)}</div></div>
  </section>;
}