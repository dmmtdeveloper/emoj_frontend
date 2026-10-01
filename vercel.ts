import { routes } from "@vercel/config/v1";
import type { VercelConfig } from "@vercel/config/v1";

// Typed Vercel project configuration. The Vercel CLI compiles this file to
// vercel.json at build time. Redirects from the legacy site land in Phase 14.
const config: VercelConfig = {
  framework: "astro",
  installCommand: "pnpm install --frozen-lockfile",
  buildCommand: "pnpm build",
  outputDirectory: "dist",
  headers: [
    routes.header("/(.*)", [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-Frame-Options", value: "DENY" },
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
