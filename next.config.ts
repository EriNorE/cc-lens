import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// When run via `npx`, a lockfile also exists above this package (npx cache root).
// Without an explicit root, Turbopack can pick the wrong workspace and fail to resolve
// `.next/dev/.../build-manifest.json` for the app.
const packageRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
    webpackMemoryOptimizations: true,
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
  },
  turbopack: {
    root: packageRoot,
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          // unsafe-inline + unsafe-eval needed for Next.js dev mode + Recharts
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'",
        },
      ],
    },
  ],
};

export default nextConfig;
