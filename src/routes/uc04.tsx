import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc04")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC04 Loss verification — Claims Research Lab" },
      { name: "description", content: "Event timeline and geographic match evidence for a reported loss window." },
      { property: "og:title", content: "UC04 Loss verification — Claims Research Lab" },
      { property: "og:description", content: "Event timeline and geographic match evidence for a reported loss window." },
    ],
  }),
  component: () => <CaseScreen caseId="UC04" />,
});
