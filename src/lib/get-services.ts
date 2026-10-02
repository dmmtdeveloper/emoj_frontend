import { getCollection, type CollectionEntry } from "astro:content";

export type Service = CollectionEntry<"servicios">;

/** All services in display order. Fails the build if a file name and slug differ. */
export async function getServices(): Promise<Service[]> {
  const services = await getCollection("servicios");
  for (const service of services) {
    if (service.id !== service.data.slug) {
      throw new Error(
        `Service file "${service.id}.md" must be named after its slug "${service.data.slug}".`,
      );
    }
  }
  return services.sort((a, b) => a.data.order - b.data.order);
}

/** Display title of every service, by API slug. */
export async function getServiceTitles(): Promise<Record<string, string>> {
  const services = await getServices();
  return Object.fromEntries(services.map((s) => [s.data.slug, s.data.title]));
}
