/**
 * Pure logic for the home's scroll scenes (src/scripts/scenes.ts).
 *
 * Every chapter of the home is a tall track with a sticky stage. While the
 * stage is pinned, the scroll gives a progress from 0 to 1 and each scene
 * derives everything it shows from that one number: scrolling down plays the
 * scene, scrolling up rewinds it exactly. Nothing here touches the DOM.
 */

export const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

export const mix = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - clamp01(x), 3);
}

export function easeInOutCubic(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Where `progress` is inside the stretch [start, end], as 0..1. */
export function segment(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= start ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}

/**
 * Progress of a pinned track: 0 when its top reaches the top of the
 * viewport, 1 when its bottom reaches the bottom. `top` is the track's
 * distance from the viewport top (getBoundingClientRect().top).
 */
export function trackProgress(track: {
  top: number;
  height: number;
  viewport: number;
}): number {
  const run = track.height - track.viewport;
  if (run <= 0) return track.top < 0 ? 1 : 0;
  return clamp01(-track.top / run);
}

/** The page scroll position that puts a track at `progress`. */
export function scrollForProgress(
  track: { pageTop: number; height: number; viewport: number },
  progress: number,
): number {
  const run = Math.max(0, track.height - track.viewport);
  return track.pageTop + clamp01(progress) * run;
}

/** Differences below this are invisible; the smoothing stops there. */
const SETTLED = 1e-4;

/**
 * One frame of exponential smoothing toward `target`: frame-rate
 * independent (`elapsedMs` since the last frame, `tauMs` the time constant;
 * 0 means no smoothing).
 */
export function approach(
  current: number,
  target: number,
  elapsedMs: number,
  tauMs: number,
): number {
  if (tauMs <= 0) return target;
  const next = target + (current - target) * Math.exp(-elapsedMs / tauMs);
  return Math.abs(next - target) < SETTLED ? target : next;
}

/** Which of `count` equal slices the progress is in, and how far into it. */
export function sliceOf(
  progress: number,
  count: number,
): { index: number; local: number } {
  const position = clamp01(progress) * count;
  const index = Math.min(count - 1, Math.floor(position));
  return { index, local: position - index };
}

/** The hero lens opens over this part of the hero's progress. */
export const LENS_FROM = 0.34;
export const LENS_TO = 0.86;

/**
 * Radius of the hero lens: the size of the stroke's end dot while the
 * stroke is being drawn, then it opens until it covers the screen.
 */
export function heroLens(
  progress: number,
  sizes: { dot: number; cover: number },
): number {
  const t = easeInOutCubic(segment(progress, LENS_FROM, LENS_TO));
  // Square the share so the first pixels of growth feel like the dot
  // swelling, not a circle popping open.
  return mix(sizes.dot, sizes.cover, t * t * (3 - 2 * t));
}

/**
 * Scale for zooming into a point: exponential, so each stretch of scroll
 * feels like the same speed (1 at t = 0, `max` at t = 1).
 */
export function zoomScale(t: number, max: number): number {
  return Math.pow(max, clamp01(t));
}

/** Horizontal shift of a reel wider than the screen by `overflow` px. */
export function reelShift(progress: number, overflow: number): number {
  const p = clamp01(progress);
  if (overflow <= 0 || p === 0) return 0;
  return -p * overflow;
}

/**
 * How far a card has come in from the right edge: 0 at the edge, 1 once
 * its left side is half a screen inside.
 */
export function enterShare(card: { left: number; viewport: number }): number {
  return clamp01((card.viewport - card.left) / (card.viewport * 0.5));
}

/**
 * How much a stacked card has been covered by the next one: 0 while the
 * next card is still a `span` below where cards pin, 1 once it is pinned.
 */
export function stackPress(cards: {
  nextTop: number;
  pinTop: number;
  span: number;
}): number {
  return clamp01(1 - (cards.nextTop - cards.pinTop) / cards.span);
}

export type SceneMode = "scroll" | "static";

/** Reduced motion, or a browser without the APIs, gets every scene at rest. */
export function sceneMode(env: {
  prefersReducedMotion: boolean;
  hasIntersectionObserver: boolean;
}): SceneMode {
  return env.prefersReducedMotion || !env.hasIntersectionObserver
    ? "static"
    : "scroll";
}
