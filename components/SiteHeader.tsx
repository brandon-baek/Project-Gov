import Link from "next/link";

export function SiteHeader() {
  return (
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="wordmark" href="/" aria-label="GovGuide home">
            <span className="wordmark__mark" aria-hidden="true">G</span>
            GovGuide
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/guides">Guides</Link>
            <Link href="/graph">Knowledge graph</Link>
            <Link href="/data">Data</Link>
            <Link href="/about">About</Link>
          </nav>
          <Link className="header-ask" href="/#ask"><span aria-hidden="true" /> Ask GovGuide</Link>
        </div>
      </header>
  );
}
