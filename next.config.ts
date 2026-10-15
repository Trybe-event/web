import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only packages out of the client bundle as the app grows.
  reactStrictMode: true,
};

export default nextConfig;
