/**
 * Scroll spy for the header navigation: which annotated page section
 * (`[data-nav-section]`, see src/pages/index.astro) crosses the reading
 * line. The header (src/scripts/nav-spy.ts) highlights that section's link,
 * and falls back to the current page's link when no section crosses it.
 * Past the last section (the footer) the last one stays highlighted.
 */

export interface SpySection {
  /** The navigation link this section belongs to. */
  href: string;
  /** Viewport coordinates, as from getBoundingClientRect(). */
  top: number;
  bottom: number;
}

export function sectionAt(
  sections: readonly SpySection[],
  line: number,
): string | null {
  const hit = sections.find((s) => s.top <= line && line < s.bottom);
  if (hit) return hit.href;
  const last = sections.at(-1);
  return last && line >= last.bottom ? last.href : null;
}
