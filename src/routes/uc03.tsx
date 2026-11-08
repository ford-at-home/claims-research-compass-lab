import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc03")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC03 Rental supplier integration baseline — Claims Research Lab" },
      { name: "description", content: "Authoritative supplier pricing with local insurer rules and repair timing. No ordinary Parallel calls." },
      { property: "og:title", content: "UC03 Rental supplier integration baseline — Claims Research Lab" },
      { property: "og:description", content: "Supplier evidence for reviewer decisions; simulated demo data and an unconfigured Live adapter." },
    ],
  }),
  component: () => <CaseScreen caseId="UC03" />,
});
