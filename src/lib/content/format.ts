import type { ProjectSummary, ServiceSlug } from "../api/client";
import { SERVICE_SLUGS } from "../services";

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Santiago",
});

/** "18 de diciembre de 2025": a publication date, as read in Chile. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Articles per page in the news index. */
export const NEWS_PER_PAGE = 12;

/** Split items into consecutive pages; always at least one (maybe empty). */
export function paginate<T>(items: readonly T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length > 0 ? pages : [[]];
}

/** Share URLs for an article (no third-party scripts involved). */
export function shareLinks(url: string, title: string) {
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  };
}

export interface Facet<T extends string> {
  value: T;
  count: number;
}

/** Filter options present in a project list, with how many projects each. */
export function projectFacets(projects: readonly ProjectSummary[]): {
  services: Facet<ServiceSlug>[];
  regions: Facet<string>[];
} {
  const services = new Map<ServiceSlug, number>();
  const regions = new Map<string, number>();
  for (const project of projects) {
    for (const service of new Set(project.services)) {
      services.set(service, (services.get(service) ?? 0) + 1);
    }
    const region = project.region.trim();
    if (region) regions.set(region, (regions.get(region) ?? 0) + 1);
  }
  return {
    services: SERVICE_SLUGS.filter((slug) => services.has(slug)).map(
      (value) => ({ value, count: services.get(value) ?? 0 }),
    ),
    regions: [...regions.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([value, count]) => ({ value, count })),
  };
}

/** Up to two initials (first and second word) for an avatar. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("es"))
    .join("");
}

/** Dimensions of an image scaled down (never up) to at most `max` wide. */
export function fitWidth(
  size: { width: number; height: number },
  max: number,
): { width: number; height: number } {
  if (size.width <= max) return { width: size.width, height: size.height };
  return {
    width: max,
    height: Math.max(1, Math.round((size.height * max) / size.width)),
  };
}
