"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Journey } from "@/lib/schema";
import type { DiscoveredGuide } from "@/lib/discovered-guides";
import styles from "./GuideDirectory.module.css";

type Entry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: "reviewed" | "discovered";
  reason: string;
};

export function GuideDirectory({ reviewed, discoveredCount, categoryCounts }: { reviewed: Journey[]; discoveredCount: number; categoryCounts: [string, number][] }) {
  const [scope, setScope] = useState<"all" | "reviewed" | "discovered">("all");
  const [loaded, setLoaded] = useState<Record<string, DiscoveredGuide[]>>({});
  const [loading, setLoading] = useState<string>("");
  const reviewedEntries = useMemo<Entry[]>(() => reviewed.map((guide) => ({
      id: guide.id, slug: guide.slug, title: guide.title, summary: guide.summary, category: guide.category,
      status: "reviewed" as const,
      reason: `Included because its ${guide.steps.length} ordered steps are supported by ${guide.sources.length} checked official ${guide.sources.length === 1 ? "source" : "sources"}.`
    })), [reviewed]);
  const discoveredByCategory = useMemo(() => new Map(categoryCounts), [categoryCounts]);
  const categories = useMemo(() => [...new Set([...reviewedEntries.map((entry) => entry.category), ...categoryCounts.map(([category]) => category)])]
    .filter((category) => scope !== "reviewed" || reviewedEntries.some((entry) => entry.category === category))
    .sort((a, b) => ((scope === "reviewed" ? reviewedEntries.filter((entry) => entry.category === b).length : (discoveredByCategory.get(b) ?? 0) + reviewedEntries.filter((entry) => entry.category === b).length)
      - (scope === "reviewed" ? reviewedEntries.filter((entry) => entry.category === a).length : (discoveredByCategory.get(a) ?? 0) + reviewedEntries.filter((entry) => entry.category === a).length)) || a.localeCompare(b)), [categoryCounts, discoveredByCategory, reviewedEntries, scope]);

  async function loadCategory(category: string) {
    if (loaded[category] || loading === category || scope === "reviewed") return;
    setLoading(category);
    try {
      const response = await fetch(`/api/guides?category=${encodeURIComponent(category)}`);
      if (!response.ok) throw new Error("Guide category request failed");
      const data = await response.json() as { guides: DiscoveredGuide[] };
      setLoaded((current) => ({ ...current, [category]: data.guides }));
    } finally { setLoading(""); }
  }

  useEffect(() => { if (categories[0]) void loadCategory(categories[0]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return <section className={styles.directory} aria-labelledby="guide-directory-heading">
    <header className={styles.header}>
      <div><p className={styles.kicker}>Browse every pathway</p><h2 id="guide-directory-heading">Start with an outcome.</h2><p>Open a category and scan every route the system currently knows. Search is optional.</p></div>
      <div className={styles.filters} aria-label="Guide status">
        {(["all", "reviewed", "discovered"] as const).map((item) => <button type="button" key={item} aria-pressed={scope === item} onClick={() => setScope(item)}>{item === "all" ? `All ${reviewed.length + discoveredCount}` : item === "reviewed" ? `Reviewed ${reviewed.length}` : `Discovered ${discoveredCount}`}</button>)}
      </div>
    </header>
    <div className={styles.groups}>
      {categories.map((category, index) => {
        const reviewedInCategory = reviewedEntries.filter((entry) => entry.category === category);
        const discoveredInCategory: Entry[] = (loaded[category] ?? []).map((guide) => ({ id: guide.id, slug: guide.slug, title: guide.title, summary: guide.summary, category: guide.category, status: "discovered", reason: guide.reason }));
        const categoryEntries = scope === "reviewed" ? reviewedInCategory : scope === "discovered" ? discoveredInCategory : [...reviewedInCategory, ...discoveredInCategory];
        const total = (scope === "reviewed" ? reviewedInCategory.length : scope === "discovered" ? discoveredByCategory.get(category) ?? 0 : reviewedInCategory.length + (discoveredByCategory.get(category) ?? 0));
        return <details className={styles.group} key={category} open={index === 0} onToggle={(event) => { if (event.currentTarget.open) void loadCategory(category); }}>
          <summary><span><strong>{category}</strong><small>{total} {total === 1 ? "guide" : "guides"}{reviewedInCategory.length ? ` · ${reviewedInCategory.length} fully reviewed` : ""}</small></span><i aria-hidden="true">+</i></summary>
          <div className={styles.rows}>
            {loading === category && !loaded[category] && <p className={styles.loading}>Loading discovered guides…</p>}
            {categoryEntries.map((entry) => <Link href={`/guides/${entry.slug}`} key={entry.id} className={styles.row}>
              <span className={styles.status} data-status={entry.status}>{entry.status === "reviewed" ? "Reviewed steps" : "Discovered guide"}</span>
              <span className={styles.copy}><strong>{entry.title}</strong><small>{entry.summary}</small><em>{entry.reason}</em></span>
              <b aria-hidden="true">→</b>
            </Link>)}
            {!loading && categoryEntries.length === 0 && <p className={styles.loading}>No guides in this view.</p>}
          </div>
        </details>;
      })}
    </div>
  </section>;
}
