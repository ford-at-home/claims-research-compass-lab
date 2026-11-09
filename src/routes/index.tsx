import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getServerConfig } from "@/lib/claims/research.functions";
import { CASES, PROJECT_TITLE } from "@/lib/claims/types";
import { ACCEPTANCE } from "@/lib/claims/spec";
import { Chip } from "@/components/claims/ui-bits";
import { CAPABILITIES } from '@/lib/claims/capability-upgrade';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Claims Research Lab — Generic Parallel Web Systems Claims Engineering Use Cases" },
      { name: "description", content: "Five evidence-first claims research demos with explicit Fixture, Live and Replay modes, plus the LienLoop total-loss desk." },
      { property: "og:title", content: "Claims Research Lab" },
      { property: "og:description", content: "Generic Parallel Web Systems Claims Engineering Use Cases — five research workflows and the LienLoop total-loss desk." },
    ],
  }),
  component: Index,
});

function Index() {
  const cfgFn = useServerFn(getServerConfig);
  const cfg = useQuery({ queryKey: ["server-config"], queryFn: () => cfgFn() });
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <div className="font-mono text-xs text-primary">About</div>
        <h1 className="text-2xl font-semibold md:text-3xl">{PROJECT_TITLE}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Existing capabilities first; outside evidence only for precise extra questions. These are candidate experiments, not verified insurer deficiencies. All claim inputs are hypothetical; no insurer data or branding.
          Research is kept separate from settlement, coverage, approval, booking and messaging decisions.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c) => (
          <Link key={c.id} to={`/${c.slug}` as "/uc01"} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary">
            <div className="font-mono text-xs text-primary">{c.id}</div>
            <div className="font-semibold">{c.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.visible}</div>
            <div className="mt-2 text-xs text-primary">{CAPABILITIES[c.id]}</div>
          </Link>
        ))}
        <Link to="/lienloop" className="rounded-lg border bg-card p-4 transition-colors hover:border-primary">
          <div className="font-mono text-xs text-primary">UC06</div>
          <div className="font-semibold">LienLoop total-loss desk</div>
          <div className="mt-1 text-sm text-muted-foreground">Settle a fictional car loan after a total loss: six mock systems, human approvals and an audit trail. Sign-in required.</div>
          <div className="mt-2 flex flex-wrap gap-2"><Chip tone="replay">Scripted replay</Chip><Chip tone="sim">Synthetic systems</Chip></div>
        </Link>
      </div>
      <section className="border-y py-4 text-sm"><h2 className="font-semibold">Connection capability boundaries</h2><p className="mt-2">Selected-item Tasks and interactive Responses use the saved connection. Task Groups, Place Search, Decisions and Parallel MCP are not exposed by this connection; compatible HTTP adaptations are explicitly labeled, never presented as those APIs. Monitor bodies are previews only.</p><p className="mt-2 text-muted-foreground">FindAll, Memory and licensed data connectors are optional future extensions, not assumed insurer capabilities. No earlier Python-session captures have been imported.</p></section>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Modes</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Chip tone="sim">Fixture</Chip> Fabricated storyboard; zero provider calls.</li>
            <li><Chip tone="live">Live</Chip> Existing adapters first; separate optional research for signed-in users.</li>
            <li><Chip tone="replay">Replay</Chip> Only genuine previously captured live runs, with capture time.</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">No mode switches automatically. {ACCEPTANCE.length} acceptance cases ship with the specification package.</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Server configuration (redacted)</h2>
          {cfg.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Checking…</p>
          ) : cfg.error ? (
            <p className="mt-2 text-sm text-bad-foreground">Status unavailable.</p>
          ) : (
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
              <dt>PARALLEL_API_KEY</dt>
              <dd><Chip tone={cfg.data?.parallel_api_key === "configured" ? "ok" : "bad"}>{cfg.data?.parallel_api_key}</Chip></dd>
              <dt>Mock enterprise MCP token</dt>
              <dd><Chip tone={cfg.data?.mock_enterprise_mcp_token === "configured" ? "ok" : "bad"}>{cfg.data?.mock_enterprise_mcp_token}</Chip></dd>
              <dt>Task processor</dt>
              <dd className="font-mono text-xs">{cfg.data?.task_processor}</dd>
              <dt>Caps (search / extract / task / MCP)</dt>
              <dd className="font-mono text-xs">{cfg.data?.limits.maxSearchRequests} / {cfg.data?.limits.maxExtractUrls} / {cfg.data?.limits.maxTaskCreates} / {cfg.data?.limits.maxMcpToolCalls}</dd>
            </dl>
          )}
          {cfg.data?.parallel_api_key === "missing" && (
            <p className="mt-3 text-xs text-muted-foreground">Live mode shows a server-configuration error until the key is added as a server secret. Fixture mode is fully usable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
