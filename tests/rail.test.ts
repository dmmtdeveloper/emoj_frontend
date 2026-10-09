import { describe, expect, it } from "vitest";
import { railState, railTarget } from "../src/lib/motion/rail";

// Four 400px cards with a 20px gap (step 420) in an 1000px-wide viewport:
// scrollWidth = 4 * 400 + 3 * 20 = 1660, so it scrolls 660px at most.
const base = { scrollWidth: 1660, clientWidth: 1000, step: 420, count: 4 };

describe("railState", () => {
  it("starts at the first card with no progress", () => {
    expect(railState({ ...base, scrollLeft: 0 })).toEqual({
      index: 0,
      progress: 0,
      atStart: true,
      atEnd: false,
      scrollable: true,
    });
  });

  it("reports the card nearest to the start and the share scrolled", () => {
    const state = railState({ ...base, scrollLeft: 430 });
    expect(state.index).toBe(1);
    expect(state.progress).toBeCloseTo(430 / 660);
    expect(state.atStart).toBe(false);
    expect(state.atEnd).toBe(false);
  });

  it("treats the last pixels as the end (snap may stop short)", () => {
    const state = railState({ ...base, scrollLeft: 659 });
    expect(state.atEnd).toBe(true);
    expect(state.progress).toBe(1);
    expect(state.index).toBe(3);
  });

  it("is not scrollable when every card fits", () => {
    expect(
      railState({
        scrollLeft: 0,
        scrollWidth: 800,
        clientWidth: 1000,
        step: 420,
        count: 2,
      }),
    ).toEqual({
      index: 0,
      progress: 1,
      atStart: true,
      atEnd: true,
      scrollable: false,
    });
  });
});

describe("railTarget", () => {
  it("moves one card forward or back from the current one", () => {
    expect(railTarget({ ...base, scrollLeft: 0 }, 1)).toBe(420);
    expect(railTarget({ ...base, scrollLeft: 430 }, -1)).toBe(0);
  });

  it("never goes past either end", () => {
    expect(railTarget({ ...base, scrollLeft: 420 }, 1)).toBe(660);
    expect(railTarget({ ...base, scrollLeft: 0 }, -1)).toBe(0);
  });
});
