import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { chatRequestSchema } from "@/lib/schema";
import { classifyRetrieval, getJourneyById, retrieveJourneys } from "@/lib/retrieval";
import { findSensitiveData, isLikelyEmergency } from "@/lib/safety";
import { routeWithAI } from "@/lib/ai-router";
import { traceJourney } from "@/lib/graph";
import { getStoredJourneys } from "@/lib/database";
import { retrieveDiscoveredGuides } from "@/lib/discovered-guides";
import { consumeRequest, consumeAIRoute } from "@/lib/request-limits";
import { stateByCode, statesInText } from "@/lib/jurisdictions";

export const runtime = "nodejs";

function rateLimited(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return !consumeRequest(key);
}

export async function POST(request: NextRequest) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { status: "error", message: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ status: "error", message: "A request is required." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return NextResponse.json({ status: "error", message: "Request too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = chatRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (body.state && !stateByCode(body.state)) return NextResponse.json({ status: "error", message: "Choose a supported state or territory." }, { status: 400 });
    const sensitive = findSensitiveData(body.message);
    if (sensitive.length > 0) {
      return NextResponse.json({
        status: "blocked",
        message: `Please remove the ${sensitive.join(" and ")} before continuing. GovGuide does not need sensitive identification or account numbers.`,
        alternatives: []
      });
    }

    if (isLikelyEmergency(body.message)) {
      return NextResponse.json({
        status: "blocked",
        message: "If someone is in immediate danger, call 911 or your local emergency number now. GovGuide is not an emergency service.",
        alternatives: []
      });
    }

    const locations = statesInText(body.message);
    if (/\b(mov(?:e|ed|ing)|relocat(?:e|ing)|another state|out.of.state)\b/i.test(body.message)) {
      return NextResponse.json({ status: "clarify", message: "Moving between states? Choose your origin and destination in the moving planner to combine both jurisdictions into one checklist.", alternatives: [{ id: "moving", slug: "", title: "Build my moving checklist", href: "/moving" }] });
    }
    if (!body.state && locations.length > 1) return NextResponse.json({ status: "clarify", message: "Which state's rules should I use? Choose a state above or use the moving planner for a cross-state process.", alternatives: [] });
    if (body.state && locations.length === 1 && body.state !== locations[0].code) return NextResponse.json({ status: "clarify", message: "Your request names a different state from the selected location. Choose the state whose rules you need, then try again.", alternatives: [] });
    const location = body.state ?? locations[0]?.code;
    const stored = getStoredJourneys();
    let matches = retrieveJourneys(body.message, 8, stored.journeys, location);
    const discoveredMatches = retrieveDiscoveredGuides(body.message, 6, location, body.locality);
    let router: "graph" | "graph+ai" = "graph";
    if (classifyRetrieval(matches) === "clarify" && consumeAIRoute()) {
      try {
        const aiRoute = await routeWithAI(body.message, matches.map((match) => match.journey.id));
        const selected = aiRoute?.journeyId ? getJourneyById(aiRoute.journeyId) : undefined;
        if (selected) {
          matches = [
            { journey: selected, score: Math.max(matches.find((match) => match.journey.id === selected.id)?.score ?? 0, 30), matchedTerms: ["semantic match"] },
            ...matches.filter((match) => match.journey.id !== selected.id)
          ];
          router = "graph+ai";
        }
      } catch {
        // The deterministic graph router remains available if the optional model fails.
      }
    }

    const classification = classifyRetrieval(matches);
    if (!location && (matches[0]?.journey.jurisdiction === "california" || (discoveredMatches[0] && discoveredMatches[0].guide.jurisdiction !== "federal"))) {
      return NextResponse.json({ status: "clarify", message: "Choose your state above so I can find the right jurisdiction. For a city or county service, also enter its jurisdiction name.", alternatives: [] });
    }
    const bestDiscovered = discoveredMatches[0];
    if (bestDiscovered && (classification !== "matched" || bestDiscovered.score > (matches[0]?.score ?? 0))) {
      return NextResponse.json({
        status: "discovered",
        message: bestDiscovered.guide.summary,
        guide: bestDiscovered.guide,
        alternatives: discoveredMatches.slice(1, 4).map(({ guide }) => ({ id: guide.id, slug: guide.slug, title: guide.title, summary: guide.summary })),
        provenance: { router: "discovered-guide-index", assembledFrom: [bestDiscovered.guide.sourceId] }
      });
    }
    if (classification === "unsupported") {
      return NextResponse.json({
        status: "unsupported",
        message: "I could not match that request to a published guide yet. Try describing the outcome, document, benefit, notice, or agency in different words.",
        alternatives: [],
        officialSearchUrl: `https://search.usa.gov/search?affiliate=usagov&query=${encodeURIComponent(body.message)}`
      });
    }

    if (classification === "clarify") {
      return NextResponse.json({
        status: "clarify",
        message: "I found a few possible routes. Which one is closest?",
        alternatives: matches.slice(0, 3).map(({ journey }) => ({ id: journey.id, slug: journey.slug, title: journey.title, summary: journey.summary }))
      });
    }

    const journey = matches[0].journey;
    return NextResponse.json({
      status: "matched",
      message: journey.summary,
      journey,
      alternatives: matches.slice(1, 3).map(({ journey: alternative }) => ({ id: alternative.id, slug: alternative.slug, title: alternative.title })),
      provenance: {
        router,
        storage: stored.storage,
        journeyNodeId: journey.id,
        matchedTerms: matches[0].matchedTerms,
        assembledFrom: journey.steps.flatMap((step) => step.sourceIds).filter((id, index, values) => values.indexOf(id) === index),
        graph: traceJourney(journey)
      }
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ status: "error", message: "Please enter a request between 3 and 600 characters." }, { status: 400 });
    }
    return NextResponse.json({ status: "error", message: "GovGuide could not process that request. Please try again." }, { status: 500 });
  }
}
