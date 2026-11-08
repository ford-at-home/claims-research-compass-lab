import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc02")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC02 Damage estimate verification — Claims Research Lab" },
      { name: "description", content: "Existing estimate sources first; research only a defined exception or independent benchmark." },
      { property: "og:title", content: "UC02 Damage estimate verification — Claims Research Lab" },
      { property: "og:description", content: "Existing estimate sources first; research only a defined exception or independent benchmark." },
    ],
  }),
  component: () => <CaseScreen caseId="UC02" />,
});
