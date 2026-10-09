interface ImportMetaEnv {
  /** Canonical public origin, e.g. https://emoj.cl. */
  readonly PUBLIC_SITE_URL?: string;
  /** Base URL of the EMOJ API, e.g. https://api.emoj.cl. */
  readonly PUBLIC_API_URL?: string;
  /** Cloudflare Turnstile site key (public). */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /**
     * Set by /preview before it rewrites to the item's page: that page shows
     * this draft instead of reading the published item (src/pages/preview.astro).
     */
    preview?:
      | { kind: "project"; project: import("./lib/api/client").ProjectDetail }
      | { kind: "news"; news: import("./lib/api/client").NewsDetail };
  }
}
