import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="page-shell shell article-page">
      <header className="page-intro"><p className="eyebrow">Privacy</p><h1>GovGuide does not need your identifying numbers.</h1><p>Describe the situation, not the private record.</p></header>
      <section><h2>Do not enter</h2><p>Do not send Social Security numbers, bank or payment card numbers, passport numbers, driver’s license numbers, immigration file numbers, passwords, or full copies of government notices.</p></section>
      <section><h2>Request handling</h2><p>The application does not persist chat messages. The server uses the text long enough to identify a graph route and return a response. Production hosting should keep request-body logging disabled.</p></section>
      <section><h2>Official transactions</h2><p>GovGuide sends you to the responsible government website when personal information or an application is required. Check the domain before entering sensitive data.</p></section>
    </div>
  );
}
