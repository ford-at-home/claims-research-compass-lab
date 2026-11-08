import { ArrowRight, Car, CircleDollarSign, ClipboardList, FileCheck2, MapPin, CalendarDays, Search, ShieldCheck, Network, LockKeyhole, BookOpen, CloudRain, Wrench, type LucideIcon } from "lucide-react";
import type { CaseId } from "@/lib/claims/types";
import { CAPABILITIES } from '@/lib/claims/capability-upgrade';

type Stage = { label: string; detail: string; icon: LucideIcon };
const DESCRIPTIONS: Record<CaseId, string> = {
  UC01: "Existing valuation and salvage outputs remain primary. Test outside comparables only for a documented missing question or specifically requested market benchmark; keep asks, bids and completed sales distinct.",
  UC02: "Existing estimating, parts, labor and repair sources remain primary. Investigate a defined unresolved exception or requested independent benchmark, not routine estimate approval or rate lookup.",
  UC03: "Existing supplier integration provides authoritative pricing. Optionally benchmark different suppliers in the same area with matched dates, duration, class, seating, currency and fees. Keep public retail and contracted rate bases distinct; switching costs are separate.",
  UC04: "Existing catastrophe, weather and incident feeds come first. Ask for only a precise missing corroboration question or public source outside that coverage, not routine loss verification.",
  UC05: "Enterprise tools provide internal facts first. Research only a genuinely external evidence question and join it locally; public research does not reconstruct internal company data.",
};
const BASELINE_LABELS: Record<CaseId, string> = { UC01: "Valuation & salvage", UC02: "Estimating & repair", UC03: "Supplier pricing", UC04: "Weather & incidents", UC05: "Enterprise tools" };

export function WorkflowIntro({ caseId }: { caseId: CaseId }) {
  const workflow = { description: DESCRIPTIONS[caseId], dependency: caseId === "UC03" ? "Supplier integration/pricing is confirmed. Actual interface contract is not supplied; other capabilities remain unverified." : "Actual vendor names, adapter contracts and coverage are unverified here; missing setup is not a claimed business gap.", stages: [
    { label: BASELINE_LABELS[caseId], detail: "Existing baseline · simulated here", icon: ShieldCheck },
    { label: "Coverage check", detail: "Answered already? Stop; zero Parallel calls", icon: FileCheck2 },
    { label: caseId === "UC03" ? "Competitor benchmark" : "Precise extra question", detail: "Optional, explicit action only", icon: Search },
    { label: "Incremental evidence", detail: "Supported additions, coverage and reviewer effort", icon: BookOpen },
  ] };
  return (
    <section aria-label="Workflow overview" className="border-y border-border py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-1 font-mono text-xs uppercase text-primary">Baseline first · candidate experiment</p>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground">{workflow.description}</p>
          <p className="mt-2 text-xs text-primary">{CAPABILITIES[caseId]}</p>
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