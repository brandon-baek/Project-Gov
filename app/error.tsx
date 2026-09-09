"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="state-page shell"><span>Something went wrong</span><h1>We couldn’t load this route.</h1><p>Your request was not submitted. Try again, or return to the guide index.</p><div><button className="primary-action" onClick={reset}>Try again</button><Link className="quiet-action" href="/guides">Browse guides</Link></div></div>;
}
