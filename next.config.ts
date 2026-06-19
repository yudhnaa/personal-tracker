import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["drizzle-orm", "pg"],
};

export default nextConfig;
