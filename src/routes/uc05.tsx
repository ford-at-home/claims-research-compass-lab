import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc05")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC05 War room research with MCP — Claims Research Lab" },
      { name: "description", content: "Enterprise HTTP MCP facts first; public connectivity documentation through an explicitly labeled Parallel Responses adaptation." },
      { property: "og:title", content: "UC05 War room research with MCP — Claims Research Lab" },
      { property: "og:description", content: "Enterprise HTTP MCP baseline with outside Responses evidence; Parallel MCP is unavailable on the saved connection." },
    ],
  }),
  component: () => <CaseScreen caseId="UC05" />,
});
