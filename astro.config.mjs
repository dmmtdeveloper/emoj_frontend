// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

/**
 * API the admin reaches through `/api` in `astro dev` (the Vercel rewrite
 * does the same in production). Read from the shell environment, as
 * correr-sitio-local.cmd sets it, falling back to the local API.
 */
const devApiTarget = process.env["PUBLIC_API_URL"] || "http://localhost:8080";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://emoj.cl",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    // The admin panel (/admin) is a client-only React island.
    react(),
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith("/admin") }),
  ],
  image: {
    // Project and news photos come from the API as presigned, expiring URLs.
    // They are downloaded and optimized at build time (astro:assets) and
    // served from this site, never hotlinked, so CSP img-src stays 'self'.
    remotePatterns: [
      // Railway buckets (virtual-hosted style: <bucket>.t3.storageapi.dev).
      { protocol: "https", hostname: "**.t3.storageapi.dev" },
      // Local SeaweedFS from the backend's docker compose (path style).
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
  },
  build: {
    // Always emit CSS as files so the CSP needs no 'unsafe-inline' for styles.
    inlineStylesheets: "never",
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Same-origin API for the admin in development, like the Vercel
      // rewrite in production: the session cookie stays first-party.
      proxy: {
        "/api": {
          target: devApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      // Never inline scripts or assets as data:/inline code: the CSP in
      // vercel.ts allows only same-origin scripts (script-src 'self').
      assetsInlineLimit: 0,
    },
  },
});
