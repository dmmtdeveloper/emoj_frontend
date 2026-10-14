/**
 * Header over the home hero: transparent at the top, solid `surface` once
 * the page scrolls. A CSS scroll-driven animation paints the first frame;
 * src/scripts/motion.ts then writes `--header-solid` (0..1) from the scroll
 * position, because Chrome can leave that timeline inactive (a restored
 * tab, for example) and the bar then showed solid over the photo. This is
 * the script's pure logic. Without JavaScript or the timeline, the header
 * stays solid (the safe, readable default).
 */

export type HeaderMode = "static" | "scroll";

export interface HeaderEnv {
  /** The page starts with a full-bleed hero under the header. */
  hasOverlay: boolean;
}

/** Scroll distance (px) over which the bar goes from transparent to solid. */
export const HEADER_SOLID_RANGE = 140;

export function headerMode(env: HeaderEnv): HeaderMode {
  return env.hasOverlay ? "scroll" : "static";
}

/**
 * How solid the bar is (0 transparent, 1 solid) at a scroll offset. `start`
 * is where it starts to turn solid (`--header-solid-start`, 0 by default).
 */
export function headerSolidAt(scrollY: number, start = 0): number {
  return Math.min(1, Math.max(0, (scrollY - start) / HEADER_SOLID_RANGE));
}
