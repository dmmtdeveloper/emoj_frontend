/**
 * A real project photo for each service (shown when hovering its card on
 * the home): the cover of the newest published project of that service.
 * When a project covers several services, a service prefers a photo that no
 * earlier service already shows, and reuses one only if it has no other.
 * Services without a project with a cover are left out. The project's slug
 * comes along to build the image's stable address (media.ts).
 */
import type { MediaRef, ProjectSummary, ServiceSlug } from "../api/client";

export function coversByService(
  services: readonly ServiceSlug[],
  projects: readonly ProjectSummary[],
): Map<ServiceSlug, { slug: string; cover: MediaRef }> {
  const covers = new Map<ServiceSlug, { slug: string; cover: MediaRef }>();
  const used = new Set<string>();
  for (const service of services) {
    const candidates = projects
      .filter((p) => p.services.includes(service))
      .flatMap((p) => (p.cover ? [{ slug: p.slug, cover: p.cover }] : []));
    const pick =
      candidates.find((c) => !used.has(c.cover.url)) ?? candidates[0];
    if (!pick) continue;
    covers.set(service, pick);
    used.add(pick.cover.url);
  }
  return covers;
}
