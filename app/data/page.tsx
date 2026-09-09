import type { Metadata } from "next";
import { govGraph } from "@/lib/graph";
import { journeys } from "@/data/curated/journeys";

export const metadata: Metadata = { title: "Data and sourcing" };

export default function DataPage() {
  const agencies = govGraph.nodes.filter((node) => node.kind === "agency").length;
  const sources = govGraph.nodes.filter((node) => node.kind === "source").length;
  return (
    <div className="page-shell shell article-page">
      <header className="page-intro"><p className="eyebrow">Data and sourcing</p><h1>Every step needs evidence.</h1><p>The ingestion system can index broadly. Publication into a trusted pathway stays deliberately strict.</p></header>
      <div className="data-totals" aria-label="Current graph totals"><div><strong>{journeys.length}</strong><span>reviewed journeys</span></div><div><strong>{sources}</strong><span>official source pages</span></div><div><strong>{agencies}</strong><span>publishers and services</span></div></div>
      <section><h2>Two lanes, one graph</h2><p>Machine-indexed records from USA.gov, SAM.gov, Grants.gov, and public government catalogs enter a review queue. They are searchable as discovery material but cannot become an actionable guide until their source, wording, and links are checked.</p></section>
      <section><h2>Freshness</h2><p>Automated jobs revisit source pages twice a month, store content hashes and response metadata, and flag changed or unreachable sources. A changed source becomes review-due; the system does not silently rewrite a published guide.</p></section>
      <section><h2>AI boundary</h2><p>The optional model can classify a request against a short list of existing journey IDs. It cannot create a journey ID or supply a factual answer. The final route is assembled by graph traversal from reviewed nodes.</p></section>
      <section><h2>Coverage is not completeness</h2><p>Government is too large and changeable for any crawler to promise complete coverage. GovGuide reports its supported pathways plainly, respects crawl rules and rate limits, and links to USA.gov search when no reviewed route exists.</p></section>
    </div>
  );
}
