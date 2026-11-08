import { createFileRoute } from "@tanstack/react-router";
import { CaseScreen } from "@/components/claims/CaseScreen";

export const Route = createFileRoute("/uc03")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "UC03 Rental competitor rate benchmark — Claims Research Lab" },
      { name: "description", content: "Compare matched competitor rental quotes with the integrated supplier baseline; ordinary supplier runs make zero Parallel calls." },
      { property: "og:title", content: "UC03 Rental competitor rate benchmark — Claims Research Lab" },
      { property: "og:description", content: "Supplier agreement versus public retail quotes, matched terms, evidence and separate switching scenarios. Fixture data is simulated; Live adapters remain unconfigured." },
      { property: "og:url", content: "https://claims-research-compass-lab.lovable.app/uc03" },
    ],
    links: [{ rel: "canonical", href: "https://claims-research-compass-lab.lovable.app/uc03" }],
  }),
  component: () => <CaseScreen caseId="UC03" />,
});
