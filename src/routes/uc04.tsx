import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc04")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC04 Loss verification — Claims Research Lab" },
      { name: "description", content: "Existing weather and incident feeds first; optional precise missing corroboration." },
      { property: "og:title", content: "UC04 Loss verification — Claims Research Lab" },
      { property: "og:description", content: "Existing weather and incident feeds first; optional precise missing corroboration." },
    ],
  }),
  component: () => <CaseScreen caseId="UC04" />,
});
