import { NextRequest, NextResponse } from "next/server";
import { searchIndexedAgencies } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const collection = params.get("collection") ?? "all";
  if (!["all", "federal", "state", "domains", "connected"].includes(collection)) return NextResponse.json({ error: "Invalid catalog collection." }, { status: 400 });
  const parsedOffset = Number.parseInt(params.get("offset") ?? "0", 10);
  const result = searchIndexedAgencies({ query: params.get("q") ?? "", collection, limit: 20, offset: Number.isFinite(parsedOffset) ? parsedOffset : 0 });
  return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
