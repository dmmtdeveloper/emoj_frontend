import { describe, expect, it } from "vitest";
import {
  BURST_GAP,
  gateStep,
  HOLD_MAX,
  INITIAL_GATE,
  type GateState,
} from "../src/lib/motion/scroll-gate";

/** Pin starts of three chapters. */
const GATES = [1000, 4000, 7000];

/** Runs wheel steps of `delta` px, `every` ms apart, from `from`. */
function spin(
  from: number,
  delta: number,
  steps: number,
  every = 16,
  start: GateState = INITIAL_GATE,
  t0 = 0,
) {
  let at = from;
  let state = start;
  let now = t0;
  for (let i = 0; i < steps; i += 1) {
    const step = gateStep(GATES, state, { from: at, to: at + delta, now });
    at = step.target;
    state = step.state;
    now += every;
  }
  return { at, state, now };
}

describe("gateStep", () => {
  it("passes a step that crosses no gate", () => {
    const { target } = gateStep(GATES, INITIAL_GATE, {
      from: 100,
      to: 500,
      now: 0,
    });
    expect(target).toBe(500);
  });

  it("stops a fast spin at the next chapter instead of skipping it", () => {
    expect(spin(100, 400, 30).at).toBe(1000);
  });

  it("holds at the gate for the rest of the burst", () => {
    const first = spin(100, 400, 5);
    expect(first.at).toBe(1000);
    const more = spin(first.at, 400, 5, 16, first.state, first.now);
    expect(more.at).toBe(1000);
  });

  it("lets a new spin, after a pause, continue into the chapter", () => {
    const first = spin(100, 400, 5);
    const next = spin(
      first.at,
      400,
      2,
      16,
      first.state,
      first.now + BURST_GAP + 1,
    );
    expect(next.at).toBe(1800);
  });

  it("releases a hold that lasts too long (a slow, steady scroll)", () => {
    const first = spin(100, 400, 3);
    const later = gateStep(GATES, first.state, {
      from: 1000,
      to: 1040,
      now: first.now + HOLD_MAX + 1,
    });
    expect(later.target).toBe(1040);
  });

  it("stops at chapter starts going up too", () => {
    expect(spin(6500, -400, 30).at).toBe(4000);
  });

  it("releases the hold when the direction reverses", () => {
    const first = spin(100, 400, 5);
    const back = gateStep(GATES, first.state, {
      from: 1000,
      to: 900,
      now: first.now,
    });
    expect(back.target).toBe(900);
  });

  it("lands exactly on a gate and holds there", () => {
    const step = gateStep(GATES, INITIAL_GATE, { from: 600, to: 1000, now: 0 });
    expect(step.target).toBe(1000);
    expect(step.state.hold?.at).toBe(1000);
  });
});
