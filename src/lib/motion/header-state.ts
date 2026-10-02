/**
 * Header over the home hero: transparent at the top, solid `surface` once
 * the page scrolls. CSS scroll-driven animations do it without JavaScript;
 * this is the decision logic for the IntersectionObserver fallback. Without
 * either, the header stays solid (the safe, readable default).
 */

export type HeaderMode = "static" | "css" | "observer";

export interface HeaderEnv {
  /** The page starts with a full-bleed hero under the header. */
  hasOverlay: boolean;
  supportsScrollTimeline: boolean;
  hasIntersectionObserver: boolean;
}

export function headerMode(env: HeaderEnv): HeaderMode {
  if (!env.hasOverlay) return "static";
  if (env.supportsScrollTimeline) return "css";
  return env.hasIntersectionObserver ? "observer" : "static";
}

/** Solid once the sentinel at the top of the page leaves the viewport. */
export function isHeaderSolid(entry: { isIntersecting: boolean }): boolean {
  return !entry.isIntersecting;
}
