export const GUIDE_GROUPS = [
  { id: "identity-civic", title: "Identity, immigration, and civic life", description: "Documents, records, immigration, voting, and public participation." },
  { id: "money-benefits", title: "Money, benefits, and taxes", description: "Financial help, taxes, retirement, and household support." },
  { id: "work-learning", title: "Work, business, and education", description: "Jobs, training, student aid, licenses, and starting a business." },
  { id: "family-health", title: "Family and health", description: "Health coverage, children, caregiving, and family services." },
  { id: "safety-legal", title: "Safety, legal help, and emergencies", description: "Courts, fraud, disasters, consumer protection, and recovery." },
  { id: "travel-moving", title: "Travel, vehicles, and moving", description: "Passports, driving, transportation, and address changes." },
  { id: "military", title: "Military and veterans", description: "Benefits, records, and support for service members and families." },
] as const;

export type GuideGroupId = typeof GUIDE_GROUPS[number]["id"];

export function guideGroupForCategory(category: string): GuideGroupId {
  const value = category.toLowerCase();
  if (/veteran|military/.test(value)) return "military";
  if (/driv|transport|moving|address/.test(value)) return "travel-moving";
  if (/emerg|disaster|scam|safety|consumer|law|court|public safety/.test(value)) return "safety-legal";
  if (/health|child|famil|food|household|care/.test(value)) return "family-health";
  if (/job|work|business|permit|education|training/.test(value)) return "work-learning";
  if (/benefit|financial|tax|money|retirement/.test(value)) return "money-benefits";
  return "identity-civic";
}
