import type { Metadata } from "next";
import { GraphExplorer } from "@/components/GraphExplorer";
import { journeys } from "@/data/curated/journeys";
import { govGraph } from "@/lib/graph";
import gnn from "@/data/generated/gnn-neighbors.json";

export const metadata: Metadata = { title: "Knowledge graph" };

export default async function GraphPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;
  const counts = ["journey", "step", "source", "agency"].map((kind) => ({ kind, count: govGraph.nodes.filter((node) => node.kind === kind).length }));
  return (
    <div className="page-shell shell graph-page">
      <header className="page-intro">
        <p className="eyebrow">Inspectable by design</p>
        <h1>The knowledge graph</h1>
        <p>Move through every journey, ordered step, official page, and publisher. Nothing here is decorative—each connection is part of the answer system.</p>
      </header>
      <div className="graph-stats" aria-label="Graph totals">
        {counts.map(({ kind, count }) => <div key={kind}><strong>{count}</strong><span>{kind}{count === 1 ? "" : "s"}</span></div>)}
        <div><strong>{govGraph.edges.length}</strong><span>typed edges</span></div>
      </div>
      <GraphExplorer nodes={govGraph.nodes} edges={govGraph.edges} journeys={journeys.map(({ id, title, slug }) => ({ id, title, slug }))} suggestions={gnn.suggestions.map(({ from, to, score, status }) => ({ from, to, score, status, relation: "related-to" as const }))} initialFocus={focus} />
      <section className="graph-rules">
        <div><h2>What qualifies as an answer</h2><p>A reviewed journey must have ordered steps. Every step must connect to at least one reviewed source. A source must name its publisher and official URL.</p></div>
        <div><h2>Where a GNN can help</h2><p>An experimental GraphSAGE model can suggest similar journeys or missing <em>related-to</em> edges for human review. It cannot create or verify a step, source, deadline, fee, or eligibility rule.</p></div>
      </section>
    </div>
  );
}
