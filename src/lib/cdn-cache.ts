/**
 * Images are resized on demand (Astro's `/_image` endpoint) and content
 * images are streamed from `/media/...` (src/lib/content/media.ts). Both
 * answer for good: the address changes when the image does. This header
 * tells Vercel's CDN to keep them, so each size is processed once instead
 * of once per visitor. Pages are cached separately (ISR, astro.config.mjs).
 */
const YEAR = "max-age=31536000";

export function edgeCacheHeader(
  pathname: string,
  status: number,
): string | null {
  if (status !== 200) return null;
  if (pathname === "/_image" || pathname.startsWith("/media/")) return YEAR;
  return null;
}
