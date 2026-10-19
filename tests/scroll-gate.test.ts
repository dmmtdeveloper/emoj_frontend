import { describe, expect, it } from "vitest";
import {
  BURST_GAP,
  chapterPace,
  gateStep,
  HOLD_MAX,
  INITIAL_GATE,
  INSIDE_MULTIPLIER,
  LEAD_SHARE,
  type GateState,
  wheelMode,
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

describe("chapterPace", () => {
  const RANGES = [{ start: 1000, end: 2800 }];
  const VIEWPORT = 900;
  const lead = VIEWPORT * LEAD_SHARE;

  it("leaves the scroll alone outside the chapters", () => {
    expect(
      chapterPace(RANGES, {
        from: 200,
        delta: 400,
        current: 200,
        viewport: VIEWPORT,
      }),
    ).toBe(600);
  });

  it("slows each wheel step inside a chapter", () => {
    expect(
      chapterPace(RANGES, {
        from: 1200,
        delta: 100,
        current: 1200,
        viewport: VIEWPORT,
      }),
    ).toBe(1200 + 100 * INSIDE_MULTIPLIER);
  });

  it("never lets the target run more than a lead ahead of the scene", () => {
    expect(
      chapterPace(RANGES, {
        from: 1200,
        delta: 4000,
        current: 1200,
        viewport: VIEWPORT,
      }),
    ).toBe(1200 + lead);
  });

  it("holds still while the target is already a full lead ahead", () => {
    expect(
      chapterPace(RANGES, {
        from: 1200 + lead,
        delta: 400,
        current: 1200,
        viewport: VIEWPORT,
      }),
    ).toBe(1200 + lead);
  });

  it("caps the pace going up too", () => {
    expect(
      chapterPace(RANGES, {
        from: 2500,
        delta: -4000,
        current: 2500,
        viewport: VIEWPORT,
      }),
    ).toBe(2500 - lead);
  });
});

describe("wheelMode", () => {
  const RANGES = [
    { start: 1000, end: 3000 },
    { start: 4000, end: 6000 },
  ];
  const base = { holding: false, smoothing: false };

  it("scrolls natively outside the chapters", () => {
    expect(
      wheelMode(RANGES, { ...base, from: 200, to: 300, target: 300 }),
    ).toBe("native");
    expect(
      wheelMode(RANGES, { ...base, from: 3200, to: 3300, target: 3300 }),
    ).toBe("native");
    expect(
      wheelMode(RANGES, { ...base, from: 6500, to: 6400, target: 6400 }),
    ).toBe("native");
  });

  it("gates a step that stops at a chapter start", () => {
    expect(
      wheelMode(RANGES, { ...base, from: 950, to: 1050, target: 1000 }),
    ).toBe("gated");
  });

  it("gates every step that starts or lands inside a chapter", () => {
    expect(
      wheelMode(RANGES, { ...base, from: 1500, to: 1600, target: 1600 }),
    ).toBe("gated");
    // Scrolling up from below a chapter into its end.
    expect(
      wheelMode(RANGES, { ...base, from: 3050, to: 2950, target: 2950 }),
    ).toBe("gated");
  });

  it("stays gated while a burst is held at a gate", () => {
    expect(
      wheelMode(RANGES, {
        ...base,
        holding: true,
        from: 200,
        to: 300,
        target: 300,
      }),
    ).toBe("gated");
  });

  it("stays gated while a smoothed scroll is still easing", () => {
    expect(
      wheelMode(RANGES, {
        ...base,
        smoothing: true,
        from: 3200,
        to: 3300,
        target: 3300,
      }),
    ).toBe("gated");
  });
});
