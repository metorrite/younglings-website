import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The wheel's GIF is drawn on the server with a native canvas library; it has to be loaded as it is, not bundled.
  serverExternalPackages: ["@napi-rs/canvas"],
  // Server Actions default to a 1 MB body; a welcome embed's picture may be up to 2 MB (the bot enforces the real limit).
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // The bot's pages used to live under /admin; they are on the bot dashboard now. Each old address goes (permanently) to /dashboard/go/<page>, which
  // finds the visitor's home server and forwards to /dashboard/<server>/<page>.
  async redirects() {
    const moved: [string, string][] = [
      ["attention", "attention"],
      ["promotions", "promotions"],
      ["clan", "clan-points"],
      ["clan-website", "clan-website"],
      ["tracking", "tracking"],
      ["pvm-help", "pvm-help"],
      ["welcome", "welcome"],
      ["post", "post"],
      ["scheduled", "scheduled"],
      ["roles", "self-roles"],
      ["members", "members"],
      ["audit", "audit"],
      ["community", "community"],
      ["tickets", "tickets"],
    ];
    return moved.flatMap(([from, to]) => [
      { source: `/admin/${from}`, destination: `/dashboard/go/${to}`, permanent: true },
      { source: `/admin/${from}/:path*`, destination: `/dashboard/go/${to}/:path*`, permanent: true },
    ]);
  },
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
