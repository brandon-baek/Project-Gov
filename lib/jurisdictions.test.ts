import { describe, it, expect } from "vitest";
import { matchesLocation, statesInText } from "@/lib/jurisdictions";
import { retrieveJourneys } from "@/lib/retrieval";
import { discoveredGuides, retrieveDiscoveredGuides } from "@/lib/discovered-guides";
import { canonicalUrl, guideIdentity } from "@/lib/guide-identity";
import { buildMovePlan } from "@/lib/moving";

describe("jurisdiction routing and publication", () => {
  it("does not interpret in/or/me as states", () => { expect(statesInText("Help me in my town or county")).toEqual([]); });
  it("recognizes state names and uppercase postal codes", () => { expect(statesInText("moving from NY to Texas").map((s) => s.code)).toEqual(expect.arrayContaining(["NY","TX"])); });
  it("never returns California unemployment for a Texas request", () => { expect(retrieveJourneys("unemployment in Texas").some((match) => match.journey.jurisdiction === "california")).toBe(false); });
  it("requires the local jurisdiction rather than just its state", () => {
    const town = { jurisdiction: "local", state: "ME", locality: "Bradford" };
    expect(matchesLocation(town, "ME")).toBe(false);
    expect(matchesLocation(town, "ME", "Bradford")).toBe(true);
    expect(matchesLocation(town, "ME", "Portland")).toBe(false);
    expect(matchesLocation({jurisdiction:"unknown"}, "ME")).toBe(false);
  });
  it("has unique published task identities and one correctly scoped Georgia route", () => {
    expect(new Set(discoveredGuides.map(guideIdentity)).size).toBe(discoveredGuides.length);
    const ga = discoveredGuides.filter((guide) => guide.title === "Use Georgia driver services online");
    expect(ga).toHaveLength(1); expect(ga[0].state).toBe("GA");
    expect(retrieveDiscoveredGuides("Georgia driver services",6,"ME")).toEqual([]);
  });
  it("normalizes tracking variants without losing meaningful parameters", () => {
    expect(canonicalUrl("https://www.dmv.ny.gov/task/?utm_source=x#section")).toBe(canonicalUrl("https://dmv.ny.gov/task"));
    expect(canonicalUrl("https://dmv.ny.gov/task?type=a")).not.toBe(canonicalUrl("https://dmv.ny.gov/task?type=b"));
  });
});
describe("cross-state moves", () => {
  it("joins origin insurance/plate constraints with separate Texas agencies", () => {
    const plan = buildMovePlan("NY", "TX", true)!;
    expect(plan.steps.find((step) => step.id === "departure")?.detail).toContain("surrender");
    expect(plan.steps.find((step) => step.id === "registration")?.url).toContain("txdmv.gov");
    expect(plan.steps.find((step) => step.id === "license")?.url).toContain("dps.texas.gov");
    expect(plan.steps.find((step) => step.id === "registration")?.deadline).toContain("30 days");
    for (const step of plan.steps) for (const dependency of step.dependsOn ?? []) expect(plan.steps.findIndex((s) => s.id === dependency)).toBeLessThan(plan.steps.indexOf(step));
  });
  it("omits vehicle tasks when no vehicle is coming", () => { expect(buildMovePlan("CA","NY",false)?.steps.map((step) => step.id)).toEqual(["residency","license"]); });
  it("shows coverage gaps without invented deadlines", () => {
    const plan = buildMovePlan("CA","OH",true)!;
    expect(plan.detailed).toBe(false);
    expect(plan.steps.every((step) => !step.deadline && !step.checkedAt)).toBe(true);
  });
  it("rejects invalid or same-state moves", () => { expect(buildMovePlan("CA","CA",true)).toBeNull(); expect(buildMovePlan("XX","CA",true)).toBeNull(); });
});
