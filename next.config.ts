import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable browser source maps in production for developer inspection and AI reverse engineering
  productionBrowserSourceMaps: true,

  async redirects() {
    return [
      {
        source: "/teachers",
        destination: "/teacher",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
