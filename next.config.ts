import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from generating extra files in the repo root.
  agentRules: false,
};

export default nextConfig;
