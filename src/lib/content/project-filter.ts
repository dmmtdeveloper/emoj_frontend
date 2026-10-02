/**
 * Pure logic of the /proyectos filter (service and region). The page renders
 * every project; the browser script hides the ones that do not match.
 */

export interface FilterState {
  /** Service slug, or "" for any. */
  service: string;
  /** Region name, or "" for any. */
  region: string;
}

export interface FilterOptions {
  services: readonly string[];
  regions: readonly string[];
}

export interface FilterItem {
  services: readonly string[];
  region: string;
}

const SERVICE_PARAM = "servicio";
const REGION_PARAM = "region";

export function matchesFilter(item: FilterItem, state: FilterState): boolean {
  return (
    (state.service === "" || item.services.includes(state.service)) &&
    (state.region === "" || item.region === state.region)
  );
}

/** Read the filter from a query string, ignoring values not offered. */
export function readFilter(
  search: string,
  options: FilterOptions,
): FilterState {
  const params = new URLSearchParams(search);
  const service = params.get(SERVICE_PARAM) ?? "";
  const region = params.get(REGION_PARAM) ?? "";
  return {
    service: options.services.includes(service) ? service : "",
    region: options.regions.includes(region) ? region : "",
  };
}

/** Write the filter into a query string, keeping unrelated parameters. */
export function writeFilter(search: string, state: FilterState): string {
  const params = new URLSearchParams(search);
  params.delete(SERVICE_PARAM);
  params.delete(REGION_PARAM);
  if (state.service) params.set(SERVICE_PARAM, state.service);
  if (state.region) params.set(REGION_PARAM, state.region);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
