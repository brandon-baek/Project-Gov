import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { processJourneys } from "@/lib/process-catalog";
const fixtures=vi.hoisted(()=>({local:"census:municipality:4812345"}));
vi.mock("@/lib/database",()=>({getStoredJourneys:()=>({journeys:[],storage:"fixture"})}));
vi.mock("@/lib/discovered-guides",()=>({retrieveDiscoveredGuides:()=>[]}));
vi.mock("@/lib/ai-router",()=>({routeWithAI:vi.fn()}));
vi.mock("@/lib/local-resources",()=>({localResources:async()=>[]}));
vi.mock("@/lib/place-registry",()=>({
  contextForPlaces:async(ids:string[])=>({
    places:ids.map(id=>({id,name:id,kind:"municipality",state_code:"TX",government_status:"active"})),
    relations:[],authorities:[],unresolved:[],precision:"municipality"
  }),
  relevantLegalSources:async()=>[]
}));
vi.mock("@/lib/process-registry",()=>({publishedProcesses:async(state:string|undefined,ids:string[])=>({
  journeys:state==="TX"&&ids.includes(fixtures.local)?[{
    ...processJourneys[0],id:"fixture-building-permit",slug:"fixture-building-permit",
    title:"Apply for a building permit",summary:"Follow the reviewed building permit application.",
    category:"Construction",aliases:["building permit"],jurisdiction:"local",state:"TX",
    territoryIds:[fixtures.local]
  }]:[],
  storage:"registry-process-catalog"
})}));
import { POST } from "./route";
async function ask(id:string) {
  return (await POST(new NextRequest("https://govroute.test/api/chat",{
    method:"POST",body:JSON.stringify({message:"Apply for a building permit",state:"TX",placeIds:[id]})
  }))).json();
}
describe("local process routing",()=>{
  it("serves the reviewed local procedure before the generic coverage gap",async()=>{
    const result=await ask(fixtures.local);
    expect(result.status).toBe("matched");
    expect(result.journey.id).toBe("fixture-building-permit");
    expect(result.provenance.processStorage).toBe("registry-process-catalog");
  });
  it("keeps the procedure out of another municipality",async()=>{
    const result=await ask("census:municipality:4899999");
    expect(result.status).toBe("coverage_gap");
    expect(result.journey).toBeUndefined();
    expect(result.missing).toContain("Reviewed local procedure");
  });
});
