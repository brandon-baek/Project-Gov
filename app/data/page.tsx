import type { Metadata } from "next";
import { govGraph } from "@/lib/graph";
import { journeys } from "@/data/curated/journeys";
import { discoveredGuides } from "@/lib/discovered-guides";

export const metadata: Metadata = { title: "Data and sourcing" };

export default function DataPage() {
  const agencies = govGraph.nodes.filter((node) => node.kind === "agency").length;
  const sources = govGraph.nodes.filter((node) => node.kind === "source").length;
  return (
    <div className="page-shell shell article-page">
      <header className="page-intro"><p className="eyebrow">Data and sourcing</p><h1>Every guide shows<br />what supports it.</h1><p>The same generated pathway catalog powers browsing, guidance matching, permanent guide pages, and the knowledge graph.</p></header>
      <div className="data-totals" aria-label="Current graph totals"><div><strong>{journeys.length + discoveredGuides.length}</strong><span>total government guides</span></div><div><strong>{sources}</strong><span>official source pages</span></div><div><strong>{agencies}</strong><span>publishers and services</span></div></div>
      <section><h2>Two guide levels</h2><p>{journeys.length} reviewed guides contain ordered steps checked against official sources. {discoveredGuides.length} discovered guides expose official outcomes and destinations immediately while their detailed instructions await review.</p></section>
      <section><h2>Autonomous expansion</h2><p>Twice-monthly jobs advance through federal and state site inventories, preserve earlier discoveries, rank action-oriented pages, generate guide records and graph links, build the site, and publish the new snapshot when every gate passes.</p></section>
      <section><h2>Search-quality gate</h2><p>Every discovered path is browsable. Thin or administrative pages remain out of the XML sitemap and carry a no-index directive until the crawler has enough useful title and summary detail for a worthwhile search result.</p></section>
      <section><h2>Coverage is measurable</h2><p>Government changes too quickly for a truthful claim of permanent completeness. GovGuide exposes current counts and statuses while the scheduled crawler steadily expands coverage within each site’s robots rules and rate limits.</p></section>
    </div>
  );
}
