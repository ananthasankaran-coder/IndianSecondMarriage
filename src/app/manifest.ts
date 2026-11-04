import type { MetadataRoute } from "next";

/**
 * Web App Manifest: makes the site installable on Android ("Add to Home screen" / install prompt).
 * Name and colours are placeholders pending decisions D16 (brand name) and D17 (palette).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relationship Discovery Platform",
    short_name: "Discover",
    description: "Intentional relationship discovery for adults.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#2f5f58",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
