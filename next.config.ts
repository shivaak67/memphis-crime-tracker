import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Next from treating C:/Users/shiva as the monorepo root
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
