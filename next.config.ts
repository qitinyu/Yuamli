import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT set "output: standalone" — Vercel handles its own output format
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;