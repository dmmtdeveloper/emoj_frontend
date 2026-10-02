/**
 * Reveal-on-scroll for `[data-reveal]` elements.
 *
 * Primary path: CSS scroll-driven animations (`animation-timeline: view()`)
 * in `src/styles/motion.css`, no JavaScript. This module is the fallback for
 * browsers without them: it arms the page (`.reveal-js` on <html>) only after
 * every element is observed, so content is never hidden if the script fails
 * or never runs.
 */

export type RevealMode = "css" | "observer" | "none";

export interface RevealEnv {
  prefersReducedMotion: boolean;
  supportsScrollTimeline: boolean;
  hasIntersectionObserver: boolean;
}

export function revealMode(env: RevealEnv): RevealMode {
  if (env.prefersReducedMotion) return "none";
  if (env.supportsScrollTimeline) return "css";
  return env.hasIntersectionObserver ? "observer" : "none";
}

interface EntryLike {
  isIntersecting: boolean;
  boundingClientRect: { bottom: number };
}

/** Reveal when visible, or when already scrolled past (reload mid-page). */
export function shouldReveal(entry: EntryLike): boolean {
  return entry.isIntersecting || entry.boundingClientRect.bottom < 0;
}

export interface RevealTarget {
  setAttribute(name: string, value: string): void;
}

export interface RevealObserver<T> {
  observe(element: T): void;
  unobserve(element: T): void;
}

export type RevealObserverFactory<T extends RevealTarget = RevealTarget> = (
  callback: (entries: (EntryLike & { target: T })[]) => void,
) => RevealObserver<T>;

export const REVEAL_ROOT_CLASS = "reveal-js";

export function initRevealFallback<T extends RevealTarget>(options: {
  elements: readonly T[];
  rootClassList: { add(token: string): void };
  factory: RevealObserverFactory<T>;
}): void {
  const { elements, rootClassList, factory } = options;
  if (elements.length === 0) return;
  const observer = factory((entries) => {
    for (const entry of entries) {
      if (!shouldReveal(entry)) continue;
      entry.target.setAttribute("data-revealed", "");
      observer.unobserve(entry.target);
    }
  });
  for (const element of elements) observer.observe(element);
  rootClassList.add(REVEAL_ROOT_CLASS);
}
