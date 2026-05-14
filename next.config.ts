import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', 'cheerio', 'turndown', '@resvg/resvg-js', 'satori'],
  async redirects() {
    return [
      { source: '/billing', destination: '/settings/billing', permanent: true },
      { source: '/lenses', destination: '/settings/lenses', permanent: true },
      { source: '/schedule', destination: '/settings/schedule', permanent: true },
    ]
  },
};

export default nextConfig;
