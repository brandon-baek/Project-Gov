import type { Metadata } from "next";
import Link from "next/link";
import { journeys } from "@/data/curated/journeys";
import { ArrowIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Guides" };

export default function GuidesPage() {
  const categories = [...new Set(journeys.map((journey) => journey.category))].sort();
  return (
    <div className="page-shell shell">
      <header className="page-intro">
        <p className="eyebrow">Verified pathways</p>
        <h1>Government guides</h1>
        <p>Each guide has an ordered route, a review date, and direct links to the agency responsible.</p>
      </header>
      <div className="guide-groups">
        {categories.map((category) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="guide-rows">
              {journeys.filter((journey) => journey.category === category).map((journey) => (
                <Link href={`/guides/${journey.slug}`} key={journey.id}>
                  <div><h3>{journey.title}</h3><p>{journey.summary}</p></div>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
