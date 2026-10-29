/**
 * The path of a page's canonical URL (and og:url), without a trailing
 * slash: the static build sees `/proyectos/<slug>/`, while the sitemaps and
 * links use `/proyectos/<slug>`. Both addresses serve the page
 * (`trailingSlash: "ignore"`); the canonical names one of them.
 */
export function canonicalPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}
