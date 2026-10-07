// @ts-check
import node from "@astrojs/node";
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

/**
 * Vercel sets VERCEL=1 in its builds. Anywhere else (Railway, a local
 * `pnpm build`) the site runs as a Node server behind Caddy (Dockerfile,
 * Caddyfile): pages with API content render on every request, so a change
 * in the panel shows on the next visit, with no rebuild.
 */
const onVercel = process.env["VERCEL"] === "1";

/** Public address (canonical URLs, sitemaps); www.emoj.cl once on Railway. */
const site = process.env["PUBLIC_SITE_URL"] || "https://emoj.cl";

const vercelAdapter = () =>
  vercel({
    isr: {
      ...(process.env["REVALIDATE_TOKEN"]
        ? { bypassToken: process.env["REVALIDATE_TOKEN"] }
        : {}),
      expiration: 60 * 60,
      exclude: [/^\/admin\/revalidar$/],
    },
  });

export default defineConfig({
  site,
  // Pages are built ahead of time, except those that show API content (home,
  // projects, news, their images and sitemap): `prerender = false`, rendered
  // on demand. On Vercel they stay in its cache (ISR) and publishing in the
  // panel refreshes them through /admin/revalidar, which sends
  // REVALIDATE_TOKEN; `expiration` is a fallback if that ever fails. On the
  // Node server they are rendered on every request.
  output: "static",
  adapter: onVercel ? vercelAdapter() : node({ mode: "standalone" }),
  security: {
    // Behind Caddy and Railway's edge the request reaches Node over plain
    // HTTP; trust X-Forwarded-Host/Proto for the site's own hosts so
    // Astro.url (and the origin checks of POST routes) see https://.
    allowedDomains: [
      { protocol: "https", hostname: "emoj.cl" },
      { protocol: "https", hostname: "www.emoj.cl" },
      { protocol: "https", hostname: "**.up.railway.app" },
    ],
  },
  trailingSlash: "ignore",
  integrations: [
    // The admin panel (/admin) is React started by a plain module script
    // (src/admin/mount.tsx); no Astro islands, so no inline scripts.
    sitemap({
      // Pages rendered on demand are listed by src/pages/sitemap-content.xml.ts.
      customSitemaps: [new URL("/sitemap-content.xml", site).href],
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
    // Node only: content photos are loaded in-process (src/lib/image-endpoint.ts).
    ...(onVercel
      ? {}
      : {
          endpoint: {
            route: "/_image",
            entrypoint: "./src/lib/image-endpoint.ts",
          },
        }),
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
