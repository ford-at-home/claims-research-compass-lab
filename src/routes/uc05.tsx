import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc05")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC05 War room research with MCP — Claims Research Lab" },
      { name: "description", content: "Enterprise facts first; optional genuinely external evidence through MCP." },
      { property: "og:title", content: "UC05 War room research with MCP — Claims Research Lab" },
      { property: "og:description", content: "Enterprise facts first; optional genuinely external evidence through MCP." },
    ],
  }),
  component: () => <CaseScreen caseId="UC05" />,
});
