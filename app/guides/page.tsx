import type { Metadata } from "next";
import { journeys } from "@/data/curated/journeys";
import { discoveredGuides } from "@/lib/discovered-guides";
import { GuideDirectory } from "@/components/GuideDirectory";
export const metadata: Metadata = { title: "State and local guides" };
export default function GuidesPage() {
  return <div className="page-shell shell"><header className="page-intro"><p className="eyebrow">State and local services</p><h1>The right task.<br />The right jurisdiction.</h1><p>Choose your location to find official starting points for driving, records, benefits, business, and local services.</p></header><GuideDirectory guides={journeys} discovered={discoveredGuides} /></div>;
}
