/**
 * A real project photo for each service (shown when hovering its card on
 * the home): the cover of the newest published project of that service.
 * When a project covers several services, a service prefers a photo that no
 * earlier service already shows, and reuses one only if it has no other.
 * Services without a project with a cover are left out.
 */
import type { MediaRef, ProjectSummary, ServiceSlug } from "../api/client";

export function coversByService(
  services: readonly ServiceSlug[],
  projects: readonly ProjectSummary[],
): Map<ServiceSlug, MediaRef> {
  const covers = new Map<ServiceSlug, MediaRef>();
  const used = new Set<string>();
  for (const service of services) {
    const candidates = projects
      .filter((p) => p.services.includes(service))
      .flatMap((p) => (p.cover ? [p.cover] : []));
    const cover = candidates.find((c) => !used.has(c.url)) ?? candidates[0];
    if (!cover) continue;
    covers.set(service, cover);
    used.add(cover.url);
  }
  return covers;
}
