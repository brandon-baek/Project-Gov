"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import type { Journey } from "@/lib/schema";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import { GuideResult } from "@/components/GuideResult";

type ApiResponse =
  | { status: "matched"; message: string; journey: Journey; provenance: { router: string; storage: string; assembledFrom: string[] }; alternatives: { id: string; slug: string; title: string }[] }
  | { status: "clarify" | "unsupported" | "blocked" | "error"; message: string; alternatives: { id: string; slug: string; title: string; summary?: string }[]; officialSearchUrl?: string };

const examples = [
  "I lost my passport",
  "I was laid off in California",
  "Someone used my identity",
  "I’m starting a business"
];

export function GuideSearch() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(query: string) {
    const clean = query.trim();
    if (clean.length < 3 || loading) return;
    setLoading(true);
    setResult(null);
    setSubmitted(clean);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history: [] })
      });
      const data = (await response.json()) as ApiResponse;
      setResult(data);
      window.setTimeout(() => resultRef.current?.focus(), 50);
    } catch {
      setResult({ status: "error", message: "GovGuide could not connect. Check your connection and try again.", alternatives: [] });
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(message);
  }

  return (
    <div className="search-experience">
      <form className="guide-search" onSubmit={submit}>
        <label htmlFor="goal">What are you trying to do?</label>
        <div className="guide-search__control">
          <textarea id="goal" name="goal" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the situation in your own words" rows={2} maxLength={600} />
          <button type="submit" disabled={loading || message.trim().length < 3} aria-label="Find a government guide"><ArrowIcon /></button>
        </div>
        <p className="privacy-note">Do not include Social Security, account, passport, or license numbers.</p>
      </form>

      {!submitted && (
        <div className="examples" aria-label="Example requests">
          <span>Try an example</span>
          <div>
            {examples.map((example) => <button type="button" key={example} onClick={() => { setMessage(example); void run(example); }}>{example}</button>)}
          </div>
        </div>
      )}

      <div className="answer-region" aria-live="polite" aria-busy={loading} ref={resultRef} tabIndex={-1}>
        {loading && <SearchSkeleton query={submitted} />}
        {result?.status === "matched" && (
          <>
            <div className="query-line"><span>You asked</span><p>{submitted}</p></div>
            <GuideResult journey={result.journey} />
            <details className="trace-details">
              <summary>How this answer was assembled</summary>
              <p>The request was matched to <code>{result.journey.id}</code> in the {result.provenance.storage === "sqlite" ? "SQL knowledge graph" : "bundled graph fallback"}. Every step was traversed from that journey node to {result.provenance.assembledFrom.length} supporting source node{result.provenance.assembledFrom.length === 1 ? "" : "s"}. The router used {result.provenance.router === "graph+ai" ? "AI-assisted intent selection plus graph validation" : "deterministic graph retrieval"}.</p>
              <Link href={`/graph?focus=${result.journey.id}`}>See it in the graph</Link>
            </details>
          </>
        )}
        {result && result.status !== "matched" && (
          <div className={`notice notice--${result.status}`} role={result.status === "error" || result.status === "blocked" ? "alert" : undefined}>
            <p>{result.message}</p>
            {result.alternatives.length > 0 && <div className="notice-options">{result.alternatives.map((item) => <Link key={item.id} href={`/guides/${item.slug}`}><strong>{item.title}</strong>{item.summary && <span>{item.summary}</span>}</Link>)}</div>}
            {result.officialSearchUrl && <a className="text-action" href={result.officialSearchUrl} target="_blank" rel="noreferrer">Search USA.gov<ExternalIcon /></a>}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSkeleton({ query }: { query: string }) {
  return (
    <div className="search-loading" role="status">
      <div className="query-line"><span>You asked</span><p>{query}</p></div>
      <div className="skeleton-card">
        <span className="skeleton skeleton--short" />
        <span className="skeleton skeleton--title" />
        <span className="skeleton" />
        <span className="skeleton skeleton--wide" />
        <div className="skeleton-steps"><i /><i /><i /></div>
      </div>
      <span className="sr-only">Searching verified government guides</span>
    </div>
  );
}
