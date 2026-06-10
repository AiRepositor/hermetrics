import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  ...(isGitHubPages ? {
    output: 'export',
    basePath: '/hermetrics',
    images: { unoptimized: true },
  } : {}),
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
