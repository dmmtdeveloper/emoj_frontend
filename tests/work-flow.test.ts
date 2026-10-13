import { describe, expect, it } from "vitest";
import {
  activeStage,
  endingShare,
  riverShare,
  scrollForStage,
  stageFill,
  STATIONS,
  workFlowMode,
} from "../src/lib/motion/work-flow";

describe("STATIONS", () => {
  it("has six stations in order along the stroke", () => {
    expect(STATIONS).toHaveLength(6);
    for (let i = 1; i < STATIONS.length; i++) {
      expect(STATIONS[i]).toBeGreaterThan(STATIONS[i - 1] ?? 0);
    }
    expect(STATIONS.at(-1)).toBeLessThan(1);
  });
});

describe("riverShare", () => {
  it("is empty at the top and complete at the bottom", () => {
    expect(riverShare(0)).toBe(0);
    expect(riverShare(1)).toBe(1);
  });

  it("never runs backwards while scrolling down", () => {
    let previous = -1;
    for (let s = 0; s <= 1; s += 0.005) {
      const d = riverShare(s);
      expect(d).toBeGreaterThanOrEqual(previous);
      previous = d;
    }
  });

  it("parks on each station for a stretch of the scroll", () => {
    STATIONS.forEach((station, i) => {
      const middle = scrollForStage(i);
      expect(riverShare(middle)).toBeCloseTo(station, 6);
      expect(riverShare(middle + 0.01)).toBeCloseTo(station, 6);
      expect(riverShare(middle - 0.01)).toBeCloseTo(station, 6);
    });
  });

  it("clamps scroll outside 0..1", () => {
    expect(riverShare(-0.5)).toBe(0);
    expect(riverShare(2)).toBe(1);
  });
});

describe("activeStage", () => {
  it("is -1 before the first station", () => {
    expect(activeStage(0)).toBe(-1);
  });

  it("is the last station the river has reached", () => {
    expect(activeStage(STATIONS[0] ?? 0)).toBe(0);
    expect(activeStage(((STATIONS[2] ?? 0) + (STATIONS[3] ?? 0)) / 2)).toBe(2);
    expect(activeStage(1)).toBe(5);
  });

  it("matches the stage each jump target lands on", () => {
    STATIONS.forEach((_, i) => {
      expect(activeStage(riverShare(scrollForStage(i)))).toBe(i);
    });
  });
});

describe("stageFill", () => {
  it("is 0 before a stage and 1 once the river has passed it", () => {
    expect(stageFill(2, 0)).toBe(0);
    expect(stageFill(2, STATIONS[3] ?? 1)).toBe(1);
  });

  it("fills the last stage as soon as it is reached", () => {
    expect(stageFill(5, STATIONS[5] ?? 1)).toBe(1);
  });
});

describe("endingShare", () => {
  it("stays at 0 while the stages play and reaches 1 near the bottom", () => {
    expect(endingShare(0)).toBe(0);
    expect(endingShare(scrollForStage(5))).toBe(0);
    expect(endingShare(1)).toBe(1);
  });

  it("only starts after the river is complete", () => {
    for (let s = 0; s <= 1; s += 0.01) {
      if (endingShare(s) > 0) expect(riverShare(s)).toBe(1);
    }
  });
});

describe("workFlowMode", () => {
  it("is static with reduced motion", () => {
    expect(workFlowMode({ prefersReducedMotion: true })).toBe("static");
  });

  it("plays with scroll otherwise", () => {
    expect(workFlowMode({ prefersReducedMotion: false })).toBe("scroll");
  });
});
