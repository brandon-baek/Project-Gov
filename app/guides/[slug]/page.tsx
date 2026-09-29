import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { journeys } from "@/data/curated/journeys";
import { getJourneyBySlug } from "@/lib/retrieval";
import { GuideResult } from "@/components/GuideResult";
import { DiscoveredGuideResult } from "@/components/DiscoveredGuideResult";
import { discoveredGuides, getDiscoveredGuideBySlug } from "@/lib/discovered-guides";
import { AdSlot } from "@/components/AdSlot";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return [...journeys.map((journey) => ({ slug: journey.slug })), ...discoveredGuides.map((guide) => ({ slug: guide.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const journey = getJourneyBySlug(slug);
  const discovered = getDiscoveredGuideBySlug(slug);
  const guide = journey ?? discovered;
  return guide ? { title: guide.title, description: guide.summary, alternates: { canonical: `/guides/${slug}` }, robots: discovered && !discovered.seoEligible ? { index: false, follow: true } : undefined, openGraph: { title: guide.title, description: guide.summary, type: "article", url: `/guides/${slug}`, siteName: "GovGuide" } } : { title: "Guide not found" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const journey = getJourneyBySlug(slug);
  const discovered = getDiscoveredGuideBySlug(slug);
  if (!journey && !discovered) notFound();
  const title = journey?.title ?? discovered!.title;
  const summary = journey?.summary ?? discovered!.summary;
  const publisher = journey?.sources[0]?.publisher ?? discovered!.publisher;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: summary,
    url: `${siteUrl}/guides/${slug}`,
    isPartOf: { "@type": "WebSite", name: "GovGuide", url: siteUrl },
    reviewedBy: journey ? { "@type": "Organization", name: "GovGuide" } : undefined,
    isBasedOn: discovered ? guideSource(discovered.officialUrl, publisher) : journey!.sources.map((source) => guideSource(source.url, source.publisher)),
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Guides", item: `${siteUrl}/guides` }, { "@type": "ListItem", position: 2, name: title, item: `${siteUrl}/guides/${slug}` }] }
  };
  return (
    <div className="page-shell shell guide-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      {journey ? <GuideResult journey={journey} /> : <DiscoveredGuideResult guide={discovered!} />}
      <AdSlot position="guide-end" />
      <aside className="legal-note"><strong>Before you act</strong><p>Requirements, fees, and deadlines can change. Confirm time-sensitive details on the linked official page. GovGuide provides public information, not legal advice.</p></aside>
    </div>
  );
}

function guideSource(url: string, publisher: string) {
  return { "@type": "WebPage", url, publisher: { "@type": "GovernmentOrganization", name: publisher } };
}
