import type { Metadata } from "next";
import Link from "next/link";
import { journeys } from "@/data/curated/journeys";
import { ArrowIcon } from "@/components/icons";
import { IndexedAgencyCatalog } from "@/components/IndexedAgencyCatalog";
import { getIndexedAgencyTotals } from "@/lib/database";
import { getPathwayDiscovery } from "@/lib/pathway-discovery";
import { PathwayDiscovery } from "@/components/PathwayDiscovery";

export const metadata: Metadata = { title: "Guides" };

export default function GuidesPage() {
  const categories = [...new Set(journeys.map((journey) => journey.category))].sort();
  const indexedTotals = getIndexedAgencyTotals();
  const pathwayDiscovery = getPathwayDiscovery(journeys);
  return (
    <div className="page-shell shell">
      <header className="page-intro">
        <p className="eyebrow">Explore government by situation</p>
        <h1>Find a path through government.</h1>
        <p>Browse life situations below. Reviewed routes show their source basis; potential routes link to official pages surfaced by the crawler so you can discover a relevant service even when you don’t know what to search for.</p>
      </header>
      <PathwayDiscovery groups={pathwayDiscovery} />
      <section className="reviewed-guide-section" aria-labelledby="reviewed-guide-heading">
        <header className="section-heading"><div><p className="section-label">Reviewed step-by-step paths</p><h2 id="reviewed-guide-heading">Guides ready to follow</h2></div><p>Each route is here because every step is tied to at least one official source and has a recorded review date.</p></header>
      <div className="guide-groups">
        {categories.map((category) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="guide-rows">
              {journeys.filter((journey) => journey.category === category).map((journey) => (
                <Link href={`/guides/${journey.slug}`} key={journey.id}>
                  <div><h3>{journey.title}</h3><p>{journey.summary}</p><small className="guide-evidence">{journey.sources.length} cited official {journey.sources.length === 1 ? "source" : "sources"} · last reviewed {journey.reviewedAt}</small></div>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      </section>
      <IndexedAgencyCatalog initialTotal={indexedTotals.total} />
    </div>
  );
}
