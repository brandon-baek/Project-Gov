import type { Metadata } from "next";
import { journeys } from "@/data/curated/journeys";
import { discoveredGuides } from "@/lib/discovered-guides";
import { GuideDirectory } from "@/components/GuideDirectory";

export const metadata: Metadata = { title: "Guides" };

export default function GuidesPage() {
  const categoryCounts = Object.entries(discoveredGuides.reduce<Record<string, number>>((counts, guide) => ({ ...counts, [guide.category]: (counts[guide.category] ?? 0) + 1 }), {}));
  return (
    <div className="page-shell shell">
      <header className="page-intro">
        <p className="eyebrow">{(journeys.length + discoveredGuides.length).toLocaleString()} government guides</p>
        <h1>Every known path,<br />in one place.</h1>
        <p>Browse outcomes you can complete with government. Reviewed guides include checked steps; discovered guides are official destinations surfaced automatically by the crawler and waiting for deeper review.</p>
      </header>
      <GuideDirectory reviewed={journeys} discoveredCount={discoveredGuides.length} categoryCounts={categoryCounts} />
    </div>
  );
}
