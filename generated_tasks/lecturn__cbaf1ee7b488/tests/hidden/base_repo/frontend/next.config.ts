import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
  async rewrites() {
    return [
      {
        source: "/stream/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/episodes/:path*`,
      },
    ];
  },
};

export default config;
