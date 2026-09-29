import { NextRequest, NextResponse } from "next/server";
import { discoveredGuides } from "@/lib/discovered-guides";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (!category) return NextResponse.json({ error: "A category is required." }, { status: 400 });
  const guides = discoveredGuides.filter((guide) => guide.category === category);
  return NextResponse.json({ guides }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
