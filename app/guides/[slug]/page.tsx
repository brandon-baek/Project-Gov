import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { journeys } from "@/data/curated/journeys";
import { getJourneyBySlug } from "@/lib/retrieval";
import { GuideResult } from "@/components/GuideResult";

export function generateStaticParams() {
  return journeys.map((journey) => ({ slug: journey.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const journey = getJourneyBySlug((await params).slug);
  return journey ? { title: journey.title, description: journey.summary } : { title: "Guide not found" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const journey = getJourneyBySlug((await params).slug);
  if (!journey) notFound();
  return (
    <div className="page-shell shell guide-page">
      <GuideResult journey={journey} />
      <aside className="legal-note"><strong>Before you act</strong><p>Requirements, fees, and deadlines can change. Confirm time-sensitive details on the linked official page. GovGuide provides public information, not legal advice.</p></aside>
    </div>
  );
}
