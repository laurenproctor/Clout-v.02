import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', 'cheerio', 'turndown'],
};

export default nextConfig;
