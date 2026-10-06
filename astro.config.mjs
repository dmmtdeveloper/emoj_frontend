// @ts-check
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { PRIVACY, privacyGaps } from "./src/lib/privacy.ts";

/**
 * API the admin reaches through `/api` in `astro dev` (the Vercel rewrite
 * does the same in production). Read from the shell environment, as
 * correr-sitio-local.cmd sets it, falling back to the local API.
 */
const devApiTarget = process.env["PUBLIC_API_URL"] || "http://localhost:8080";

// https://docs.astro.build/en/reference/configuration-reference/
const privacyReady = privacyGaps(PRIVACY).length === 0;

export default defineConfig({
  site: "https://emoj.cl",
  // Pages are built ahead of time, except those that show API content (home,
  // projects, news, their images and sitemap): `prerender = false`, rendered
  // on demand and kept in Vercel's cache (ISR). Publishing in the panel
  // refreshes them right away through /admin/revalidar, which sends
  // REVALIDATE_TOKEN; `expiration` is a fallback if that ever fails.
  output: "static",
  adapter: vercel({
    isr: {
      ...(process.env["REVALIDATE_TOKEN"]
        ? { bypassToken: process.env["REVALIDATE_TOKEN"] }
        : {}),
      expiration: 60 * 60,
      exclude: [/^\/admin\/revalidar$/],
    },
  }),
  trailingSlash: "ignore",
  integrations: [
    // The admin panel (/admin) is React started by a plain module script
    // (src/admin/mount.tsx); no Astro islands, so no inline scripts.
    sitemap({
      // Pages rendered on demand are listed by src/pages/sitemap-content.xml.ts.
      customSitemaps: ["https://emoj.cl/sitemap-content.xml"],
      filter: (page) => {
        const path = new URL(page).pathname;
        if (path.startsWith("/admin")) return false;
        // The privacy policy is noindex until its gaps are filled.
        if (path.startsWith("/privacidad")) return privacyReady;
        return true;
      },
    }),
  ],
  image: {
    // Content photos are served from this site at stable addresses and
    // resized on demand (src/lib/image-service.ts, src/lib/content/media.ts),
    // never hotlinked from the bucket, so CSP img-src stays 'self'.
    // No remote patterns: /_image only resizes this site's own files.
    service: { entrypoint: "./src/lib/image-service.ts" },
  },
  build: {
    // Always emit CSS as files so the CSP needs no 'unsafe-inline' for styles.
    inlineStylesheets: "never",
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the panel's dependencies when the dev server starts. The
    // news editor (TipTap) loads on demand; discovered late, Vite would
    // re-bundle mid-request and that first load would fail.
    optimizeDeps: {
      include: [
        "react",
        "react-dom/client",
        "@tanstack/react-query",
        "react-hook-form",
        "@hookform/resolvers/zod",
        "zod",
        "lucide-react",
        "@tiptap/react",
        "@tiptap/starter-kit",
      ],
    },
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
