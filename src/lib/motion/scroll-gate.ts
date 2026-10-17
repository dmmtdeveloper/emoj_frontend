/**
 * Scroll gates for the home chapters (src/scripts/chapters/scroll-gate.ts).
 *
 * A wheel burst (a spin of the mouse wheel, a trackpad swipe and its
 * momentum) cannot fly past a chapter: it stops at the next chapter's start
 * (where its stage pins) and holds there for the rest of the burst. A new
 * burst after a short pause continues into the chapter, where the scroll is
 * free and the scene scrubs. So a fast spin plays the home chapter by
 * chapter instead of skipping it. Pure: positions and times in, the next
 * target out.
 */

/**
 * A pause in wheel input longer than this ends the burst (ms). Wheel
 * notches of a spin come ~20–80ms apart and a trackpad's momentum
 * continuously; a new swipe after a stop comes later than this.
 */
export const BURST_GAP = 400;

/** A hold longer than this lets a slow, steady scroll through (ms). */
export const HOLD_MAX = 1100;

/** Positions closer than this count as the same (px). */
const EPS = 0.5;

export interface GateState {
  /** The gate a burst stopped at, its direction and when. */
  hold: { at: number; dir: 1 | -1; since: number } | null;
  /** Time of the last wheel input. */
  last: number;
}

export const INITIAL_GATE: GateState = { hold: null, last: -Infinity };

/** The first gate strictly past `from` and up to `to`, in that direction. */
function gateBetween(
  gates: readonly number[],
  from: number,
  to: number,
  dir: 1 | -1,
): number | null {
  let found: number | null = null;
  for (const gate of gates) {
    const ahead =
      dir > 0
        ? gate > from + EPS && gate <= to + EPS
        : gate < from - EPS && gate >= to - EPS;
    if (!ahead) continue;
    if (found === null || (dir > 0 ? gate < found : gate > found)) {
      found = gate;
    }
  }
  return found;
}

/**
 * One wheel step from `from` toward `to` at time `now`: where to scroll
 * instead (`target`) and the state for the next step.
 */
export function gateStep(
  gates: readonly number[],
  state: GateState,
  step: { from: number; to: number; now: number },
): { target: number; state: GateState } {
  const { from, to, now } = step;
  let hold = state.hold;
  if (now - state.last > BURST_GAP) hold = null;
  if (hold && now - hold.since > HOLD_MAX) hold = null;

  const delta = to - from;
  if (Math.abs(delta) <= EPS) {
    return { target: to, state: { hold, last: now } };
  }
  const dir: 1 | -1 = delta > 0 ? 1 : -1;

  // Holding at a gate: the same direction stays put; reversing releases it
  // (the step below starts with no hold either way).
  if (hold && hold.dir === dir) {
    return { target: hold.at, state: { hold, last: now } };
  }

  const gate = gateBetween(gates, from, to, dir);
  if (gate === null) return { target: to, state: { hold: null, last: now } };
  return {
    target: gate,
    state: { hold: { at: gate, dir, since: now }, last: now },
  };
}
