/**
 * Chapter 08 · Contacto, "Te esperamos en terreno": the street plan around
 * the office (src/components/home/chapters/ContactChapter.astro). Where the
 * street names sit, and the drop of the map pin. Pure functions, no DOM:
 * the plan is drawn at build time and the timeline plays it.
 */

export interface Point {
  x: number;
  y: number;
}

/** A street name's place: its centre and the angle of the text (deg). */
export interface StreetLabel {
  x: number;
  y: number;
  angle: number;
}

/**
 * Where a street's name goes: at `share` of the street from `a` to `b`,
 * lifted `offset` units off it (towards the top of the text), turned to
 * follow it and never upside down (vertical streets read bottom to top).
 */
export function labelAlong(
  a: Point,
  b: Point,
  share: number,
  offset: number,
): StreetLabel {
  // Read left to right; a vertical street, bottom to top.
  const flip = b.x < a.x || (b.x === a.x && b.y > a.y);
  const [from, to] = flip ? [b, a] : [a, b];
  const t = flip ? 1 - share : share;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  return {
    x: from.x + (to.x - from.x) * t + uy * offset,
    y: from.y + (to.y - from.y) * t - ux * offset,
    angle: (Math.atan2(uy, ux) * 180) / Math.PI,
  };
}

/** One keyframe of the pin's drop: its height and its shadow's scale. */
export interface DropFrame {
  /** Offset from the ground (negative is up), in px. */
  y: number;
  /** Shadow scale: 1 on the ground, smaller in the air. */
  shadow: number;
  /** Share of the drop's duration this keyframe takes. */
  share: number;
}

/** Shadow scale for a pin `y` px over the ground, dropped from `height`. */
export function pinShadow(y: number, height: number): number {
  if (height <= 0) return 1;
  return (
    Math.round((1 - 0.6 * Math.min(1, Math.abs(y) / height)) * 1000) / 1000
  );
}

/**
 * The drop of a pin from `height` px: it lands, then bounces back up to
 * each share of `bounces` and lands again. Keyframes after the start (the
 * pin `height` px up): half the time falls, the rest is split among the
 * bounces by their flight time (√height).
 */
export function pinDrop(
  height: number,
  bounces: readonly number[],
): DropFrame[] {
  const land = (share: number): DropFrame => ({ y: 0, shadow: 1, share });
  if (bounces.length === 0) return [land(1)];
  const flights = bounces.map((b) => Math.sqrt(b));
  const total = flights.reduce((sum, t) => sum + t, 0);
  const frames: DropFrame[] = [land(0.5)];
  bounces.forEach((bounce, i) => {
    const half = ((flights[i] ?? 0) / total) * 0.25;
    const y = Math.round(-bounce * height * 1000) / 1000;
    frames.push({ y, shadow: pinShadow(y, height), share: half });
    frames.push(land(half));
  });
  return frames;
}
