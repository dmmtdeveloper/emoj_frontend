/**
 * Pure logic for the home chapters (src/scripts/chapters/scrub.ts and the
 * scenes in src/components/home/chapters). Each chapter's scene is one
 * anime.js timeline authored against SCENE_LENGTH and scrubbed by the
 * scroll; nothing here touches the DOM.
 */

const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

/** Timeline length every scene is authored against: positions read as ‱. */
export const SCENE_LENGTH = 10000;

export interface FocusInput {
  /** The pinned stage's size and its side gutter. */
  width: number;
  height: number;
  gutter: number;
  /** The chapter label's offset from the stage top, and its height. */
  label: { top: number; height: number };
  /** The scene's box inside the stage, untransformed. */
  scene: { left: number; top: number; width: number; height: number };
}

/**
 * Desktop focus: where the scene goes when it takes the centre of the
 * stage (translate `dx`/`dy`, `scale` about its centre, between 1 and 2)
 * and how far the label rises to the top (`labelDy`). The room left for
 * the scene is the stage minus the risen label and a padding.
 */
export function focusFit(input: FocusInput): {
  dx: number;
  dy: number;
  scale: number;
  labelDy: number;
} {
  const { width, height, gutter, label, scene } = input;
  const pad = Math.max(24, height * 0.05);
  const top = pad + label.height + 16;
  const room = { width: width - gutter * 2, height: height - top - pad };
  const fit = Math.min(room.width / scene.width, room.height / scene.height);
  const scale = Math.min(Math.max(fit, 1), 2);
  return {
    dx: width / 2 - (scene.left + scene.width / 2),
    dy: top + room.height / 2 - (scene.top + scene.height / 2),
    scale,
    labelDy: pad - label.top,
  };
}

/** A deck after `step` shuffles: the slot of card `index` (0 is the front). */
export function deckSlot(index: number, step: number, count: number): number {
  return (((index - step) % count) + count) % count;
}

/** Start times of `count` stages spread evenly over [from, to] (shares). */
export function stageTimes(count: number, from: number, to: number): number[] {
  const span = (to - from) / count;
  return Array.from({ length: count }, (_, i) =>
    Math.round((from + i * span) * SCENE_LENGTH),
  );
}

