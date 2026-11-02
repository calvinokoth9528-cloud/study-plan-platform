import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Server-rendered auth (cookies) throughout; keep standard dynamic rendering.
     cacheComponents (Next 16 experimental) requires Suspense-wrapping every
     cookies() access, which is unnecessary here. */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
