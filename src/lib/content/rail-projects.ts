/**
 * The projects of the home rail ("Ya son obra."): every published project,
 * the featured ones first, each group in the order the API gives (newest
 * first), up to `limit`.
 */
export function railProjects<T extends { featured: boolean }>(
  projects: readonly T[],
  limit: number,
): T[] {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  return [...featured, ...others].slice(0, limit);
}
