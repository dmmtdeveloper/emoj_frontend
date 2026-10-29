/**
 * The streets around the office (Federico Errázuriz 843, Quilpué), traced
 * as a schematic plan for chapter 08: straight or gently angled centre
 * lines, in the plan's own units. Only the street geometry; no businesses
 * or landmarks.
 *
 * The office is at (320, 315) and the plan's viewBox is centred on it, so
 * the pin stands in the middle of the map at any crop.
 */
export const OFFICE_MAP = {
  viewBox: "-120 36 880 558",
  office: { x: 320, y: 315 },
} as const;

export type StreetKind = "avenue" | "main" | "street" | "minor";

export interface Street {
  name: string;
  kind: StreetKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /**
   * Where the name goes along the street, and how far off it; `wide`
   * names show only on wide maps (on narrow ones the address card sits
   * under the pin, over them).
   */
  label: { share: number; offset: number; wide?: boolean };
}

/** In drawing order: the avenues first, then the streets, then the rest. */
export const STREETS: readonly Street[] = [
  {
    name: "Av. Los Carrera",
    kind: "avenue",
    from: { x: -130, y: 526 },
    to: { x: 770, y: 554 },
    label: { share: 0.3, offset: 15 },
  },
  {
    name: "Blanco Encalada",
    kind: "main",
    from: { x: -130, y: 87 },
    to: { x: 770, y: 225 },
    label: { share: 0.8, offset: 12 },
  },
  {
    name: "Federico Errázuriz",
    kind: "street",
    from: { x: 268, y: 36 },
    to: { x: 262, y: 594 },
    label: { share: 0.74, offset: 10, wide: true },
  },
  {
    name: "Francisco Costello",
    kind: "street",
    from: { x: 30, y: 296 },
    to: { x: 375, y: 318 },
    label: { share: 0.42, offset: 10 },
  },
  {
    name: "Thompson",
    kind: "street",
    from: { x: 28, y: 36 },
    to: { x: 31, y: 594 },
    label: { share: 0.32, offset: 10 },
  },
  {
    name: "David Cortés",
    kind: "street",
    from: { x: 503, y: 184 },
    to: { x: 497, y: 594 },
    label: { share: 0.73, offset: 10, wide: true },
  },
  {
    name: "Caupolicán",
    kind: "street",
    from: { x: 730, y: 36 },
    to: { x: 722, y: 594 },
    label: { share: 0.8, offset: 10 },
  },
  {
    name: "Chorrillos",
    kind: "minor",
    from: { x: 466, y: 36 },
    to: { x: 472, y: 179 },
    label: { share: 0.45, offset: 10 },
  },
  {
    name: "Araya",
    kind: "minor",
    from: { x: 708, y: 36 },
    to: { x: 688, y: 212 },
    label: { share: 0.4, offset: 10 },
  },
  {
    name: "Zenteno",
    kind: "minor",
    from: { x: 209, y: 36 },
    to: { x: 148, y: 131 },
    label: { share: 0.45, offset: 10 },
  },
];
