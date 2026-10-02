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
