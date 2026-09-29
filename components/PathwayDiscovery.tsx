import Link from "next/link";
import type { Journey } from "@/lib/schema";
import type { PathwayDiscoveryGroup } from "@/lib/pathway-discovery";
import styles from "./PathwayDiscovery.module.css";

export function PathwayDiscovery({ groups }: { groups: PathwayDiscoveryGroup[] }) {
  return <section className={styles.section} aria-labelledby="discover-pathways">
    <header className={styles.header}>
      <div><p className={styles.kicker}>Browse by situation</p><h2 id="discover-pathways">What are you trying to do?</h2><p>Start with a life event or need. You can browse without knowing an agency name or the right search terms.</p></div>
      <p className={styles.rule}><strong>Why a pathway appears</strong><br />Reviewed routes include ordered steps checked against their cited sources. Potential routes are shown because official pages in the latest crawl matched that situation. Those pages are leads, not reviewed instructions.</p>
    </header>
    <div className={styles.groups}>
      {groups.map((group) => <details className={styles.group} key={group.id}>
        <summary><span className={styles.topic}><strong>{group.title}</strong><small>{group.prompt}</small></span><span className={styles.count}>{group.guides.length ? `${group.guides.length} reviewed` : "Explore"}{group.pages.length ? ` · ${group.pages.length} leads` : ""}<i aria-hidden="true">+</i></span></summary>
        <p className={styles.why}>{group.why}</p>
        {group.guides.length > 0 && <div className={styles.reviewed}>
          {group.guides.map((guide: Journey) => <Link key={guide.id} href={`/guides/${guide.slug}`}><span><strong>{guide.title}</strong><small>{guide.sources.length} cited official {guide.sources.length === 1 ? "source" : "sources"} · reviewed {guide.reviewedAt}</small></span><b aria-hidden="true">→</b></Link>)}
        </div>}
        {group.pages.length > 0 && <div className={styles.potential}>
          {group.pages.slice(0, 5).map((page) => <a href={page.url} target="_blank" rel="noreferrer" key={page.url}><span><strong>{page.title}</strong><small>{page.publisher}{page.agency ? ` · listed under ${page.agency}` : ""} · machine-indexed lead</small></span><b aria-hidden="true">↗</b></a>)}
          {group.pages.length > 5 && <details className={styles.morePages}><summary>See all {group.pages.length} indexed starting pages</summary>{group.pages.slice(5).map((page) => <a href={page.url} target="_blank" rel="noreferrer" key={page.url}><span><strong>{page.title}</strong><small>{page.publisher}{page.agency ? ` · listed under ${page.agency}` : ""} · machine-indexed lead</small></span><b aria-hidden="true">↗</b></a>)}</details>}
        </div>}
        {group.guides.length === 0 && group.pages.length === 0 && <p className={styles.gap}>No matching page was found in the current crawl. Browse the agency directory below or tell us which official service should be covered next.</p>}
      </details>)}
    </div>
  </section>;
}
