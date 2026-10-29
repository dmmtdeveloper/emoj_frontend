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

/**
 * The item a one-at-a-time scene shows at `time`: the first one until the
 * first swap, then one more for every swap already passed (`swaps` sorted).
 */
export function showingAt(time: number, swaps: readonly number[]): number {
  return swaps.filter((swap) => swap <= time).length;
}

/** Start times of `count` stages spread evenly over [from, to] (shares). */
export function stageTimes(count: number, from: number, to: number): number[] {
  const span = (to - from) / count;
  return Array.from({ length: count }, (_, i) =>
    Math.round((from + i * span) * SCENE_LENGTH),
  );
}

/** Share of the way from `from` to `to` that `value` has gone (0..1). */
const segment = (value: number, from: number, to: number): number =>
  clamp01((value - from) / (to - from));

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * The services fan: how many cards have turned at `time` (fractional) as
 * the scroll shuffles `count` cards over [from, to] (shares). Around each
 * card the turn rests for a `hold` share of a turn (half before, half
 * after), so the card on top stays still long enough to be read.
 */
export function fanTurn(
  time: number,
  count: number,
  from: number,
  to: number,
  hold = 0,
): number {
  if (count < 2) return 0;
  const raw = (count - 1) * segment(time / SCENE_LENGTH, from, to);
  const turned = Math.floor(raw);
  const rest = Math.min(0.99, Math.max(0, hold)) / 2;
  return turned + segment(raw - turned, rest, 1 - rest);
}

/** Where a card of the services fan sits (CSS transform parts and more). */
export interface FanPlace {
  /** Offset as shares of the card's width and height. */
  x: number;
  y: number;
  /** Degrees. */
  rotate: number;
  scale: number;
  opacity: number;
  z: number;
  /** Opacity of the copy on the card: only the top card shows it. */
  copy: number;
  /** How far its sketch is drawn (0..1). */
  draw: number;
}

/**
 * A card `pos` places from the top of the fan (0 the top, 1 the next…,
 * negative once it has passed). Cards behind fan out to alternate sides
 * (`side`), smaller and raised, three deep; a passed card is thrown off to
 * the left over the others and fades. Its sketch draws as it comes up.
 */
export function fanPlace(pos: number, side: 1 | -1): FanPlace {
  const z = Math.round(100 - pos * 10);
  const copy = clamp01(1 - Math.abs(pos) * 3);
  const draw = clamp01(1 - pos);
  if (pos < 0) {
    const eased = easeInOutCubic(clamp01(-pos));
    return {
      x: -0.75 * eased,
      y: 0.06 * eased,
      rotate: -12 * eased,
      scale: 1,
      opacity: 1 - segment(-pos, 0.55, 1),
      z,
      copy,
      draw,
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
    copy,
    draw,
  };
}

/** The part of `text` typed so far (a typed command, address…). */
export function typedText(text: string, share: number): string {
  return text.slice(0, Math.floor(text.length * clamp01(share) + 1e-9));
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

/**
 * The "30 años" team photo on a phone, after the dive: as `share` goes
 * 0 → 1 it shrinks from the whole screen (`width` × `height`) to a
 * full-width band right under the header (`top`), as tall as the photo's
 * own ratio (`natural`) asks, so nobody is cropped. The band never grows
 * past the room under the header; without a known size it fills it.
 */
export function photoBand(
  share: number,
  frame: {
    width: number;
    height: number;
    top: number;
    natural: { width: number; height: number };
  },
): { top: number; height: number } {
  const { width, height, top, natural } = frame;
  const room = Math.max(0, height - top);
  const band =
    natural.width > 0 && natural.height > 0
      ? Math.min(room, (width * natural.height) / natural.width)
      : room;
  const t = clamp01(share);
  return { top: top * t, height: height + (band - height) * t };
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
 * The reasons deck: the first `placed` cards are in place from the start;
 * the other ones rise in turn, spread evenly over [from, to] (shares), and
 * each lands (is built) `rise` of the way through its share, so it rests
 * at the front before the next one comes.
 */
export function deckSchedule(
  count: number,
  from: number,
  to: number,
  rise: number,
  placed = 0,
): DeckTimes[] {
  const ready = Math.min(count, Math.max(0, placed));
  const moving = count - ready;
  const span = moving > 0 ? ((to - from) / moving) * SCENE_LENGTH : 0;
  const starts = moving > 0 ? stageTimes(moving, from, to) : [];
  return [
    ...Array.from({ length: ready }, () => ({ start: 0, land: 0 })),
    ...starts.map((start) => ({
      start,
      land: Math.round(start + clamp01(rise) * span),
    })),
  ];
}

/** How deep the deck shows: cards further back keep the last pose. */
const DECK_DEPTH = 3;

/** How far back a tucked card stays folded on its top edge (degrees). */
const DECK_FOLD = -10;

/**
 * Pose of a card `depth` cards behind the front of the deck: smaller,
 * raised (`y`, % of its height, so its top edge peeks over the cards in
 * front), darker (`shade`, the opacity of its shadow layer) and folded
 * back on its top edge like a plan sheet (`fold`, CSS `rotateX`).
 */
export function deckPose(depth: number): {
  scale: number;
  y: number;
  shade: number;
  fold: number;
} {
  const d = Math.min(DECK_DEPTH, Math.max(0, depth));
  return {
    scale: 1 - d * 0.06,
    y: d === 0 ? 0 : -d * 5,
    shade: d * 0.16,
    fold: d === 0 ? 0 : DECK_FOLD,
  };
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
