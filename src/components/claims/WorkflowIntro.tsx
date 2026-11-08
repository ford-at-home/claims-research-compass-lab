import { ArrowRight, Car, CircleDollarSign, ClipboardList, FileCheck2, MapPin, CalendarDays, Search, ShieldCheck, Network, LockKeyhole, BookOpen, CloudRain, Wrench, type LucideIcon } from "lucide-react";
import type { CaseId } from "@/lib/claims/types";

type Stage = { label: string; detail: string; icon: LucideIcon };
const WORKFLOWS: Record<CaseId, { description: string; dependency?: string; stages: Stage[] }> = {
  UC01: {
    description: "Produce separate evidence tables for pre-loss vehicle value and damaged salvage recovery. Distinguish asking prices, active bids, and completed sales.",
    dependency: "Access to documented completed auction transactions.",
    stages: [
      { label: "Vehicle & damage", detail: "Identity, condition, location", icon: Car },
      { label: "Market evidence", detail: "Pre-loss value · separate table", icon: Search },
      { label: "Salvage evidence", detail: "Asks ≠ bids ≠ completed sales", icon: CircleDollarSign },
      { label: "Cited comparison", detail: "Recovery, costs, evidence gaps", icon: FileCheck2 },
    ],
  },
  UC02: {
    description: "Check exact part fitment and pricing, comparable labor rates, and shop details. Return cited findings beside each estimate line.",
    dependency: "Reliable part identifiers and usable local rate sources.",
    stages: [
      { label: "Estimate lines", detail: "Parts, labor, shop details", icon: ClipboardList },
      { label: "Fitment & price", detail: "Exact identifiers and condition", icon: Wrench },
      { label: "Local labor", detail: "Comparable rates and costs", icon: MapPin },
      { label: "Line-by-line findings", detail: "Citations and unresolved items", icon: FileCheck2 },
    ],
  },
  UC03: {
    description: "Use pricing from the insurer’s existing rental supplier integration, combine it with local insurer rules and repair timing, and present evidence to the reviewer. Ordinary rental requests make zero Parallel calls.",
    dependency: "The real supplier contract is not supplied here. Pricing is confirmed as a capability; availability, reservation and extension fields remain unverified.",
    stages: [
      { label: "Supplier integration", detail: "Authoritative pricing · simulated here", icon: Car },
      { label: "Local insurer rules", detail: "Known limits only · no approval", icon: ShieldCheck },
      { label: "Repair timing", detail: "Requested days and repair context", icon: CalendarDays },
      { label: "Reviewer evidence", detail: "Unknowns stay visible · no reservation changes", icon: FileCheck2 },
    ],
  },
  UC04: {
    description: "Build an event timeline with official weather, closure, and incident evidence matched to the loss location and time.",
    dependency: "Source coverage, publication delay, and location precision.",
    stages: [
      { label: "Loss time & place", detail: "Time window and location precision", icon: MapPin },
      { label: "Official evidence", detail: "Weather, closures, incidents", icon: CloudRain },
      { label: "Match & sequence", detail: "Observations ≠ warnings", icon: CalendarDays },
      { label: "Event timeline", detail: "Citations, coverage, uncertainty", icon: FileCheck2 },
    ],
  },
  UC05: {
    description: "Connect Parallel alongside enterprise MCP tools and return briefs linking outside facts to internal research questions.",
    stages: [
      { label: "Internal question", detail: "Mock enterprise MCP context", icon: Network },
      { label: "Privacy filter", detail: "Only allowlisted public fields", icon: LockKeyhole },
      { label: "Outside research", detail: "Parallel MCP discovery and calls", icon: Search },
      { label: "Cited brief", detail: "Facts, hypotheses, open questions", icon: BookOpen },
    ],
  },
};

export function WorkflowIntro({ caseId }: { caseId: CaseId }) {
  const workflow = WORKFLOWS[caseId];
  return (
    <section aria-label="Workflow overview" className="border-y border-border py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-1 font-mono text-xs uppercase text-primary">Proposed first version</p>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground">{workflow.description}</p>
        </div>
        {workflow.dependency && <div className="border-l-2 border-border pl-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Main dependency</p>
          <p className="text-sm leading-relaxed">{workflow.dependency}</p>
        </div>}
      </div>
      <ol aria-label="Research workflow" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {workflow.stages.map(({ label, detail, icon: Icon }, index) => (
          <li key={label} className="relative flex min-w-0 items-start gap-3 xl:pr-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-accent text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <div className="mb-0.5 font-mono text-[10px] text-muted-foreground">0{index + 1}</div>
              <h2 className="text-sm font-semibold leading-snug">{label}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </div>
            {index < workflow.stages.length - 1 && <ArrowRight className="absolute -right-1 top-3 hidden h-4 w-4 text-muted-foreground xl:block" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}