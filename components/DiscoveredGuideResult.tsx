import Link from "next/link";
import type { DiscoveredGuide } from "@/lib/discovered-guides";
import { ExternalIcon } from "@/components/icons";

export function DiscoveredGuideResult({ guide, compact = false }: { guide: DiscoveredGuide; compact?: boolean }) {
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(guide.discoveredAt));
  return <article className={compact ? "guide-result guide-result--compact" : "guide-result"}>
    <header className="guide-result__header"><div><p className="eyebrow">{guide.category} · {guide.jurisdiction.replaceAll("-", " ")}</p><h2>{guide.title}</h2><p className="guide-summary">{guide.summary}</p></div><div className="discovered-stamp">Discovered {date}</div></header>
    <div className="discovered-route">
      <p className="route-label">Potential pathway</p>
      <h3>Start at the official page</h3>
      <p>This crawler-discovered guide takes you to the official destination for this outcome. Its page and publisher are known; detailed steps have not yet passed GovGuide’s human review.</p>
      <a className="primary-action" href={guide.officialUrl} target="_blank" rel="noreferrer">Open {guide.publisher}<ExternalIcon /></a>
    </div>
    <ol className="steps-list discovered-steps">
      <li><span className="step-number">01</span><div><h3>Confirm this is your outcome</h3><p>Review the title, summary, and publisher. Government programs with similar names can have different eligibility rules or jurisdictions.</p></div></li>
      <li><span className="step-number">02</span><div><h3>Read the official requirements</h3><p>Use the official page to check current eligibility, documents, deadlines, fees, and contact options before you submit anything.</p></div></li>
      <li><span className="step-number">03</span><div><h3>Complete the action with the agency</h3><p>Follow the application, filing, request, or contact method published by {guide.publisher}. GovGuide never asks for your identification numbers.</p></div></li>
    </ol>
    {guide.outline.length > 0 && <section className="guide-outline"><p className="route-label">On the official page</p><h3>Topics this destination covers</h3><ul>{guide.outline.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    <div className="source-block"><div className="source-block__heading"><h3>Why this guide appears</h3><span>Automated discovery record</span></div><p className="discovery-reason">{guide.reason}</p></div>
    {!compact && <div className="result-actions"><Link className="quiet-action" href={`/graph?focus=${guide.id}`}>See this pathway in the graph</Link></div>}
  </article>;
}
