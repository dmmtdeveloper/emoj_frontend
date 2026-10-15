/**
 * Scroll position on the home page after a reload or back/forward. Chrome
 * restores where the page was, and a position inside the hero (say 100px
 * down) looks broken: the photo cut, the solid header over it and the next
 * section peeking in. The home page takes over restoration
 * (src/scripts/home-scroll.ts): a position in the upper half of the hero
 * goes back to the top; anything further down is kept. This is its pure
 * logic.
 */

export interface RestoreInput {
  /** Position saved when the page was left, or null. */
  saved: number | null;
  /** `PerformanceNavigationTiming.type` of this load. */
  navType: string;
  /** Height of the hero, in px. */
  heroHeight: number;
}

/** Where to scroll, or null to leave the page as it loaded. */
export function restoredScroll({
  saved,
  navType,
  heroHeight,
}: RestoreInput): number | null {
  if (navType !== "reload" && navType !== "back_forward") return null;
  if (saved === null || !Number.isFinite(saved)) return null;
  if (saved < heroHeight / 2) return 0;
  return saved;
}
