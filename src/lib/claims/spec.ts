// Loads the imported, unchanged specification package as actual JSON values.
import uc01 from "../../../specifications/parallel-claims/fixtures/UC01_salvage_valuation.input.json";
import uc02 from "../../../specifications/parallel-claims/fixtures/UC02_damage_estimates.input.json";
import uc03 from "../../../specifications/parallel-claims/fixtures/UC03_rental_extensions.input.json";
import uc04 from "../../../specifications/parallel-claims/fixtures/UC04_loss_verification.input.json";
import uc05 from "../../../specifications/parallel-claims/fixtures/UC05_war_room_research.input.json";
import storyboards from "../../../specifications/parallel-claims/fixtures/offline_storyboards.json";
import acceptance from "../../../specifications/parallel-claims/contracts/acceptance_cases.json";
import mockEnterprise from "../../../specifications/parallel-claims/contracts/mock_enterprise_mcp.json";
import parallelMcp from "../../../specifications/parallel-claims/contracts/parallel_mcp.json";
import sourcePolicy from "../../../specifications/parallel-claims/contracts/source_policy.json";
import s1 from "../../../specifications/parallel-claims/requests/UC01_search.json";
import s2 from "../../../specifications/parallel-claims/requests/UC02_search.json";
import s3 from "../../../specifications/parallel-claims/requests/UC03_search.json";
import s4 from "../../../specifications/parallel-claims/requests/UC04_search.json";
import s5 from "../../../specifications/parallel-claims/requests/UC05_search.json";
import t1 from "../../../specifications/parallel-claims/requests/UC01_task.template.json";
import t2 from "../../../specifications/parallel-claims/requests/UC02_task.template.json";
import t3 from "../../../specifications/parallel-claims/requests/UC03_task.template.json";
import t4 from "../../../specifications/parallel-claims/requests/UC04_task.template.json";
import t5 from "../../../specifications/parallel-claims/requests/UC05_task.template.json";
import extractTemplate from "../../../specifications/parallel-claims/requests/extract.template.json";
import taskOutputSchema from "../../../specifications/parallel-claims/schemas/parallel_task_output.schema.json";
import type { CaseId } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const FIXTURE_INPUTS: Record<CaseId, any> = { UC01: uc01, UC02: uc02, UC03: uc03, UC04: uc04, UC05: uc05 };
export const STORYBOARDS: any = storyboards;
export const ACCEPTANCE: any[] = acceptance as any[];
export const MOCK_ENTERPRISE: any = mockEnterprise;
export const PARALLEL_MCP: any = parallelMcp;
export const SOURCE_POLICY: any = sourcePolicy;
export const SEARCH_TEMPLATES: Record<CaseId, any> = { UC01: s1, UC02: s2, UC03: s3, UC04: s4, UC05: s5 };
export const TASK_TEMPLATES: Record<CaseId, any> = { UC01: t1, UC02: t2, UC03: t3, UC04: t4, UC05: t5 };
export const EXTRACT_TEMPLATE: any = extractTemplate;
export const TASK_OUTPUT_SCHEMA: any = taskOutputSchema;

export const LIMITS = {
  maxSearchRequests: 4,
  maxExtractUrls: 8,
  maxTaskCreates: 1,
  maxDecisions: 1,
  maxMcpToolCalls: 8,
  httpTimeoutMs: 30_000,
  pollIntervalMs: 2_000,
  resultWaitSeconds: 1,
  localWaitMs: 600_000,
  maxReadRetries: 2,
};
