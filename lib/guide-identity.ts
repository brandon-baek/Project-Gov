export function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hostname = url.hostname.replace(/^www\./, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString().replace(/\/$/, "");
}

export function guideIdentity(guide: { title: string; jurisdiction: string; state?: string; locality?: string; officialUrl: string }) {
  const host = new URL(guide.officialUrl).hostname.replace(/^www\./, "");
  return [guide.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), guide.jurisdiction, guide.state ?? "", guide.locality?.toLowerCase() ?? "", host].join("|");
}
