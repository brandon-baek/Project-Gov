"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Journey } from "@/lib/schema";
import type { DiscoveredGuide } from "@/lib/discovered-guides";
import { GUIDE_GROUPS, guideGroupForCategory, type GuideGroupId } from "@/lib/guide-groups";
import styles from "./GuideDirectory.module.css";

type Entry = { id: string; slug: string; title: string; summary: string; category: string };

export function GuideDirectory({ guides, generatedCounts, samples }: {
  guides: Journey[];
  generatedCounts: Record<string, number>;
  samples: Record<string, string[]>;
}) {
  const [active, setActive] = useState<GuideGroupId>("identity-civic");
  const [loaded, setLoaded] = useState<Record<string, DiscoveredGuide[]>>({});
  const [loading, setLoading] = useState(false);
  const coreEntries = useMemo<Entry[]>(() => guides.map(({ id, slug, title, summary, category }) => ({ id, slug, title, summary, category })), [guides]);
  const currentGroup = GUIDE_GROUPS.find((group) => group.id === active)!;
  const coreInGroup = coreEntries.filter((entry) => guideGroupForCategory(entry.category) === active);
  const generatedInGroup = (loaded[active] ?? []).map(({ id, slug, title, summary, category }) => ({ id, slug, title, summary, category }));
  const entries = [...coreInGroup, ...generatedInGroup].sort((a, b) => a.title.localeCompare(b.title));

  useEffect(() => {
    fetch("/api/guides?group=identity-civic").then((response) => response.json()).then((data: { guides: DiscoveredGuide[] }) => {
      setLoaded((current) => ({ ...current, "identity-civic": data.guides }));
    }).catch(() => undefined);
  }, []);

  async function selectGroup(group: GuideGroupId) {
    setActive(group);
    if (loaded[group]) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/guides?group=${encodeURIComponent(group)}`);
      if (!response.ok) throw new Error("Guide group request failed");
      const data = await response.json() as { guides: DiscoveredGuide[] };
      setLoaded((current) => ({ ...current, [group]: data.guides }));
    } finally { setLoading(false); }
  }

  const totalFor = (group: GuideGroupId) => coreEntries.filter((entry) => guideGroupForCategory(entry.category) === group).length + (generatedCounts[group] ?? 0);

  return <section className={styles.directory} aria-labelledby="guide-directory-heading">
    <header className={styles.header}>
      <p className={styles.kicker}>Browse by life situation</p>
      <h2 id="guide-directory-heading">Choose an area. See the tasks.</h2>
      <p>Each published page is a concrete action with an official destination and automated source checks.</p>
    </header>
    <div className={styles.groupGrid}>
      {GUIDE_GROUPS.map((group) => <button className={styles.groupCard} data-active={active === group.id} type="button" key={group.id} onClick={() => void selectGroup(group.id)}>
        <span><strong>{group.title}</strong><small>{group.description}</small></span>
        <em>{totalFor(group.id)} tasks</em>
        <ul>{(samples[group.id] ?? []).slice(0, 2).map((title) => <li key={title}>{title}</li>)}</ul>
      </button>)}
    </div>
    <section className={styles.taskPanel} aria-live="polite">
      <div className={styles.taskHeading}><div><p className={styles.kicker}>Government tasks</p><h3>{currentGroup.title}</h3></div><span>{totalFor(active)} guides</span></div>
      {loading && !loaded[active] && <p className={styles.loading}>Loading guides…</p>}
      <div className={styles.rows}>
        {entries.map((entry) => <Link href={`/guides/${entry.slug}`} key={entry.id} className={styles.row}>
          <span className={styles.copy}><strong>{entry.title}</strong><small>{entry.summary}</small><em>{entry.category}</em></span>
          <b aria-hidden="true">→</b>
        </Link>)}
      </div>
    </section>
  </section>;
}
