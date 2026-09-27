import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's Next.js adapter handles deployment output itself. Keeping
  // standalone enabled there triggers a Next.js 16.3 build-finalization bug.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/chat": ["./database/migrations/**/*", "./data/govguide.db"]
  },
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["cheerio"]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
