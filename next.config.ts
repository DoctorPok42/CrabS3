import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '150mb',
  },
  async headers() {
    return [
      {
        source: "/:path(file|secret|dashboard|admin|logs|me|services|communication|secrets|auth|api)/:rest*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" }],
      },
    ];
  },
};

export default nextConfig;
