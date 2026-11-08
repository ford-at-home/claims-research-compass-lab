import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc05")({
  head: () => ({
    meta: [
      { title: "UC05 War room research with MCP — Claims Research Lab" },
      { name: "description", content: "Cited outside brief across mock enterprise and Parallel MCP connections." },
      { property: "og:title", content: "UC05 War room research with MCP — Claims Research Lab" },
      { property: "og:description", content: "Cited outside brief across mock enterprise and Parallel MCP connections." },
    ],
  }),
  component: () => <CaseScreen caseId="UC05" />,
});
