import { NextRequest, NextResponse } from "next/server";
import { discoveredGuides } from "@/lib/discovered-guides";
import { guideGroupForCategory } from "@/lib/guide-groups";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get("group");
  if (!group) return NextResponse.json({ error: "A guide group is required." }, { status: 400 });
  const guides = discoveredGuides.filter((guide) => guideGroupForCategory(guide.category) === group);
  return NextResponse.json({ guides }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
