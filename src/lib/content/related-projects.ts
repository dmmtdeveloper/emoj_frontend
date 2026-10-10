/**
 * Navigation from a project page to the rest of the portfolio
 * (src/pages/proyectos/[slug].astro): a rail of other projects, those that
 * share a specialty first, and the previous and next project in list order.
 */

interface Ranked {
  slug: string;
  services: readonly string[];
}

/** Other projects, sharing a specialty first; list order otherwise. */
export function relatedProjects<T extends Ranked>(
  projects: readonly T[],
  current: Ranked,
  limit: number,
): T[] {
  const others = projects.filter((p) => p.slug !== current.slug);
  const shares = (p: T) => p.services.some((s) => current.services.includes(s));
  return [...others.filter(shares), ...others.filter((p) => !shares(p))].slice(
    0,
    limit,
  );
}

/** The projects before and after `slug`, wrapping around the list. */
export function adjacentProjects<T extends { slug: string }>(
  projects: readonly T[],
  slug: string,
): { prev: T | null; next: T | null } {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1 || projects.length < 2) return { prev: null, next: null };
  const at = (i: number) =>
    projects[(i + projects.length) % projects.length] ?? null;
  return { prev: at(index - 1), next: at(index + 1) };
}
