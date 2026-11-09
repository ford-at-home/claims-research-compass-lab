import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireOperator } from "@/lienloop/access";
import { LienLoopApp } from "@/lienloop/LienLoopApp";
import lienloopCss from "@/lienloop/lienloop.css?url";
import cloudCss from "@/lienloop/cloud.css?url";

const FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&display=swap";

// LienLoop keeps its original access model: every desk view requires a server-validated sign-in
// (see src/lienloop/ROADMAP.md, "Access protection"). It renders full screen with its own shell;
// __root.tsx skips the Lab sidebar for this path.
export const Route = createFileRoute("/lienloop")({
  ssr: false,
  beforeLoad: async () => ({ user: await requireOperator(() => supabase.auth.getUser()) }),
  head: () => ({
    meta: [
      { title: "LienLoop · Settle a car loan after a total loss" },
      {
        name: "description",
        content:
          "A fictional car-loan settlement demo: review insurance payments, cover the unpaid balance and approve removal of the lender’s lien.",
      },
      { property: "og:title", content: "LienLoop · Settle a car loan after a total loss" },
      {
        property: "og:description",
        content:
          "Review a fictional case where insurance pays less than the loan balance. Check the documents, payments and approvals before releasing the lien.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LienLoopPage,
});

// LienLoop's stylesheet sets global element rules (:root, body, h1, button, a). Route head links
// stay in the document after client-side navigation, which restyled Lab pages, so the sheets are
// attached on mount and removed on unmount instead.
function LienLoopPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const links = [FONTS, lienloopCss, cloudCss].map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      return link;
    });
    let live = true;
    void Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve) => {
            link.onload = () => resolve();
            link.onerror = () => resolve();
          }),
      ),
    ).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
      links.forEach((link) => link.remove());
    };
  }, []);
  return ready ? <LienLoopApp /> : null;
}
