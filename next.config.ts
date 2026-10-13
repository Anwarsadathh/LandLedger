import type { NextConfig } from "next";

// NOTE: Next 16's create-next-app enables `cacheComponents` (dynamicIO) by
// default, which makes any uncached dynamic data access throw unless wrapped in
// Suspense / `use cache`. For this Phase-1 slice we read from MongoDB at request
// time, so we keep standard dynamic rendering and opt pages into dynamic mode
// explicitly where needed. Re-introduce cacheComponents later behind proper
// Suspense boundaries if the caching win is worth it.
const nextConfig: NextConfig = {
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
