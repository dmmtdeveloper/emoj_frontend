/**
 * Chapter 08 · Contacto, "Te esperamos en terreno": the survey plan around
 * the office (src/components/home/chapters/ContactChapter.astro). Contour
 * lines like a hill's on a topographic plan, and the drop of the map pin.
 * Pure functions, no DOM: the plan is drawn at build time and the timeline
 * plays it.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ContourOptions {
  /** The summit, where the innermost ring sits. */
  center: Point;
  /** How many rings. */
  count: number;
  /** Radius of the innermost ring and the spacing between rings. */
  first: number;
  step: number;
  /** How far a ring strays from a circle, as a share of its radius. */
  wobble: number;
  /** How far each ring's centre moves from the last (a lopsided hill). */
  drift: Point;
  /** Same seed, same hill. */
  seed: number;
}

/** Deterministic value in 0..1 for a seed. */
const hash = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

/** Harmonics of the ring's shape: order and weight (weights add to 1). */
const HARMONICS = [
  [2, 0.55],
  [3, 0.3],
  [5, 0.15],
] as const;

/**
 * Radius of ring `ring` at `angle` (radians): a circle bent by a few
 * low harmonics whose phases turn slowly from ring to ring, so the rings
 * echo each other like contours do, more irregular further out.
 */
export function contourRadius(
  ring: number,
  angle: number,
  options: ContourOptions,
): number {
  const { count, first, step, wobble, seed } = options;
  const base = first + ring * step;
  const amount = wobble * (0.45 + 0.55 * (ring / Math.max(1, count - 1)));
  const bend = HARMONICS.reduce((sum, [order, weight], j) => {
    const phase = hash(seed * 31 + j) * Math.PI * 2 + ring * 0.18 * (j + 1);
    return sum + weight * Math.sin(order * angle + phase);
  }, 0);
  return base * (1 + amount * bend);
}

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * A smooth closed path through `points` (Catmull-Rom turned into cubic
 * Béziers), one curve per point.
 */
export function smoothClosedPath(points: readonly Point[]): string {
  const n = points.length;
  if (n < 3) return "";
  const at = (i: number) => points[((i % n) + n) % n] ?? { x: 0, y: 0 };
  const first = at(0);
  let d = `M${f(first.x)} ${f(first.y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return `${d}Z`;
}

/** Points sampled around each ring. */
const SAMPLES = 18;

/**
 * The contour lines of the hill, innermost first; every fifth line is an
 * index contour (drawn heavier on survey plans).
 */
export function contourLines(
  options: ContourOptions,
): { d: string; index: boolean }[] {
  const { center, count, drift } = options;
  return Array.from({ length: count }, (_, ring) => {
    const cx = center.x + ring * drift.x;
    const cy = center.y + ring * drift.y;
    const points = Array.from({ length: SAMPLES }, (_, i) => {
      const angle = (i / SAMPLES) * Math.PI * 2;
      const r = contourRadius(ring, angle, options);
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    return { d: smoothClosedPath(points), index: ring % 5 === 4 };
  });
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
