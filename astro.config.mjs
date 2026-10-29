// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { canonicalPath } from "./src/lib/canonical.ts";
import { inContentSitemap } from "./src/lib/content/sitemap.ts";
import { PRIVACY, privacyGaps } from "./src/lib/privacy.ts";

// https://docs.astro.build/en/reference/configuration-reference/
const privacyReady = privacyGaps(PRIVACY).length === 0;

/** Public address (canonical URLs, sitemaps); www.emoj.cl once on Railway. */
const site = process.env["PUBLIC_SITE_URL"] || "https://emoj.cl";

export default defineConfig({
  site,
  // Every page is built ahead of time: projects and news are content
  // collections in src/content, so publishing is a git push and a rebuild.
  // No adapter and no server: `dist/` is plain files (vercel.ts, Caddyfile).
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      // The home, projects and news are listed with their dates by
      // src/pages/sitemap-content.xml.ts.
      customSitemaps: [new URL("/sitemap-content.xml", site).href],
      filter: (page) => {
        const path = new URL(page).pathname;
        if (inContentSitemap(path)) return false;
        // The privacy policy is noindex until its gaps are filled.
        if (path.startsWith("/privacidad")) return privacyReady;
        return true;
      },
      // List each page at its canonical URL (BaseLayout), without the
      // trailing slash of the built directory.
      serialize: (item) => ({
        ...item,
        url: new URL(canonicalPath(new URL(item.url).pathname), site).href,
      }),
    }),
  ],
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
