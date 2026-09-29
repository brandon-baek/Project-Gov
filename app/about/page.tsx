import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="page-shell shell article-page">
      <header className="page-intro"><p className="eyebrow">About GovGuide</p><h1>Built around the task, not the agency chart.</h1><p>Government services are usually organized by institution. People arrive with a situation. GovGuide connects the two.</p></header>
      <section><h2>What it does</h2><p>GovGuide organizes official government destinations around the outcomes people are trying to reach. It offers reviewed step-by-step routes where available and clearly marked discovered guides everywhere the crawler has found a potential pathway.</p></section>
      <section><h2>What it does not do</h2><p>GovGuide does not determine eligibility, submit applications, collect sensitive identifiers, or provide legal advice. It will say when it does not have a reliable route.</p></section>
      <section><h2>Why the graph matters</h2><p>The graph shows reviewed and discovered guides together with their steps, official pages, and publishers. Every guide can be traced to its evidence and status instead of appearing from an unexplained answer generator.</p></section>
    </div>
  );
}
