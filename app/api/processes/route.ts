import { NextRequest, NextResponse } from "next/server";
import { publishedProcesses } from "@/lib/process-registry";
import { stateByCode } from "@/lib/jurisdictions";
import { retrieveJourneys } from "@/lib/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")?.toUpperCase();
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if ((state && !stateByCode(state)) || query.length > 120) {
    return NextResponse.json({ message: "Choose a supported state and a query up to 120 characters." }, { status: 400 });
  }
  try {
    const catalog = await publishedProcesses(state);
    const journeys = query ? retrieveJourneys(query, 20, catalog.journeys, state).map((match) => match.journey) : catalog.journeys;
    return NextResponse.json({ processes: journeys, storage: catalog.storage, coverage: "Only the explicitly published processes are included." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "The process catalog is temporarily unavailable." }, { status: 503 });
  }
}
