/**
 * Draw-once-on-view for `[data-draw-on-view]` elements (the footer logo).
 *
 * A time-based CSS animation (src/styles/motion.css) plays when the element
 * enters the viewport, the same in every browser. Scroll-driven timelines
 * were not used here: iOS Safari activates them late at the end of the page,
 * so the logo showed complete and then rebuilt itself.
 *
 * States, written to `data-draw-state`:
 * - "armed": waiting below the viewport, parts hidden.
 * - "play": entered the viewport, the drawing runs once.
 * - "done": already scrolled past at load, shown complete.
 * Without this script (or with reduced motion) the attribute is never set
 * and the element is simply complete.
 */

export type DrawOnViewMode = "observer" | "none";
export type DrawState = "armed" | "play" | "done";

export interface DrawOnViewEnv {
  prefersReducedMotion: boolean;
  hasIntersectionObserver: boolean;
}

export function drawOnViewMode(env: DrawOnViewEnv): DrawOnViewMode {
  if (env.prefersReducedMotion || !env.hasIntersectionObserver) return "none";
  return "observer";
}

interface EntryLike {
  isIntersecting: boolean;
  boundingClientRect: { bottom: number };
}

export function drawStateFor(entry: EntryLike): DrawState {
  if (entry.isIntersecting) return "play";
  if (entry.boundingClientRect.bottom < 0) return "done";
  return "armed";
}

/**
 * Scroll fallback for an armed element: a jump past it (a fast fling, an
 * anchor link) crosses no observer threshold, so it would stay hidden.
 * Fully above the bottom of the viewport → play; above the top → done;
 * otherwise the observer still decides (null).
 */
export function drawStateOnScroll(
  rect: { top: number; bottom: number },
  viewportHeight: number,
): DrawState | null {
  if (rect.bottom < 0) return "done";
  if (rect.bottom <= viewportHeight) return "play";
  return null;
}

export interface DrawTarget {
  setAttribute(name: string, value: string): void;
  getAttribute?(name: string): string | null;
}

export interface DrawObserver<T> {
  observe(element: T): void;
  unobserve(element: T): void;
}

export type DrawObserverFactory<T extends DrawTarget = DrawTarget> = (
  callback: (entries: (EntryLike & { target: T })[]) => void,
) => DrawObserver<T>;

export const DRAW_STATE_ATTRIBUTE = "data-draw-state";

export function initDrawOnView<T extends DrawTarget>(options: {
  elements: readonly T[];
  factory: DrawObserverFactory<T>;
}): void {
  const { elements, factory } = options;
  if (elements.length === 0) return;
  const observer = factory((entries) => {
    for (const entry of entries) {
      // Already settled by the scroll fallback: keep it.
      const current = entry.target.getAttribute?.(DRAW_STATE_ATTRIBUTE);
      if (current && current !== "armed") {
        observer.unobserve(entry.target);
        continue;
      }
      const state = drawStateFor(entry);
      entry.target.setAttribute(DRAW_STATE_ATTRIBUTE, state);
      if (state !== "armed") observer.unobserve(entry.target);
    }
  });
  for (const element of elements) {
    element.setAttribute(DRAW_STATE_ATTRIBUTE, "armed");
    observer.observe(element);
  }
}
