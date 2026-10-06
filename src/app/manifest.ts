import type { MetadataRoute } from "next";

/** Lets the site be installed to a phone's home screen or a desktop like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Younglings",
    short_name: "Younglings",
    description: "The Younglings clan hub — stats, events, polls and recaps.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c10",
    theme_color: "#d4af37",
    icons: [
      { src: "/clan-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/clan-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
