import type { NextConfig } from "next";

/**
 * Static export so the same build output (`out/`) works for BOTH:
 *   - the Wails desktop app (embedded as the webview frontend), and
 *   - the standalone web build (served by any static file server).
 *
 * Wails injects `window.go` at runtime; the app feature-detects it to switch
 * between the native (Wails) and browser (web) implementations. No separate
 * build target is needed.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // No Node server in static export -> image optimization must be off.
    unoptimized: true,
  },
  // The editor is a single client-side page; nothing to optimize per-route.
  reactStrictMode: true,
};

export default nextConfig;
