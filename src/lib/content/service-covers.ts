/**
 * A real project photo for each service (shown when hovering its card on
 * the home): the cover of the newest published project of that service.
 * When a project covers several services, a service prefers a photo that no
 * earlier service already shows, and reuses one only if it has no other.
 * Services without a project with a cover are left out. The project's slug
 * comes along with the photo.
 */
import type { ServiceSlug } from "../services";
import type { ContentImage, ProjectSummary } from "./types";

export function coversByService(
  services: readonly ServiceSlug[],
  projects: readonly ProjectSummary[],
): Map<ServiceSlug, { slug: string; cover: ContentImage }> {
  const covers = new Map<ServiceSlug, { slug: string; cover: ContentImage }>();
  const used = new Set<string>();
  for (const service of services) {
    const candidates = projects
      .filter((p) => p.services.includes(service))
      .flatMap((p) => (p.cover ? [{ slug: p.slug, cover: p.cover }] : []));
    const pick =
      candidates.find((c) => !used.has(c.cover.src.src)) ?? candidates[0];
    if (!pick) continue;
    covers.set(service, pick);
    used.add(pick.cover.src.src);
  }
  return covers;
}
