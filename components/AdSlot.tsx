"use client";

import { useEffect } from "react";

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[]; }
}

export function AdSlot({ position }: { position: "guide-inline" | "guide-end" }) {
  const slot = position === "guide-inline" ? process.env.NEXT_PUBLIC_ADSENSE_GUIDE_INLINE_SLOT : process.env.NEXT_PUBLIC_ADSENSE_GUIDE_END_SLOT;
  useEffect(() => {
    if (!slot) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Ad blockers can prevent initialization. */ }
  }, [slot]);
  if (!slot) return null;
  return <aside className="ad-placement" aria-label="Advertisement"><span>Advertisement</span><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client="ca-pub-7182652983612572" data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
