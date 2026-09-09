import Link from "next/link";
import { GuideSearch } from "@/components/GuideSearch";
import { journeys } from "@/data/curated/journeys";
import { govGraph } from "@/lib/graph";
import { ArrowIcon } from "@/components/icons";

const featuredIds = ["journey-passport-lost", "journey-ca-unemployment", "journey-report-fraud", "journey-ca-business"];

export default function HomePage() {
  const featured = featuredIds.map((id) => journeys.find((journey) => journey.id === id)).filter(Boolean);
  return (
    <>
      <section className="hero shell" id="ask">
        <div className="hero__copy">
          <p className="eyebrow"><span /> Source-grounded public service guidance</p>
          <h1>Find the next<br />right step.</h1>
          <p>Describe what happened. GovGuide turns official government information into one clear, verifiable route.</p>
          <div className="hero-proof"><span>24 reviewed guides</span><span>45 official sources</span><span>No account required</span></div>
        </div>
        <GuideSearch />
      </section>

      <section className="trust-line">
        <div className="shell"><span>Independent project—not a government agency.</span><p><i /> Every instruction traces to an official source.</p></div>
      </section>

      <section className="featured shell">
        <div className="section-heading">
          <div><p className="section-label">Common starting points</p><h2>What brings you here?</h2></div>
          <Link href="/guides">View all {journeys.length} guides <ArrowIcon /></Link>
        </div>
        <div className="guide-index">{featured.map((journey, index) => journey && (
            <Link href={`/guides/${journey.slug}`} key={journey.id}>
              <span className="guide-index__number">0{index + 1}</span><div><span>{journey.category}</span><h3>{journey.title}</h3><p>{journey.summary}</p></div><ArrowIcon />
            </Link>
          ))}</div>
      </section>

      <section className="graph-callout">
        <div className="shell graph-callout__inner"><div><p className="section-label">The evidence layer</p><h2>Not a black box.<br />A map you can inspect.</h2><p>{govGraph.nodes.length} connected journeys, steps, sources, and agencies form the factual layer behind every answer.</p><Link href="/graph">Explore the live graph <ArrowIcon /></Link></div><div className="graph-preview" aria-hidden="true"><span className="gp-node gp-node--one" /><span className="gp-node gp-node--two" /><span className="gp-node gp-node--three" /><span className="gp-node gp-node--four" /><span className="gp-node gp-node--five" /><i className="gp-line gp-line--one" /><i className="gp-line gp-line--two" /><i className="gp-line gp-line--three" /><i className="gp-line gp-line--four" /><b>Journey</b><em>ordered step</em><small>official source</small></div></div>
      </section>
    </>
  );
}
