import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source; let Next compile it.
  transpilePackages: ["@kims-planner/core"],
  poweredByHeader: false,
};

export default nextConfig;
