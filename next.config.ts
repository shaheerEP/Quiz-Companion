import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,

  async redirects() {
    return [
      {
        source: "/tajweed",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
