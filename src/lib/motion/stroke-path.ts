/**
 * Geometry of a hand-drawn stroke made of cubic curves (the EMOJ isotype,
 * src/components/home/chapters/isotype.ts), for chapter 03 ("Cómo
 * trabajamos"): where the stages sit along the stroke and when the
 * scrubbed drawing reaches each one. Pure functions, no DOM: the page is
 * laid out from these at build time and the browser only draws.
 */
import { SCENE_LENGTH } from "./chapters";

export interface Point {
  x: number;
  y: number;
}

export interface Cubic {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * The cubic curves of an SVG path with only moves and cubics (`M`/`m`,
 * `C`/`c`, implicit repeats), with absolute points.
 */
export function parseCubicPath(d: string): Cubic[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const curves: Cubic[] = [];
  let pen: Point = { x: 0, y: 0 };
  let command = "";
  let i = 0;
  const next = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const token = tokens[i] ?? "";
    if (/[a-zA-Z]/.test(token)) {
      command = token;
      i++;
      if (!"MmCc".includes(command)) {
        throw new Error(`Unsupported path command: ${command}`);
      }
      continue;
    }
    const relative = command === command.toLowerCase();
    const base = relative ? pen : { x: 0, y: 0 };
    const point = (): Point => ({
      x: round(base.x + next()),
      y: round(base.y + next()),
    });
    if (command === "M" || command === "m") {
      pen = point();
    } else {
      const curve = { from: pen, c1: point(), c2: point(), to: point() };
      curves.push(curve);
      pen = curve.to;
    }
  }
  return curves;
}

/** A path as a polyline with the length run up to each of its points. */
export interface SampledPath {
  points: Point[];
  runs: number[];
  length: number;
}

const bezier = (c: Cubic, t: number): Point => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const e = 3 * u * t * t;
  const f = t * t * t;
  return {
    x: a * c.from.x + b * c.c1.x + e * c.c2.x + f * c.to.x,
    y: a * c.from.y + b * c.c1.y + e * c.c2.y + f * c.to.y,
  };
};

/** Samples the curves finely enough to measure and walk the path. */
export function samplePath(curves: readonly Cubic[], steps = 64): SampledPath {
  const first = curves[0]?.from ?? { x: 0, y: 0 };
  const points: Point[] = [first];
  const runs = [0];
  let length = 0;
  for (const curve of curves) {
    for (let s = 1; s <= steps; s++) {
      const point = s === steps ? curve.to : bezier(curve, s / steps);
      const last = points[points.length - 1] ?? point;
      length += Math.hypot(point.x - last.x, point.y - last.y);
      points.push(point);
      runs.push(length);
    }
  }
  return { points, runs, length };
}

/** The point at `share` of the path's length, from its start. */
export function pointAlong(path: SampledPath, share: number): Point {
  const target = clamp01(share) * path.length;
  const { points, runs } = path;
  let i = 1;
  while (i < runs.length - 1 && (runs[i] ?? 0) < target) i++;
  const a = points[i - 1] ?? { x: 0, y: 0 };
  const b = points[i] ?? a;
  const from = runs[i - 1] ?? 0;
  const span = (runs[i] ?? from) - from;
  const t = span > 0 ? (target - from) / span : 0;
  if (target <= 0) return points[0] ?? a;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Where a point sits in an SVG viewBox, as shares of its width/height. */
export function boxShare(point: Point, viewBox: string): Point {
  const [x = 0, y = 0, width = 1, height = 1] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return { x: (point.x - x) / width, y: (point.y - y) / height };
}

/**
 * An anime.js `draw` value showing the last `share` of a path: for paths
 * drawn backwards, from their end (the isotype runs right to left).
 */
export function drawFromEnd(share: number): string {
  return `${1 - clamp01(share)} 1`;
}

/** A leg of the drawing: from one station to the next, in L. */
export interface StrokeLeg {
  /** Shares of the stroke at the start and the end of the leg. */
  from: number;
  to: number;
  /** When the leg starts and when the drawing reaches its station. */
  start: number;
  reach: number;
}

/**
 * The drawing of a stroke with stops: one equal slot per station over
 * [from, to] (shares of the scene); in each slot the drawing travels to
 * the station and then holds there for `hold` of the slot, so every stage
 * stays on screen long enough to read, however fast the scroll.
 */
export function strokeSchedule(
  stations: readonly number[],
  from: number,
  to: number,
  hold: number,
): StrokeLeg[] {
  const slot = ((to - from) / Math.max(1, stations.length)) * SCENE_LENGTH;
  return stations.map((station, i) => {
    const start = Math.round(from * SCENE_LENGTH + i * slot);
    return {
      from: i === 0 ? 0 : (stations[i - 1] ?? 0),
      to: station,
      start,
      reach: Math.round(start + (1 - clamp01(hold)) * slot),
    };
  });
}
