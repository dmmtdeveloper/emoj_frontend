import { routes } from "@vercel/config/v1";
import type { VercelConfig } from "@vercel/config/v1";

// Typed Vercel project configuration. The site is fully static
// (astro.config.mjs `output: "static"`, no adapter), so Vercel serves the
// files Astro writes to dist/. The Vercel CLI compiles this file to
// vercel.json at build time. The Caddyfile (Railway) sends the same
// headers and redirects (tests/caddyfile.test.ts).

/**
 * Content Security Policy for the static Astro build.
 *
 * - Scripts: Astro emits every processed <script> as a same-origin module
 *   (`build.inlineStylesheets: "never"` and `assetsInlineLimit: 0` in
 *   astro.config.mjs keep CSS and JS out of the HTML), so `'self'` is
 *   enough. JSON-LD blocks are data, not executed, so CSP does not apply to
 *   them. No 'unsafe-inline', no 'unsafe-eval', no third-party scripts.
 * - Styles: same-origin stylesheets only.
 * - img-src / connect-src: the site's own origin. Photos are optimised at
 *   build time (astro:assets) and the site calls no API.
 * - Frames: none. The site embeds no third-party content.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Old WordPress addresses (emoj.cl before the redesign) and where they live
 * now. Permanent (301) so search engines move their ranking to the new page.
 * The four real articles keep their content under a new slug; placeholder
 * posts, categories, tags and the author archive go to the news index; the
 * old admin entry points go home (the site has no panel). Exact paths
 * first: Vercel uses the first match. The Caddyfile (Railway) has the same
 * rules (tests/caddyfile.test.ts).
 */
const legacyRedirects: [source: string, destination: string][] = [
  ["/archivo/2939", "/noticias/visita-tecnica-canal-la-petaca"],
  ["/archivo/2899", "/noticias/de-sitios-abandonados-a-plazas-comunitarias"],
  ["/archivo/2873", "/noticias/redisenar-para-evolucionar"],
  ["/archivo/2841", "/noticias/emojita-supervisora-felina"],
  ["/archivo/:path*", "/noticias"],
  ["/jobs/:path*", "/contacto"],
  ["/feed/:path*", "/noticias"],
  ["/comments/feed", "/noticias"],
  ["/wp-admin/:path*", "/"],
  ["/wp-login.php", "/"],
];

const config: VercelConfig = {
  framework: "astro",
  installCommand: "pnpm install --frozen-lockfile",
  buildCommand: "pnpm build",
  outputDirectory: "dist",
  redirects: legacyRedirects.map(([source, destination]) => ({
    source,
    destination,
    statusCode: 301,
  })),
  headers: [
    routes.header("/(.*)", [
      { key: "Content-Security-Policy", value: csp },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-Frame-Options", value: "DENY" },
      // Prerender pages on hover or press (public/speculationrules.json), so
      // the card-to-cover transition has its photo on the first visit.
      { key: "Speculation-Rules", value: '"/speculationrules.json"' },
    ]),
    // Browsers only read speculation rules sent with their own type.
    routes.header("/speculationrules.json", [
      { key: "Content-Type", value: "application/speculationrules+json" },
    ]),
    // Hashed build assets never change, so they can be cached forever.
    routes.cacheControl("/_astro/(.*)", {
      public: true,
      maxAge: "1 year",
      immutable: true,
    }),
  ],
};

export default config;
