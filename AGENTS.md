<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Preserve exact user-authorized revision bytes under `specifications/parallel-claims/` and verify them through `SOURCE_REVISION_MANIFEST.json`; retain the original failed import manifest as history, because revision verification does not resolve the original archive mismatch.
- Parallel API calls and the API key stay in server-only modules (`*.server.ts`, server function handlers); the key is never returned, logged or exported.
- Live research server functions require `requireSupabaseAuth`; runs are stored in `research_runs` owned by the user (RLS), so visitors cannot spend credits.
- Fixture, Live and Replay are separate code paths; Replay only renders stored completed live runs, never fixture data.
- Task runs are created once and resumed by stored `task_run_id`; no automatic resubmission.
- Money and distances use `decimal.js` helpers in `src/lib/claims/calc.ts`; unknown components return null.
- Shared workflow introductions live in a presentation-only component keyed by CaseId; proposed process diagrams never imply a live connection or completed research.
- All primary runs use baseline adapters before any research configuration; external server actions verify owned stored baseline, matching input hash and an explicit unanswered question. Rental competitor benchmarking is separate from supplier pricing and switching scenarios.
- Canonical prompts and fixture amounts feed host adapters without editing source bytes; rental structured Task output requires validated benchmark purpose and comparison terms, because generic findings cannot express quote comparability safely.
- Rental comparison presentation is isolated from dispatch and uses runtime-only additional fixture rows, so canonical source integrity and zero-call primary behavior remain unchanged.
- Live demo baselines are explicit owned setup records with source/hash gates and simulated origins; mock enterprise uses authenticated HTTP MCP, so generic outside demos need no insurer credential and cannot become an outage fallback.
- Use explicit gateway-compatible per-item Tasks and Responses when Groups/Places/Decisions/Parallel MCP are unavailable; never send a gateway connection key directly to Parallel, and label protocol adaptations truthfully.
- Persist selected child submission state before each POST and real IDs immediately afterward; follow-ups verify the owned parent baseline/source/hash/public context to prevent duplicate spending and cross-user state access.
