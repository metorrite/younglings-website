import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The wheel's GIF is drawn on the server with a native canvas library; it has to be loaded as it is, not bundled.
  serverExternalPackages: ["@napi-rs/canvas"],
  // Server Actions default to a 1 MB body; a welcome embed's picture may be up to 2 MB (the bot enforces the real limit).
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
