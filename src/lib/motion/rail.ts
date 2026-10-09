/**
 * A horizontal rail of cards that scrolls natively (scroll-snap, touch and
 * trackpad), with arrows, a counter and a progress line on top
 * (src/scripts/project-rail.ts). These are the numbers behind them.
 */

export interface RailMetrics {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  /** Card width plus the gap: the distance between two card starts. */
  step: number;
  count: number;
}

export interface RailState {
  /** The card nearest to the start of the viewport (the last one at the end). */
  index: number;
  /** Share scrolled, 0 to 1 (1 when nothing scrolls). */
  progress: number;
  atStart: boolean;
  atEnd: boolean;
  scrollable: boolean;
}

/** Pixels that still count as the end: snap points can stop just short. */
const END_SLACK = 2;

function maxScroll(m: RailMetrics): number {
  return Math.max(0, m.scrollWidth - m.clientWidth);
}

export function railState(m: RailMetrics): RailState {
  const max = maxScroll(m);
  if (max <= END_SLACK) {
    return {
      index: 0,
      progress: 1,
      atStart: true,
      atEnd: true,
      scrollable: false,
    };
  }
  const left = Math.min(Math.max(m.scrollLeft, 0), max);
  const atEnd = left >= max - END_SLACK;
  const index = atEnd
    ? m.count - 1
    : Math.min(m.count - 1, Math.round(left / m.step));
  return {
    index,
    progress: atEnd ? 1 : left / max,
    atStart: left <= END_SLACK,
    atEnd,
    scrollable: true,
  };
}

/** Where an arrow press should scroll to: one card forward (1) or back (-1). */
export function railTarget(m: RailMetrics, direction: 1 | -1): number {
  const { index } = railState(m);
  const target = (index + direction) * m.step;
  return Math.min(Math.max(target, 0), maxScroll(m));
}
