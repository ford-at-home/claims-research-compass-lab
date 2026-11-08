import { cn } from "@/lib/utils";
import type { Origin } from "@/lib/claims/types";

const TONE = {
  sim: "bg-sim text-sim-foreground",
  live: "bg-live text-live-foreground",
  replay: "bg-replay text-replay-foreground",
  ok: "bg-ok text-ok-foreground",
  warn: "bg-warn text-warn-foreground",
  bad: "bg-bad text-bad-foreground",
  muted: "bg-muted text-muted-foreground",
} as const;
export type Tone = keyof typeof TONE;

export function Chip({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", TONE[tone], className)}>{children}</span>;
}

export function originTone(o: Origin): Tone {
  return o === "simulated_fixture" ? "sim" : o === "live_web" || o === "licensed_source" ? "live" : o === "calculation" ? "replay" : "warn";
}
export const ORIGIN_LABEL: Record<Origin, string> = {
  simulated_fixture: "Simulated",
  live_web: "Live web",
  licensed_source: "Licensed",
  mock_enterprise: "Mock enterprise",
  calculation: "Calculation",
};

export function statusTone(s: string): Tone {
  if (/simulated/.test(s)) return "sim";
  if (/supported|completed|ok|done|connected|overlap|corroborating|exact_supported|included|research_only/.test(s)) return "ok";
  if (/insufficient|needs|candidate|review|confirm|running|unknown|area/.test(s)) return "warn";
  if (/error|blocked|mismatch|excluded|conflict|not connected|no_overlap/.test(s)) return "bad";
  return "muted";
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <pre className={cn("max-h-96 overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-all", className)}>{children}</pre>;
}
