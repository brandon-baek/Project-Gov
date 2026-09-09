import Link from "next/link";
import type { Journey } from "@/lib/schema";
import { CheckIcon, ExternalIcon } from "@/components/icons";

export function GuideResult({ journey, compact = false }: { journey: Journey; compact?: boolean }) {
  const formatted = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${journey.reviewedAt}T00:00:00Z`));
  return (
    <article className={compact ? "guide-result guide-result--compact" : "guide-result"}>
      <header className="guide-result__header">
        <div>
          <p className="eyebrow">{journey.category} · {journey.jurisdiction.replaceAll("-", " ")}</p>
          <h2>{journey.title}</h2>
          <p className="guide-summary">{journey.summary}</p>
        </div>
        <div className="verified-stamp"><CheckIcon /> Sources checked {formatted}</div>
      </header>

      <ol className="steps-list">
        {journey.steps.map((step, index) => (
          <li key={step.id}>
            <span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
              {step.caution && <p className="caution"><strong>Important:</strong> {step.caution}</p>}
              {step.action && <a className="text-action" href={step.action.url} target="_blank" rel="noreferrer">{step.action.label}<ExternalIcon /></a>}
            </div>
          </li>
        ))}
      </ol>

      <div className="source-block">
        <div className="source-block__heading">
          <h3>Official sources</h3>
          <span>{journey.sources.length} source{journey.sources.length === 1 ? "" : "s"}</span>
        </div>
        <ul>
          {journey.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.publisher}</small></span><ExternalIcon /></a>
            </li>
          ))}
        </ul>
      </div>

      {!compact && (
        <div className="result-actions">
          {journey.officialAction && <a className="primary-action" href={journey.officialAction.url} target="_blank" rel="noreferrer">{journey.officialAction.label}<ExternalIcon /></a>}
          <Link className="quiet-action" href={`/guides/${journey.slug}`}>Open permanent guide</Link>
        </div>
      )}
    </article>
  );
}
