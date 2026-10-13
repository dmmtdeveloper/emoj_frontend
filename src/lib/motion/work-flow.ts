/**
 * Scroll logic for the "Cómo trabajamos" section (WorkFlow.astro): maps the
 * scroll through the section to how much of the isotype stroke is drawn
 * (the "river", 0..1 along the stroke from the left dot to the right one),
 * which stage is active and how far the closing logo has come in.
 *
 * The scroll is split into one stretch per stop (an intro, then the six
 * stations, then the end of the stroke). In each stretch the river travels
 * to its next stop and then stays parked on it, so a fast scroll still
 * leaves every stage on screen long enough to read. After the river is
 * complete, the last part of the scroll turns the scene into the logo.
 *
 * Pure functions, no DOM: src/scripts/work-flow.ts wires them to the page.
 */

/** Where each stage sits along the stroke, read from the left dot. */
export const STATIONS = [0.03, 0.35, 0.5, 0.6, 0.78, 0.975] as const;

/** Share of the scroll that draws the river; the rest is the ending. */
const DRAW_END = 0.76;
/** The closing logo comes in over this part of the scroll. */
const ENDING_FROM = 0.8;
const ENDING_TO = 0.94;
/** Share of each stretch spent parked on its stop. */
const HOLD = 0.45;

const STOPS: readonly number[] = [0, ...STATIONS, 1];
const STRETCHES = STOPS.length - 1;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** How much of the stroke is drawn for a scroll share (0..1) of the section. */
export function riverShare(scroll: number): number {
  const position = (clamp(scroll) / DRAW_END) * STRETCHES;
  if (position >= STRETCHES) return 1;
  const stretch = Math.floor(position);
  const from = STOPS[stretch] ?? 0;
  const to = STOPS[stretch + 1] ?? 1;
  const travel = clamp((position - stretch) / (1 - HOLD));
  return from + (to - from) * easeInOutCubic(travel);
}

/** Scroll share that parks the river in the middle of stage `index`. */
export function scrollForStage(index: number): number {
  // Station `index` is the end of stretch `index`; its parked zone is the
  // last HOLD of that stretch.
  return ((index + 1 - HOLD / 2) / STRETCHES) * DRAW_END;
}

/** Index of the last station the river has reached, or -1 before the first. */
export function activeStage(river: number): number {
  let active = -1;
  STATIONS.forEach((station, i) => {
    if (river >= station - 0.001) active = i;
  });
  return active;
}

/** How far the river has gone through stage `index` (fills its progress bar). */
export function stageFill(index: number, river: number): number {
  const start = STATIONS[index] ?? 1;
  if (index === STATIONS.length - 1) return river >= start - 0.001 ? 1 : 0;
  const end = STATIONS[index + 1] ?? 1;
  return clamp((river - start) / (end - start));
}

/** How far the closing logo has come in (0 while the stages play). */
export function endingShare(scroll: number): number {
  return clamp((scroll - ENDING_FROM) / (ENDING_TO - ENDING_FROM));
}

export type WorkFlowMode = "scroll" | "static";

/** Reduced motion gets the finished river and every stage listed. */
export function workFlowMode(env: {
  prefersReducedMotion: boolean;
}): WorkFlowMode {
  return env.prefersReducedMotion ? "static" : "scroll";
}
