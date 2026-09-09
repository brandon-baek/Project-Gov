export const sourceManifest = [
  { id: "usagov", name: "USA.gov public guidance", method: "Sitemap + respectful HTML extraction", credential: "None", cadence: "Twice monthly", trust: "Discovery; reviewed before publication" },
  { id: "california", name: "CA.gov public guidance", method: "Sitemap + respectful HTML extraction", credential: "None", cadence: "Twice monthly", trust: "Discovery; reviewed before publication" },
  { id: "sam", name: "SAM.gov Assistance Listings", method: "Assistance Listings Public API", credential: "SAM_API_KEY", cadence: "Twice monthly", trust: "Program discovery; eligibility requires review" }
] as const;
