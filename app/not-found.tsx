import Link from "next/link";

export default function NotFound() {
  return <div className="state-page shell"><span>404</span><h1>That route isn’t in the guide.</h1><p>The page may have moved, or this process may not be covered yet.</p><div><Link className="primary-action" href="/">Describe what you need</Link><Link className="quiet-action" href="/guides">Browse all guides</Link></div></div>;
}
