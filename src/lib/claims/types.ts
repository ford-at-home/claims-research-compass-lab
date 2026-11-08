export type CaseId = "UC01" | "UC02" | "UC03" | "UC04" | "UC05";
export type Mode = "fixture" | "live" | "replay";
export type Origin = "live_web" | "licensed_source" | "mock_enterprise" | "simulated_fixture" | "calculation";

export interface Citation {
  source_ref: string;
  url: string | null;
  excerpt: string;
}

/** Mirrors schemas/evidence_fact.schema.json */
export interface EvidenceFact {
  fact_id: string;
  entity_id: string;
  attribute: string;
  origin: Origin;
  value_text: string | null;
  number_decimal: string | null;
  unit: string | null;
  currency: string | null;
  evidence_type: string;
  status: "candidate" | "supported" | "conflicting" | "insufficient" | "blocked" | "stale" | "simulated";
  citations: Citation[];
  retrieved_at: string;
  effective_at: string | null;
  published_at: string | null;
  source_observed_at: string | null;
  qualifiers: string[];
  provider_basis_paths: string[];
  vendor_confidence: string | null;
  formula: string | null;
  input_fact_ids: string[];
}

export interface TraceEntry {
  at: string;
  op: string;
  transport: "none" | "http" | "mcp-http" | "simulated";
  status: "ok" | "error" | "skipped" | "simulated";
  request?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  response?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  note?: string;
}

export interface CoverageEntry {
  category: string;
  status: "searched" | "blocked" | "not_available" | "not_searched" | "simulated";
  notes: string;
}

export interface Step {
  name: string;
  status: "pending" | "done" | "error" | "skipped";
}

export interface RunRecord {
  run_id: string;
  case_id: CaseId;
  mode: Mode;
  label: string;
  status: "completed" | "running" | "error" | "submission_unknown" | "blocked";
  input: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  input_hash: string;
  created_at: string;
  captured_at: string | null;
  steps: Step[];
  facts: EvidenceFact[];
  result: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  gaps: string[];
  coverage: CoverageEntry[];
  trace: TraceEntry[];
  provider_ids: Record<string, string>;
  calls: { search: number; extract_urls: number; task: number; decisions: number; mcp: number };
  error: string | null;
  summary: string | null;
}

export const MODE_LABEL: Record<Mode, string> = {
  fixture: "Simulated scenario and evidence",
  live: "Live research with simulated claim input",
  replay: "Recorded live research and capture date",
};

export const CASES: { id: CaseId; slug: string; title: string; short: string; visible: string }[] = [
  { id: "UC01", slug: "uc01", title: "Salvage valuation", short: "Salvage", visible: "Separate vehicle value and damaged recovery evidence" },
  { id: "UC02", slug: "uc02", title: "Damage estimate verification", short: "Damage estimate", visible: "Line by line fitment and price findings" },
  { id: "UC03", slug: "uc03", title: "Rental extension research", short: "Rental extension", visible: "Dated quote scenarios and confirmation gaps" },
  { id: "UC04", slug: "uc04", title: "Loss verification", short: "Loss verification", visible: "Event timeline and geographic match evidence" },
  { id: "UC05", slug: "uc05", title: "War room research with MCP", short: "War room (MCP)", visible: "Cited brief and trace across two MCP servers" },
];

export const PROJECT_TITLE = "Generic Parallel Web Systems Claims Engineering Use Cases";
