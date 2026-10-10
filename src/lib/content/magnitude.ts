/**
 * A project's headline figure ("Caudal 1.200 l/s", API `magnitude`), ready
 * to show on its page: trimmed, or null when the project has none.
 */
import type { components } from "../api/schema";

type Magnitude = components["schemas"]["Magnitude"];

export interface MagnitudeView {
  label: string;
  value: string;
  unit: string;
}

export function projectMagnitude(
  magnitude: Partial<Magnitude> | undefined,
): MagnitudeView | null {
  const value = magnitude?.value?.trim() ?? "";
  if (value === "") return null;
  return {
    label: magnitude?.label?.trim() ?? "",
    value,
    unit: magnitude?.unit?.trim() ?? "",
  };
}
