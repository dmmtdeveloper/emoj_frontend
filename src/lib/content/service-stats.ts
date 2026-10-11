/**
 * Proof for each service on /servicios: how many published projects list
 * it. A project with several services counts under each one.
 */
export function projectCountByService(
  projects: readonly { services: readonly string[] }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const service of new Set(project.services)) {
      counts.set(service, (counts.get(service) ?? 0) + 1);
    }
  }
  return counts;
}

/** "1 proyecto", "12 proyectos"; empty when there are none yet. */
export function projectCountLabel(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 proyecto" : `${count} proyectos`;
}

/** The projects that list `service`, in the order given (newest first from the API). */
export function projectsOfService<T extends { services: readonly string[] }>(
  projects: readonly T[],
  service: string,
): T[] {
  return projects.filter((project) => project.services.includes(service));
}
