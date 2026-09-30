import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { journeys } from "@/data/curated/journeys";
vi.mock("@/lib/database", () => ({ getStoredJourneys: () => ({ journeys, storage: "bundled-fallback" }) }));
vi.mock("@/lib/ai-router", () => ({ routeWithAI: vi.fn() }));
import { routeWithAI } from "@/lib/ai-router";
import { POST } from "./route";
const request = (body: unknown) => new NextRequest("https://govguide.test/api/chat", { method:"POST", body:JSON.stringify(body) });
describe("free guidance endpoint", () => {
  it("makes no paid calls when disabled, even with a key", async () => {
    vi.stubEnv("GOVGUIDE_ENABLE_PAID_AI", "false"); vi.stubEnv("OPENAI_API_KEY", "test-key");
    const response = await POST(request({message:"I was laid off in California",state:"CA"}));
    expect((await response.json()).journey.id).toBe("journey-ca-unemployment"); expect(routeWithAI).not.toHaveBeenCalled(); vi.unstubAllEnvs();
  });
  it("routes cross-state requests to the planner", async () => { const body = await (await POST(request({message:"moving from New York to Texas"}))).json(); expect(body.alternatives[0].href).toBe("/moving"); });
  it("clarifies conflicting state selection", async () => { const body = await (await POST(request({message:"unemployment in Texas",state:"CA"}))).json(); expect(body.status).toBe("clarify"); expect(body.journey).toBeUndefined(); });
  it("rejects oversized requests and malformed JSON", async () => {
    expect((await POST(request({message:"x".repeat(9000)}))).status).toBe(413);
    expect((await POST(new NextRequest("https://govguide.test/api/chat",{method:"POST",body:"{"}))).status).toBe(400);
  });
  it("blocks sensitive identifiers before routing", async () => { expect((await (await POST(request({message:"my SSN is 123-45-6789"}))).json()).status).toBe("blocked"); });
});
