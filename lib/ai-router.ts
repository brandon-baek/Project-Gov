import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { journeys } from "@/data/curated/journeys";

const routeSchema = z.object({
  journeyId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(160)
});

export async function routeWithAI(message: string, candidateIds: string[]) {
  if (!process.env.OPENAI_API_KEY || candidateIds.length === 0) return null;

  const candidates = journeys
    .filter((journey) => candidateIds.includes(journey.id))
    .map((journey) => ({ id: journey.id, title: journey.title, aliases: journey.aliases, summary: journey.summary }));

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    input: [
      {
        role: "system",
        content: "Select only the best matching journey ID from the supplied candidates. You classify intent only. Do not answer the user, infer eligibility, or add government facts. Return null when none clearly match."
      },
      { role: "user", content: JSON.stringify({ request: message, candidates }) }
    ],
    text: { format: zodTextFormat(routeSchema, "govguide_route") }
  });

  const parsed = response.output_parsed;
  if (!parsed?.journeyId || !candidateIds.includes(parsed.journeyId) || parsed.confidence < 0.62) return null;
  return parsed;
}
