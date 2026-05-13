import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', 'cheerio', 'turndown', '@resvg/resvg-js', 'satori'],
};

export default nextConfig;