/** Deterministic jitter in 0..1, so a "random" layout is the same every visit. */
export function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/** The part of `text` typed so far (a typed command, address…). */
export function typedText(text: string, share: number): string {
  return text.slice(0, Math.floor(text.length * clamp01(share) + 1e-9));
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

/** The page scroll position that puts a pinned track at `progress`. */
export function scrollForProgress(
  track: { pageTop: number; height: number; viewport: number },
  progress: number,
): number {
  const run = Math.max(0, track.height - track.viewport);
  return track.pageTop + clamp01(progress) * run;
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
 * A card of the projects reel against the reel's travel `t` (0..1, the
 * reel slides left by `overflow` px): it rises in as
 * `clamp((t - at) / span)` goes 0 → 1 (enterShare() along the travel) and
 * its photo drifts with `center - t * reelDrift()`, its centre's offset
 * from the middle of the screen in screens.
 */
export function reelCard(card: {
  left: number;
  width: number;
  viewport: number;
  overflow: number;
}): { at: number; span: number; center: number } {
  const { left, width, viewport, overflow } = card;
  const center = (left + width / 2 - viewport / 2) / viewport;
  if (overflow <= 0 || width <= 0) return { at: -1, span: 1, center };
  return { at: (left - viewport) / overflow, span: width / overflow, center };
}

/** How many screens the reel's whole travel moves a card. */
export function reelDrift(overflow: number, viewport: number): number {
  return viewport > 0 ? Math.max(0, overflow) / viewport : 0;
}

/**
 * The project number the reel's counter shows: the last card whose left
 * side has passed a third of the screen (0.3), never the closing tile
 * (the last of `lefts`).
 */
export function reelCurrent(
  lefts: readonly number[],
  shift: number,
  viewport: number,
): number {
  let current = 0;
  lefts.forEach((left, i) => {
    if (left + shift < viewport * 0.3) current = i;
  });
  return Math.max(1, Math.min(current + 1, lefts.length - 1));
}

/**
 * Scale for zooming into a point: exponential, so each stretch of scroll
 * feels like the same speed (1 at t = 0, `max` at t = 1).
 */
export function zoomScale(t: number, max: number): number {
  return Math.pow(max, clamp01(t));
}

/**
 * The first run of ink across one row of RGBA pixels (`span` wide):
 * `start` is its first inked pixel, `end` the first blank one after it.
 * Without ink it guesses the zero's left stroke (8%–20% of the row).
 */
export function inkSpan(
  pixels: ArrayLike<number>,
  span: number,
): { start: number; end: number } {
  let start = -1;
  for (let x = 0; x < span; x++) {
    const ink = (pixels[x * 4 + 3] ?? 0) > 128;
    if (ink && start < 0) start = x;
    if (!ink && start >= 0) return { start, end: x };
  }
  if (start < 0) {
    return { start: Math.round(span * 0.08), end: Math.round(span * 0.2) };
  }
  return { start, end: span };
}

/**
 * Where the "30 años" dive goes: the middle of the zero's stroke on the
 * probed row (`left` is where the probe starts), and a scale at which that
 * stroke is wider than the whole screen seen from that point.
 */
export function diveTarget(probe: {
  width: number;
  height: number;
  left: number;
  row: number;
  ink: { start: number; end: number };
}): { origin: { x: number; y: number }; maxScale: number } {
  const { width, height, left, row, ink } = probe;
  const stroke = Math.max(4, ink.end - ink.start);
  return {
    origin: { x: left + (ink.start + ink.end) / 2, y: row },
    maxScale: ((2.4 * Math.hypot(width, height)) / stroke) * 1.05,
  };
}

/** The SVG transform that scales the sheet by `scale` about `origin`. */
export function diveTransform(
  origin: { x: number; y: number },
  scale: number,
): string {
  return `translate(${origin.x} ${origin.y}) scale(${scale}) translate(${-origin.x} ${-origin.y})`;
}

/** A figure counting up: the whole part of `value` reached at `share`. */
export function countShown(value: number, share: number): string {
  return String(Math.round(value * clamp01(share)));
}

/** When a card of the reasons deck starts rising and when it lands (in L). */
export interface DeckTimes {
  start: number;
  land: number;
}

/**
 * The reasons deck: `count` cards rise in turn, spread evenly over
 * [from, to] (shares); each lands `rise` of the way through its share, so
 * it rests at the front before the next one comes.
 */
export function deckSchedule(
  count: number,
  from: number,
  to: number,
  rise: number,
): DeckTimes[] {
  const span = ((to - from) / count) * SCENE_LENGTH;
  return stageTimes(count, from, to).map((start) => ({
    start,
    land: Math.round(start + clamp01(rise) * span),
  }));
}

/** How deep the deck shows: cards further back keep the last pose. */
const DECK_DEPTH = 3;

/**
 * Pose of a card `depth` cards behind the front of the deck: smaller,
 * raised (`y`, % of its height, so its top edge peeks over the cards in
 * front) and darker (`shade`, the opacity of its shadow layer).
 */
export function deckPose(depth: number): {
  scale: number;
  y: number;
  shade: number;
} {
  const d = Math.min(DECK_DEPTH, Math.max(0, depth));
  return { scale: 1 - d * 0.06, y: d === 0 ? 0 : -d * 5, shade: d * 0.16 };
}

/** The card at the front of the deck at `time`: the last landed, or -1. */
export function deckFront(time: number, schedule: readonly DeckTimes[]) {
  let front = -1;
  schedule.forEach(({ land }, i) => {
    if (land <= time) front = i;
  });
  return front;
}

const clampUnit = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(-1, value));

/**
 * A card leaning under the pointer: the side the pointer is on presses
 * away (CSS `rotateX`/`rotateY` in degrees, at most `max` each way).
 */
export function cardTilt(
  pointer: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
  max: number,
): { rotateX: number; rotateY: number } {
  if (box.width <= 0 || box.height <= 0) return { rotateX: 0, rotateY: 0 };
  const nx = clampUnit(
    (pointer.x - box.left - box.width / 2) / (box.width / 2),
  );
  const ny = clampUnit(
    (pointer.y - box.top - box.height / 2) / (box.height / 2),
  );
  return { rotateX: -ny * max || 0, rotateY: nx * max || 0 };
}
