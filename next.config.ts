import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jsdom', '@mozilla/readability', 'canvas', 'cheerio', 'turndown'],
};

export default nextConfig;
