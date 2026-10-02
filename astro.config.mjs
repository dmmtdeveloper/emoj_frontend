// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://emoj.cl",
  output: "static",
  trailingSlash: "ignore",
  integrations: [sitemap()],
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
    build: {
      // Never inline scripts or assets as data:/inline code: the CSP in
      // vercel.ts allows only same-origin scripts (script-src 'self').
      assetsInlineLimit: 0,
    },
  },
});
