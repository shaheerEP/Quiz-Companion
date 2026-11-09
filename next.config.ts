import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
