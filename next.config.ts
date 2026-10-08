import type { NextConfig } from "next";

// The national snapshot is hundreds of MB. Mount it in a persistent backend
// through GOVROUTE_REGISTRY_PATH; serverless bundles must not include it by default.
const registryFiles = process.env.GOVROUTE_BUNDLE_REGISTRY === "true"
  ? ["./data/govroute-locations.db"] : [];
const nextConfig: NextConfig = {
  // Vercel's Next.js adapter handles deployment output itself. Keeping
  // standalone enabled there triggers a Next.js 16.3 build-finalization bug.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/chat": ["./database/migrations/**/*", "./data/govguide.db", ...registryFiles],
    "/api/places": registryFiles,
    "/api/location/resolve": registryFiles,
    "/api/catalog": ["./data/govguide.db"],
    "/graph": ["./data/govguide.db"],
    "/data": registryFiles
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
