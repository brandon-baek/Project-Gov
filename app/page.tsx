import Link from "next/link";
import { GuideSearch } from "@/components/GuideSearch";
import { journeys } from "@/data/curated/journeys";
import { govGraph } from "@/lib/graph";
import { ArrowIcon } from "@/components/icons";
import { discoveredGuides } from "@/lib/discovered-guides";

const featuredIds = ["journey-ca-license", "journey-ca-unemployment", "journey-calfresh", "journey-ca-business"];

export default function HomePage() {
  const featured = featuredIds.map((id) => journeys.find((journey) => journey.id === id)).filter(Boolean);
  return (
    <>
      <section className="hero shell" id="ask">
        <div className="hero__copy">
          <p className="eyebrow"><span /> State, local, and cross-state guidance</p>
          <h1>Your next step,<br />wherever you live.</h1>
          <p>Find the state or local service you need. Moving across state lines? Bring both jurisdictions into one checklist.</p>
          <div className="hero-proof"><span>{journeys.length + discoveredGuides.length} published guides</span><span>Free guidance</span><span>No account required</span></div>
        </div>
        <GuideSearch />
      </section>

      <section className="trust-line">
        <div className="shell"><span>Independent project—not a government agency.</span><p><i /> Official sources. Clearly labeled coverage.</p></div>
      </section>

      <section className="moving-callout shell"><div><p className="eyebrow">Moving between states</p><h2>One move. More than one rulebook.</h2><p>Combine your old state’s departure rules with your new state’s license and vehicle tasks.</p></div><Link className="primary-action" href="/moving">Build a moving checklist</Link></section>
      <section className="featured shell">
        <div className="section-heading">
          <div><p className="section-label">Common starting points</p><h2>What brings you here?</h2></div>
          <Link href="/guides">View all {journeys.length + discoveredGuides.length} guides <ArrowIcon /></Link>
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
