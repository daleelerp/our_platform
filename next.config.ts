import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "daleel.site",
          },
        ],
        destination: "https://www.daleel.site",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
