import { routes } from "@vercel/config/v1";
import type { VercelConfig } from "@vercel/config/v1";

// Typed Vercel project configuration. The Vercel CLI compiles this file to
// vercel.json at build time. Redirects from the legacy site land in Phase 14.
// `/api/*` is rewritten to the API so the admin panel calls it same-origin
// and the session cookie is first-party (see emoj_backend README, Admin API).

/** Staging API, allowed when PUBLIC_API_URL is not available at config time. */
const STAGING_API_ORIGIN = "https://api-staging-25e9.up.railway.app";
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
/** Railway buckets (virtual-hosted style), as in astro.config.mjs. */
const MEDIA_ORIGIN = "https://*.t3.storageapi.dev";

function apiOrigin(): string {
  const raw = process.env["PUBLIC_API_URL"];
  if (!raw) return STAGING_API_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return STAGING_API_ORIGIN;
  }
}

const connectSources = [
  ...new Set(["'self'", apiOrigin(), STAGING_API_ORIGIN]),
];

/**
 * Content Security Policy for the static Astro build.
 *
 * - Scripts: Astro emits every processed <script> as a same-origin module
 *   (`build.inlineStylesheets: "never"` and `assetsInlineLimit: 0` in
 *   astro.config.mjs keep CSS and JS out of the HTML), so `'self'` plus
 *   Turnstile is enough. JSON-LD blocks are data, not executed, so CSP does
 *   not apply to them. No 'unsafe-inline', no 'unsafe-eval'.
 * - Styles: same-origin stylesheets only.
 * - connect-src: the API origin (from PUBLIC_API_URL when Vercel exposes it
 *   while compiling this file) plus the staging API as a fallback.
 * - Turnstile renders inside an iframe from challenges.cloudflare.com.
 * - img-src: the admin panel shows media straight from the Railway bucket
 *   (presigned URLs, <bucket>.t3.storageapi.dev); the public site only
 *   serves images optimized at build time from its own origin.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' ${TURNSTILE_ORIGIN}`,
  "style-src 'self'",
  `img-src 'self' data: ${MEDIA_ORIGIN}`,
  "font-src 'self'",
  `connect-src ${connectSources.join(" ")}`,
  `frame-src ${TURNSTILE_ORIGIN}`,
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
 * posts, categories, tags and the author archive go to the news index. Exact
 * paths first: Vercel uses the first match. The Caddyfile (Railway) has the
 * same rules (tests/caddyfile.test.ts).
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
  ["/wp-admin/:path*", "/admin/login"],
  ["/wp-login.php", "/admin/login"],
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
  rewrites: [routes.rewrite("/api/(.*)", `${apiOrigin()}/$1`)],
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
    ]),
    // The admin panel is private: never indexed, never cached by proxies.
    routes.header("/admin(.*)", [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Cache-Control", value: "no-store" },
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
