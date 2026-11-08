import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc03")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC03 Rental extension research — Claims Research Lab" },
      { name: "description", content: "Dated rental quote scenarios with required fees and supplier confirmation gaps." },
      { property: "og:title", content: "UC03 Rental extension research — Claims Research Lab" },
      { property: "og:description", content: "Dated rental quote scenarios with required fees and supplier confirmation gaps." },
    ],
  }),
  component: () => <CaseScreen caseId="UC03" />,
});
