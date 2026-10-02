import type { ServiceSlug } from "./api/client";

/**
 * Service slugs, in the API's order. Must match `ServiceSlug` in the
 * generated OpenAPI types; `tests/services.test.ts` fails if they drift.
 */
export const SERVICE_SLUGS = [
  "obras-sanitarias",
  "obras-viales",
  "calculo-estructural",
  "estudios-de-transito",
  "proyectos-arquitectonicos",
  "geotecnia",
  "aguas-lluvias",
] as const satisfies readonly ServiceSlug[];

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
