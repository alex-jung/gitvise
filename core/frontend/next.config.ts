import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@gitvise/ui"],
  compiler: {
    // Strip all console.* calls from the production bundle
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
