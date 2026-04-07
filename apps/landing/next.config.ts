import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export for Netcup webhosting
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
