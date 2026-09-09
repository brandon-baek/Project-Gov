import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { chatRequestSchema } from "@/lib/schema";
import { classifyRetrieval, getJourneyById, retrieveJourneys } from "@/lib/retrieval";
import { findSensitiveData, isLikelyEmergency } from "@/lib/safety";
import { routeWithAI } from "@/lib/ai-router";
import { traceJourney } from "@/lib/graph";
import { getStoredJourneys } from "@/lib/database";

export const runtime = "nodejs";

const windows = new Map<string, { count: number; resetsAt: number }>();

function rateLimited(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetsAt < now) {
    windows.set(key, { count: 1, resetsAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 30;
}

export async function POST(request: NextRequest) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { status: "error", message: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const body = chatRequestSchema.parse(await request.json());
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

    const stored = getStoredJourneys();
    let matches = retrieveJourneys(body.message, 8, stored.journeys);
    let router: "graph" | "graph+ai" = "graph";
    if (matches.length > 0) {
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
    if (classification === "unsupported") {
      return NextResponse.json({
        status: "unsupported",
        message: "I don’t have a verified guide for that yet. Try describing the government task, document, benefit, or notice you are dealing with. You can also search USA.gov directly.",
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
    if (error instanceof ZodError) {
      return NextResponse.json({ status: "error", message: "Please enter a request between 3 and 600 characters." }, { status: 400 });
    }
    return NextResponse.json({ status: "error", message: "GovGuide could not process that request. Please try again." }, { status: 500 });
  }
}
