import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/claims/ui-bits";

const PROTOTYPE_URL = "https://lienloop-total-loss-desk.priorww.chatgpt.site";

export const Route = createFileRoute("/lienloop")({
  head: () => ({
    meta: [
      { title: "LienLoop — Claims Research Lab" },
      { name: "description", content: "Original private LienLoop prototype: scripted replay, six mock systems, synthetic documents, human approvals and an audit trail." },
      { property: "og:title", content: "LienLoop — Claims Research Lab" },
      { property: "og:description", content: "Open the original LienLoop prototype or load its optional embed. Private Site authorization remains required." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LienLoop,
});

function LienLoop() {
  const [loadPrototype, setLoadPrototype] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">LienLoop</h1>
        <div className="flex flex-wrap gap-2">
          <Chip tone="replay">Scripted replay</Chip>
          <Chip tone="sim">Synthetic systems</Chip>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The original total-loss desk prototype uses six mock MCP systems and synthetic documents, with human approvals,
          an audit trail and four failure scenarios. This is a linked prototype, not a native Claims Research Lab integration.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={PROTOTYPE_URL} target="_blank" rel="noopener noreferrer"><ExternalLink />Open prototype</a>
          </Button>
          {!loadPrototype && (
            <Button variant="outline" onClick={() => setLoadPrototype(true)}><Play />Load prototype</Button>
          )}
        </div>
      </header>
      <p className="text-sm text-muted-foreground">
        This private prototype may require ChatGPT sign-in. If embedding or sign-in is blocked, open it directly.
      </p>
      {loadPrototype && (
        <iframe
          src={PROTOTYPE_URL}
          title="Original LienLoop private prototype"
          className="h-[70dvh] min-h-96 w-full max-w-full rounded-md border bg-background"
          referrerPolicy="no-referrer"
        />
      )}
      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Original Site access is unchanged. Live Claude mode requires its own API key and remains untested;
        this page does not use the Parallel key. No authenticated prototype session has been verified here.
      </footer>
    </div>
  );
}