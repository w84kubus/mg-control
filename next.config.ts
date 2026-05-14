import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // basePath is set via NEXT_PUBLIC_BASE_PATH env var for GitHub Pages
  // e.g. NEXT_PUBLIC_BASE_PATH=/mg-control
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
