import type { CaseId } from './types';

export const CAPABILITIES: Record<CaseId, string> = {
  UC01: 'Selected-item Tasks · Task Groups unavailable on this connection',
  UC02: 'Selected-line Tasks · Task Groups unavailable on this connection',
  UC03: 'Search branch candidates + interactive Responses · Place Search unavailable',
  UC04: 'Interactive Responses evidence scope · Decisions unavailable · Monitor preview only',
  UC05: 'Enterprise HTTP MCP + Parallel Responses · Parallel MCP unavailable on this connection',
};
export const ITEMS = {
  UC01: [
    { id: 'auction-status', question: 'What do official Copart auction sale-status labels mean, and what access limitations prevent verifying a completed sale? Do not claim a realized sale or VIN history.' },
    { id: 'sale-access', question: 'What official IAA documentation distinguishes current bids from completed sale records and restricts access to sold records? Unavailable realized prices stay unknown.' },
  ],
  UC02: [
    { id: 'bumper-guidance', question: 'Find public Toyota bumper repair and ADAS guidance, retaining publication date and applicability. General guidance is not VIN fitment, labor hours or approval.' },
    { id: 'calibration-applicability', question: 'Find public Toyota ADAS calibration applicability after bumper work. Preserve model/year qualifiers and unknown applicability; do not determine VIN fitment or approve an estimate.' },
  ],
};
export const EXAMPLES: Record<CaseId, string> = {
  UC01: ITEMS.UC01[0]?.question ?? '', UC02: ITEMS.UC02[0]?.question ?? '',
  UC03: 'Find other passenger-car rental branches and retrievable dated public quotes matching the supplied rental terms. Unknown fees or inventory remain unknown.',
  UC04: 'What does official NOAA storm-archive publication lag mean for same-day completeness? Missing publication does not establish absence of an event.',
  UC05: 'What do current public MCP Streamable HTTP initialization and tool-discovery documents require? Public facts do not establish the simulated internal connectivity root cause.',
};
export function selectedItems(caseId: 'UC01' | 'UC02', ids: string[]) {
  if (!ids.length || ids.length > 2 || new Set(ids).size !== ids.length) throw new Error('Select one or two distinct unresolved items.');
  return ids.map(id => { const item = ITEMS[caseId].find(x => x.id === id); if (!item) throw new Error('Unknown or routine item cannot be researched.'); return item; });
}

/* Preserve Responses annotations as annotations, never invent excerpt proof. */
export function parseResponses(raw: any) {
  const output = Array.isArray(raw?.output) ? raw.output : [];
  const parts = output.filter((x: any) => x.type === 'message').flatMap((x: any) => x.content ?? []).filter((x: any) => x.type === 'output_text');
  const text = parts.map((x: any) => x.text ?? '').join('\n');
  let structured: any = null;
  try { structured = JSON.parse(text); } catch { /* narrative response */ }
  return { id: typeof raw?.id === 'string' ? raw.id : null, text, structured,
    annotations: parts.flatMap((x: any) => x.annotations ?? []),
    research_trail: output.filter((x: any) => ['web_search_call', 'mcp_call'].includes(x.type)),
    refusal: output.flatMap((x: any) => x.content ?? []).filter((x: any) => x.type === 'refusal'), raw };
}
export function monitorPreview(question: string, completedTaskId?: string) {
  return { preview_only: true, method: 'POST', path: '/v1/monitors', body: completedTaskId
    ? { type: 'snapshot', frequency: '1d', processor: 'lite', settings: { task_run_id: completedTaskId } }
    : { type: 'event_stream', frequency: '1d', processor: 'lite', settings: { query: question, include_backfill: false } } };
}
export const lateRecordDiff = { origin: 'SIMULATED', before: { publication: null, completeness: 'unknown' }, after: { publication: 'SIMULATED later correction', completeness: 'unknown' }, changed: ['publication'], decision: 'No loss, coverage or fraud conclusion' };