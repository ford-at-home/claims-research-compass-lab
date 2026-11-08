import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc01")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC01 Salvage valuation — Claims Research Lab" },
      { name: "description", content: "Existing valuation and salvage outputs first; optional outside comparable questions." },
      { property: "og:title", content: "UC01 Salvage valuation — Claims Research Lab" },
      { property: "og:description", content: "Existing valuation and salvage outputs first; optional outside comparable questions." },
    ],
  }),
  component: () => <CaseScreen caseId="UC01" />,
});
