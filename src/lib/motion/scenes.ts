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

/** A dot popping in: 0 hidden, overshoots a little, then settles at 1. */
export function popIn(t: number): number {
  const x = clamp01(t);
  if (x === 0) return 0;
  const overshoot = 2.2;
  return (
    1 + (overshoot + 1) * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2)
  );
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

/** Which of the weighted steps `share` (0..1) is in, and how far into it. */
export function weightedSlice(
  share: number,
  weights: readonly number[],
): { index: number; local: number } {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const last = weights.length - 1;
  let position = clamp01(share) * total;
  for (let index = 0; index < last; index++) {
    const weight = weights[index] ?? 0;
    if (position < weight) return { index, local: position / weight };
    position -= weight;
  }
  const weight = weights[last] ?? 0;
  return { index: last, local: weight > 0 ? clamp01(position / weight) : 1 };
}

/** Share of a CAD step spent typing its command; the rest draws. */
export const CAD_TYPING = 0.3;

/** Inside a step of the CAD plan: the command is typed, then drawn. */
export function cadStepPhases(local: number): { typed: number; drawn: number } {
  return {
    typed: segment(local, 0, CAD_TYPING),
    drawn: segment(local, CAD_TYPING, 1),
  };
}

/** The part of `text` typed so far. */
export function typedText(text: string, share: number): string {
  return text.slice(0, Math.floor(text.length * clamp01(share) + 1e-9));
}

/** The CAD status bar's coordinates. */
export function cadReadout(point: { x: number; y: number }): string {
  const format = (value: number) =>
    (Math.round(value * 100) / 100 + 0).toFixed(2);
  return `X ${format(point.x)}  Y ${format(point.y)}`;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A CAD "zoom window": the drawing is scaled about the window's centre and
 * moved so the window ends up covering the stage, centred. `scale`, `x`
 * and `y` are the drawing's transform (origin at the window's centre);
 * `clip` is where the window is at that moment, as insets of the stage.
 * The scale grows exponentially, so the zoom feels even.
 */
export function zoomWindow(
  win: Box,
  stage: { width: number; height: number },
  t: number,
): {
  scale: number;
  x: number;
  y: number;
  clip: { top: number; right: number; bottom: number; left: number };
} {
  const inset = (scale: number, x: number, y: number) => {
    const cx = win.left + win.width / 2 + x;
    const cy = win.top + win.height / 2 + y;
    const w = (win.width * scale) / 2;
    const h = (win.height * scale) / 2;
    return {
      top: Math.max(0, cy - h),
      right: Math.max(0, stage.width - (cx + w)),
      bottom: Math.max(0, stage.height - (cy + h)),
      left: Math.max(0, cx - w),
    };
  };
  if (win.width <= 0 || win.height <= 0) {
    return { scale: 1, x: 0, y: 0, clip: inset(1, 0, 0) };
  }
  const cover = Math.max(stage.width / win.width, stage.height / win.height);
  const scale = zoomScale(t, cover);
  const share = cover > 1 ? (scale - 1) / (cover - 1) : 1;
  const x = (stage.width / 2 - (win.left + win.width / 2)) * share + 0;
  const y = (stage.height / 2 - (win.top + win.height / 2)) * share + 0;
  return { scale, x, y, clip: inset(scale, x, y) };
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
 * How far a card has come in from the right edge: 0 while it is beyond the
 * edge, 1 once the whole card is on screen.
 */
export function enterShare(card: {
  left: number;
  width: number;
  viewport: number;
}): number {
  if (card.width <= 0) return card.left < card.viewport ? 1 : 0;
  return clamp01((card.viewport - card.left) / card.width);
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

/**
 * A rest → closer look → rest curve (deivid.space's focus): 0 before
 * `beats[0]`, up to 1 by `beats[1]`, held, back to 0 from `beats[2]` to
 * `beats[3]`.
 */
export function focusCurve(
  progress: number,
  beats: readonly [number, number, number, number],
): number {
  const [inFrom, inTo, outFrom, outTo] = beats;
  return (
    easeInOutCubic(segment(progress, inFrom, inTo)) *
    (1 - easeInOutCubic(segment(progress, outFrom, outTo)))
  );
}

/** A point on a circle, `angle` in degrees clockwise from the top. */
export function orbitPoint(
  angle: number,
  radius: number,
  center: { x: number; y: number },
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: center.x + radius * Math.sin(rad),
    y: center.y - radius * Math.cos(rad),
  };
}

/**
 * The stages around an orbit as an arc (0..1) is drawn over it: each stage
 * owns an equal slice with its label in the middle. `active` is the slice
 * the arc's tip is in; `reached` how many labels the arc has passed.
 */
export function orbitStage(
  arc: number,
  count: number,
): { active: number; reached: number } {
  const position = clamp01(arc) * count;
  return {
    active: Math.min(count - 1, Math.floor(position)),
    reached: Math.min(count, Math.floor(position + 0.5)),
  };
}

export interface DeckPlace {
  /** Offsets as shares of the card's width and height. */
  x: number;
  y: number;
  /** Degrees. */
  rotate: number;
  scale: number;
  opacity: number;
  /** Stacking order (higher is in front). */
  z: number;
}

/**
 * Where a card of a fanned deck sits for its place `pos` (0 on top, 1 and 2
 * fanned out behind on its `side`, -1 thrown off to the left). Continuous,
 * so a deck shuffled by the scroll moves smoothly both ways.
 */
export function deckPlace(pos: number, side: 1 | -1): DeckPlace {
  const z = Math.round(100 - pos * 10);
  if (pos < 0) {
    const t = clamp01(-pos);
    const eased = easeInOutCubic(t);
    return {
      x: -0.75 * eased,
      y: 0.06 * eased,
      rotate: -12 * eased,
      scale: 1,
      opacity: 1 - segment(t, 0.55, 1),
      z,
    };
  }
  const depth = Math.min(pos, 2);
  // `+ 0` turns -0 into 0 (a square, unmoved top card).
  return {
    x: side * 0.07 * depth + 0,
    y: -0.035 * depth + 0,
    rotate: side * 4.5 * depth + 0,
    scale: 1 - 0.06 * depth,
    opacity: 1 - segment(pos, 2, 3),
    z,
  };
}
