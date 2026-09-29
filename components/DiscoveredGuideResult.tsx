import Link from "next/link";
import type { DiscoveredGuide } from "@/lib/discovered-guides";
import { CheckIcon, ExternalIcon } from "@/components/icons";

export function DiscoveredGuideResult({ guide, compact = false }: { guide: DiscoveredGuide; compact?: boolean }) {
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(guide.reviewedAt));
  return <article className={compact ? "guide-result guide-result--compact" : "guide-result"}>
    <header className="guide-result__header"><div><p className="eyebrow">{guide.category} · {guide.jurisdiction.replaceAll("-", " ")}</p><h2>{guide.title}</h2><p className="guide-summary">{guide.summary}</p></div><div className="verified-stamp"><CheckIcon /> Source checked automatically {date}</div></header>
    <section className="discovered-route">
      <p className="route-label">Official starting point</p>
      <h3>Complete this task with {guide.publisher}</h3>
      <p>Use the official service below for the current requirements, forms, deadlines, fees, and contact options for this task.</p>
      <a className="primary-action" href={guide.officialUrl} target="_blank" rel="noreferrer">Open the official service<ExternalIcon /></a>
    </section>
    <ol className="steps-list discovered-steps">
      <li><span className="step-number">01</span><div><h3>Check that this service covers your situation</h3><p>Confirm the jurisdiction, program, and people served. Similar government programs can use different rules or application systems.</p></div></li>
      <li><span className="step-number">02</span><div><h3>Review what you need before starting</h3><p>Check the official page for eligibility, documents, account requirements, deadlines, and any current fee before entering personal information.</p></div></li>
      <li><span className="step-number">03</span><div><h3>Follow the agency’s current instructions</h3><p>Complete the application, request, filing, search, or contact process published by {guide.publisher}. Save any confirmation number or receipt the agency provides.</p></div></li>
      <li><span className="step-number">04</span><div><h3>Track the result and respond to notices</h3><p>Use the official status or contact channel for follow-up. Read agency notices promptly because missing information or deadlines can delay the result.</p></div></li>
    </ol>
    {guide.outline.length > 0 && <section className="guide-outline"><p className="route-label">Covered by the official page</p><h3>Topics to review</h3><ul>{guide.outline.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    <div className="source-block"><div className="source-block__heading"><h3>Official source</h3><span>Automatically checked</span></div><ul><li><a href={guide.officialUrl} target="_blank" rel="noreferrer"><span>{guide.sourceTitle}<small>{guide.publisher}</small></span><ExternalIcon /></a></li></ul><p className="discovery-reason">This page passed automated checks for an official source, a concrete government task, useful page content, and a current crawl record.</p></div>
    {!compact && <div className="result-actions"><Link className="quiet-action" href={`/graph?focus=${guide.id}`}>See this guide’s sources in the graph</Link></div>}
  </article>;
}
