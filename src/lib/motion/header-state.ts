/**
 * Header over the home hero: transparent at the top, solid `surface` once
 * the page scrolls past a small threshold. It has two states only, with a
 * short CSS transition between them: a bar that followed the scroll stopped
 * half way when Chrome restored the scroll position on reload (washed-out
 * quote button). A CSS scroll-driven animation paints the first frame;
 * src/scripts/motion.ts then writes `--header-solid` (0 or 1), because
 * Chrome can leave that timeline inactive (a restored tab, for example).
 * This is the script's pure logic. Without JavaScript or the timeline, the header
 * stays solid (the safe, readable default).
 */

export type HeaderMode = "static" | "scroll";

export interface HeaderEnv {
  /** The page starts with a full-bleed hero under the header. */
  hasOverlay: boolean;
}

/** Scroll distance (px) past which the bar turns solid. */
export const HEADER_SOLID_AT = 24;

export function headerMode(env: HeaderEnv): HeaderMode {
  return env.hasOverlay ? "scroll" : "static";
}

/**
 * The bar's state at a scroll offset: 0 transparent, 1 solid, never in
 * between. `start` moves the threshold down (`--header-solid-start`, 0 by
 * default).
 */
export function headerSolidAt(scrollY: number, start = 0): 0 | 1 {
  return scrollY - start > HEADER_SOLID_AT ? 1 : 0;
}

/**
 * Where the bar turns solid on a page whose hero is taller than the screen
 * (the home's pinned hero): once the hero's foot reaches the bar.
 * `heroBottom` is the hero's bottom edge in page coordinates.
 */
export function solidStartFor(hero: {
  heroBottom: number;
  headerHeight: number;
}): number {
  return Math.max(0, hero.heroBottom - hero.headerHeight - HEADER_SOLID_AT);
}
