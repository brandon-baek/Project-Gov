import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "GovGuide", template: "%s · GovGuide" },
  description: "Discover source-linked routes through federal, state, and local government services.",
  metadataBase: new URL(siteUrl),
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7182652983612572"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
