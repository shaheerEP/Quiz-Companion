import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent browser source maps in production so developers cannot view original source code
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/tajweed/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

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
