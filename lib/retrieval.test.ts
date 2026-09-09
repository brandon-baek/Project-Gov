import { describe, expect, it } from "vitest";
import { classifyRetrieval, retrieveJourneys } from "@/lib/retrieval";
import { findSensitiveData } from "@/lib/safety";
import { buildGraph } from "@/lib/graph";

describe("grounded journey retrieval", () => {
  it.each([
    ["I lost my passport and need another one", "journey-passport-lost"],
    ["I was laid off in California", "journey-ca-unemployment"],
    ["How do I get food stamps in CA?", "journey-calfresh"],
    ["Someone opened an account using my SSN", "journey-identity-theft"],
    ["I need an EIN for my new company", "journey-ein"],
    ["Help me fill out FAFSA", "journey-fafsa"]
  ])("routes %s", (query, expected) => {
    const matches = retrieveJourneys(query);
    expect(matches[0]?.journey.id).toBe(expected);
    expect(classifyRetrieval(matches)).toBe("matched");
  });

  it("does not force a pathway for an unrelated question", () => {
    expect(classifyRetrieval(retrieveJourneys("What is the weather tomorrow?"))).toBe("unsupported");
  });

  it("detects sensitive identifiers", () => {
    expect(findSensitiveData("My SSN is 123-45-6789")).toContain("Social Security number");
  });

  it("builds supported step-to-source edges", () => {
    const graph = buildGraph();
    expect(graph.nodes.some((node) => node.kind === "journey")).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === "supported-by")).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === "next")).toBe(true);
  });
});
