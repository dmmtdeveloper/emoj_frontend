/** Local API used when PUBLIC_API_URL is not set (see .env.example). */
const DEFAULT_API_URL = "http://localhost:8080";

/**
 * Cloudflare's documented test site key: always passes, never shows a
 * challenge. Used only when PUBLIC_TURNSTILE_SITE_KEY is not set.
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export const API_URL = import.meta.env.PUBLIC_API_URL || DEFAULT_API_URL;
export const TURNSTILE_SITE_KEY =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
