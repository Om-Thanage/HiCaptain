import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Prompt coding agents about Next.js security releases only.
    agentUpgrade: "security",
  },
};

export default nextConfig;
