import type Database from "better-sqlite3";
import type { Journey } from "@/lib/schema";
import { getDatabase } from "@/lib/database";

const topics = [
  { id: "benefits", title: "Getting benefits or replacing lost income", prompt: "Need help with food, unemployment, income, or public benefits?", terms: ["benefit", "unemployment", "food", "snap", "calfresh", "wic", "medicaid", "medicare", "social-security", "disability", "retirement", "income"] },
  { id: "work", title: "Finding work or dealing with a job problem", prompt: "Looking for work, training, unemployment help, or workplace support?", terms: ["unemployment", "worker", "workplace", "employment", "wage", "labor", "career", "workforce", "apprenticeship"] },
  { id: "housing", title: "Finding housing or keeping your home", prompt: "Looking for housing help, rental support, or a way to address a housing problem?", terms: ["housing", "rent", "mortgage", "eviction", "homeless", "utility", "homeowner"] },
  { id: "health", title: "Getting health care or coverage", prompt: "Looking for health coverage, care, prescriptions, or support for a health need?", terms: ["health", "medicaid", "medicare", "insurance", "clinic", "medical", "prescription", "healthcare"] },
  { id: "family", title: "Caring for a child or family member", prompt: "Need help with family services, child care, adoption, or caregiving?", terms: ["child", "family", "adoption", "guardianship", "childcare", "foster", "caregiver", "birth-certificate"] },
  { id: "education", title: "Paying for school or building skills", prompt: "Exploring student aid, college, school services, or job training?", terms: ["student-aid", "fafsa", "scholarship", "college", "education", "school", "training", "apprenticeship"] },
  { id: "immigration", title: "Immigration, visas, or citizenship", prompt: "Looking for an immigration process, a visa, or help with permanent residency?", terms: ["immigration", "citizen", "green-card", "visa", "naturalization", "uscis", "adjustment-of-status"] },
  { id: "money", title: "Taxes, debt, or managing money", prompt: "Need to file taxes, claim a refund, resolve a debt, or find financial services?", terms: ["tax", "irs", "refund", "money", "finance", "loan", "debt", "retirement", "financial"] },
  { id: "business", title: "Starting or operating a business", prompt: "Starting a company, hiring workers, or looking for business permits and funding?", terms: ["business", "small-business", "permit", "license", "employer-id", "ein", "entrepreneur", "procurement", "grants"] },
  { id: "transport", title: "Driving, vehicles, or transportation", prompt: "Need a driver's license, vehicle service, transit help, or travel documents?", terms: ["driver-license", "dmv", "motor-vehicle", "transportation", "vehicle", "real-id"] },
  { id: "identity", title: "Replacing documents or proving identity", prompt: "Replacing a passport or identity document, or requesting a public record?", terms: ["passport", "social-security-card", "identity-theft", "vital-record", "birth-certificate", "records", "real-id"] },
  { id: "consumer", title: "Reporting fraud or resolving a consumer problem", prompt: "Dealing with a scam, identity theft, unsafe product, or financial complaint?", terms: ["scam", "fraud", "identity-theft", "consumer", "complaint", "report-fraud", "recall"] },
  { id: "emergency", title: "Preparing for or recovering from an emergency", prompt: "Preparing for a disaster or looking for help after one?", terms: ["disaster", "emergency", "flood", "wildfire", "storm", "ready-gov", "disasterassistance"] },
  { id: "civic", title: "Voting or taking part in civic life", prompt: "Registering to vote, voting by mail, or finding election information?", terms: ["vote", "voting", "election", "absentee", "jury", "civic"] },
  { id: "veterans", title: "Veterans and military families", prompt: "Looking for veterans' benefits, disability claims, or military-family services?", terms: ["veteran", "military", "va-gov", "service-member", "defense"] },
  { id: "legal", title: "Finding legal information or government records", prompt: "Looking for court information, legal aid, public records, or an agency?", terms: ["legal", "court", "justice", "attorney", "public-record", "archives", "foia", "agency"] }
];

const lowValuePage = /(?:privacy|accessibility policy|terms of use|press release|news release|newsletter|blog|annual meeting|meeting agenda|photo gallery|archived news|about us|contact us|home page|homepage|home\s*\|)/i;
const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type IndexedPage = { title: string; url: string; publisher: string; agency: string | null };
export type PathwayDiscoveryGroup = { id: string; title: string; prompt: string; why: string; pages: IndexedPage[]; guides: Journey[] };

export function getPathwayDiscovery(verifiedGuides: Journey[], database: Database.Database = getDatabase()): PathwayDiscoveryGroup[] {
  const rows = database.prepare(`
    SELECT s.title, s.url, s.publisher, a.label AS agency
    FROM sources s
    JOIN graph_nodes p ON p.id = s.node_id
    LEFT JOIN graph_edges e ON e.from_node_id = p.id AND e.relation = 'published-by'
    LEFT JOIN graph_nodes a ON a.id = e.to_node_id
    WHERE p.kind = 'source' AND p.status = 'machine-indexed'
    ORDER BY s.title COLLATE NOCASE
  `).all() as IndexedPage[];
  const reviewedUrls = new Set(verifiedGuides.flatMap((guide) => guide.sources.map((source) => source.url)));

  return topics.map((topic) => {
    const guides = verifiedGuides.filter((guide) => {
      const text = clean(`${guide.title} ${guide.summary} ${guide.category} ${guide.aliases.join(" ")} ${guide.sources.map((source) => source.url).join(" ")}`);
      return topic.terms.some((term) => text.includes(clean(term)));
    });
    const byUrl = new Map<string, IndexedPage>();
    for (const row of rows) {
      const text = clean(`${row.title} ${row.url}`);
      if (!reviewedUrls.has(row.url) && !lowValuePage.test(row.title) && topic.terms.some((term) => text.includes(clean(term)))) byUrl.set(row.url, row);
    }
    const pages = [...byUrl.values()];
    const publishers = new Set(pages.map((page) => page.publisher));
    const why = pages.length
      ? `${pages.length} additional machine-indexed government ${pages.length === 1 ? "page" : "pages"} across ${publishers.size} ${publishers.size === 1 ? "publisher" : "publishers"} matched this topic.`
      : guides.length
        ? `A reviewed pathway exists here; its ${guides.reduce((count, guide) => count + guide.sources.length, 0)} cited official sources support the listed steps.`
        : "This common life-situation category is shown to make a coverage gap visible; no matching page has been indexed yet.";
    return { id: topic.id, title: topic.title, prompt: topic.prompt, why, pages, guides };
  }).sort((a, b) => (b.guides.length > 0 ? 1 : 0) - (a.guides.length > 0 ? 1 : 0) || b.pages.length - a.pages.length || a.title.localeCompare(b.title));
}
