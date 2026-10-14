/**
 * The absolute address of a page's share image (og:image, twitter:image).
 *
 * Canonical URLs always use the site (PUBLIC_SITE_URL), but the image must
 * be fetchable from where the page is being shared: before launch the site
 * runs on its Railway address while emoj.cl still serves the old WordPress,
 * where the image does not exist. Pages rendered on demand therefore point
 * at the host that served them; pages built ahead of time only know the
 * site. After launch both are the same.
 */
export function shareImageUrl(
  image: string,
  {
    site,
    origin,
    prerendered,
  }: { site: URL; origin: string; prerendered: boolean },
): string {
  const base =
    !prerendered && /^https?:\/\//.test(origin) ? origin : site.origin;
  return new URL(image, base).href;
}

/**
 * The page address for og:url, from the same host as the share image.
 * WhatsApp falls back to its small preview when og:url names another site
 * than the shared link (before launch: emoj.cl, still the old WordPress).
 * The canonical link keeps the site; after launch both are the same.
 */
export function sharePageUrl(
  pathname: string,
  options: { site: URL; origin: string; prerendered: boolean },
): string {
  return shareImageUrl(pathname, options);
}
