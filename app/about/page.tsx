import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="page-shell shell article-page">
      <header className="page-intro"><p className="eyebrow">About GovGuide</p><h1>Built around the task, not the agency chart.</h1><p>Government services are usually organized by institution. People arrive with a situation. GovGuide connects the two.</p></header>
      <section><h2>What it does</h2><p>GovGuide turns plain-language requests into a verified sequence of steps. It identifies the responsible government service, explains the route in ordinary language, and hands off to the official website for applications, payments, or submissions.</p></section>
      <section><h2>What it does not do</h2><p>GovGuide does not determine eligibility, submit applications, collect sensitive identifiers, or provide legal advice. It will say when it does not have a reliable route.</p></section>
      <section><h2>Why the graph matters</h2><p>A normal chatbot can write a fluent answer without proving where its facts came from. GovGuide stores journeys, steps, agencies, programs, and source pages as typed nodes. Steps are only shown when they are connected to official source nodes.</p></section>
    </div>
  );
}
