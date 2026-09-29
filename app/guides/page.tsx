import type { Metadata } from "next";
import { journeys } from "@/data/curated/journeys";
import { discoveredGuides } from "@/lib/discovered-guides";
import { GuideDirectory } from "@/components/GuideDirectory";
import { GUIDE_GROUPS, guideGroupForCategory } from "@/lib/guide-groups";

export const metadata: Metadata = { title: "Guides" };

export default function GuidesPage() {
  const all = [...journeys, ...discoveredGuides];
  const generatedCounts = discoveredGuides.reduce<Record<string, number>>((counts, guide) => {
    const group = guideGroupForCategory(guide.category);
    counts[group] = (counts[group] ?? 0) + 1;
    return counts;
  }, {});
  const samples = Object.fromEntries(GUIDE_GROUPS.map((group) => [group.id, all.filter((guide) => guideGroupForCategory(guide.category) === group.id).slice(0, 2).map((guide) => guide.title)]));
  return (
    <div className="page-shell shell">
      <header className="page-intro">
        <p className="eyebrow">{all.length.toLocaleString()} published government tasks</p>
        <h1>Start with what<br />you need to do.</h1>
        <p>Browse by life situation, then choose a concrete task. Every listed guide passes automated publication checks and links back to an official government source.</p>
      </header>
      <GuideDirectory guides={journeys} generatedCounts={generatedCounts} samples={samples} />
    </div>
  );
}
