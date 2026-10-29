/**
 * Service slugs, in display order. Each one names a file in
 * src/content/servicios and is what projects list in `services`.
 */
export const SERVICE_SLUGS = [
  "obras-sanitarias",
  "obras-viales",
  "calculo-estructural",
  "estudios-de-transito",
  "proyectos-arquitectonicos",
  "geotecnia",
  "aguas-lluvias",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/** Lucide icons allowed for services (kept explicit to stay tree-shakable). */
export const SERVICE_ICONS = [
  "droplets",
  "route",
  "bridge",
  "traffic-cone",
  "drafting-compass",
  "layers",
  "cloud-rain",
] as const;

export type ServiceIconName = (typeof SERVICE_ICONS)[number];

export function isServiceSlug(value: string): value is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(value);
}
