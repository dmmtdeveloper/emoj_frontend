import { SERVICE_SLUGS } from "../services";

/**
 * Refreshing cached pages after the panel changes content.
 *
 * Pages rendered on demand stay cached on Vercel (ISR, astro.config.mjs).
 * After a save, publish, unpublish or delete, the panel posts the change to
 * /admin/revalidar, which asks again for every page that shows that item
 * with the `x-prerender-revalidate` header and the secret REVALIDATE_TOKEN:
 * Vercel renders them fresh and caches the new version, so the change is on
 * the site in seconds instead of after a full rebuild.
 */
export interface ContentChange {
  kind: "news" | "project";
  slug: string;
  /** The slug before this change, when it changed or the item was deleted. */
  previousSlug: string | null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseChange(body: unknown): ContentChange | null {
  if (typeof body !== "object" || body === null) return null;
  const { kind, slug, previousSlug } = body as Record<string, unknown>;
  if (kind !== "news" && kind !== "project") return null;
  if (typeof slug !== "string" || !SLUG.test(slug)) return null;
  if (
    previousSlug !== undefined &&
    previousSlug !== null &&
    (typeof previousSlug !== "string" || !SLUG.test(previousSlug))
  ) {
    return null;
  }
  return { kind, slug, previousSlug: previousSlug ?? null };
}

/**
 * Every page that can show the item. `newsPages` is how many listing pages
 * exist now; one more is refreshed in case the change removed one.
 */
export function pathsToRefresh(
  change: ContentChange,
  newsPages: number,
): string[] {
  const slugs = [change.slug, change.previousSlug].filter(
    (s): s is string => s !== null && s !== "",
  );
  const unique = [...new Set(slugs)];
  if (change.kind === "news") {
    const pages = Array.from(
      { length: Math.max(newsPages, 1) },
      (_, i) => `/noticias/pagina/${i + 2}`,
    );
    return [
      "/noticias",
      ...pages,
      ...unique.map((s) => `/noticias/${s}`),
      "/sitemap-content.xml",
    ];
  }
  return [
    "/",
    "/proyectos",
    "/servicios",
    ...SERVICE_SLUGS.map((service) => `/servicios/${service}`),
    ...unique.map((s) => `/proyectos/${s}`),
    "/sitemap-content.xml",
  ];
}

export async function refreshPaths(
  paths: readonly string[],
  origin: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ refreshed: string[]; failed: string[] }> {
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await fetchImpl(new URL(path, origin), {
          headers: { "x-prerender-revalidate": token },
        });
        await res.body?.cancel();
        return { path, ok: res.ok || res.status === 404 };
      } catch {
        return { path, ok: false };
      }
    }),
  );
  return {
    refreshed: results.filter((r) => r.ok).map((r) => r.path),
    failed: results.filter((r) => !r.ok).map((r) => r.path),
  };
}

/**
 * What /admin/revalidar does after a change:
 * - "fresh": no page cache to refresh, every request already renders the
 *   current content (astro dev, and the Node server on Railway).
 * - "refresh": ask Vercel to render the affected pages again (ISR).
 * - "not-configured": on Vercel without REVALIDATE_TOKEN; the change shows
 *   when the cached pages expire.
 */
export function refreshPolicy(env: {
  dev: boolean;
  onVercel: boolean;
  token: string;
}): "fresh" | "refresh" | "not-configured" {
  if (env.dev || !env.onVercel) return "fresh";
  return env.token ? "refresh" : "not-configured";
}
