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

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
