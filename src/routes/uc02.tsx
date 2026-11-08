import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc02")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC02 Damage estimate verification — Claims Research Lab" },
      { name: "description", content: "Line-by-line part fitment, condition and full-cost comparison with evidence." },
      { property: "og:title", content: "UC02 Damage estimate verification — Claims Research Lab" },
      { property: "og:description", content: "Line-by-line part fitment, condition and full-cost comparison with evidence." },
    ],
  }),
  component: () => <CaseScreen caseId="UC02" />,
});
