import { describe, expect, it } from "vitest";
import {
  contourLines,
  contourRadius,
  pinDrop,
  smoothClosedPath,
  type ContourOptions,
} from "../src/lib/motion/survey";

const OPTIONS: ContourOptions = {
  center: { x: 300, y: 180 },
  count: 9,
  first: 22,
  step: 26,
  wobble: 0.16,
  drift: { x: 6, y: -3 },
  seed: 7,
};

describe("contourRadius", () => {
  it("is the same every time for the same ring and angle", () => {
    expect(contourRadius(3, 1.2, OPTIONS)).toBe(contourRadius(3, 1.2, OPTIONS));
  });

  it("is not a circle: the radius changes around the ring", () => {
    const radii = Array.from({ length: 24 }, (_, i) =>
      contourRadius(4, (i / 24) * Math.PI * 2, OPTIONS),
    );
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(8);
  });

  it("wobbles within its share of the ring's radius", () => {
    const base = OPTIONS.first + 4 * OPTIONS.step;
    for (let i = 0; i < 48; i++) {
      const r = contourRadius(4, (i / 48) * Math.PI * 2, OPTIONS);
      expect(r).toBeGreaterThan(base * (1 - OPTIONS.wobble));
      expect(r).toBeLessThan(base * (1 + OPTIONS.wobble));
    }
  });
});

describe("contourLines", () => {
  const lines = contourLines(OPTIONS);

  it("draws one closed line per ring, every fifth one an index contour", () => {
    expect(lines).toHaveLength(9);
    lines.forEach((line) => {
      expect(line.d.startsWith("M")).toBe(true);
      expect(line.d.endsWith("Z")).toBe(true);
    });
    expect(lines.map((line) => line.index)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("never lets a ring cross the one inside it", () => {
    for (let k = 1; k < OPTIONS.count; k++) {
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const at = (ring: number) => {
          const r = contourRadius(ring, angle, OPTIONS);
          return {
            x: OPTIONS.center.x + ring * OPTIONS.drift.x + r * Math.cos(angle),
            y: OPTIONS.center.y + ring * OPTIONS.drift.y + r * Math.sin(angle),
          };
        };
        const inner = at(k - 1);
        const outer = at(k);
        const out = (p: { x: number; y: number }) =>
          Math.hypot(p.x - OPTIONS.center.x, p.y - OPTIONS.center.y);
        expect(out(outer)).toBeGreaterThan(out(inner));
      }
    }
  });
});

describe("smoothClosedPath", () => {
  it("joins the points with one cubic each and closes the loop", () => {
    const d = smoothClosedPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(4);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("is empty without enough points", () => {
    expect(smoothClosedPath([{ x: 0, y: 0 }])).toBe("");
  });
});

describe("pinDrop", () => {
  const drop = pinDrop(120, [0.2, 0.06]);

  it("falls, lands, and bounces twice, each bounce lower", () => {
    expect(drop.map((frame) => frame.y)).toEqual([0, -24, 0, -7.2, 0]);
  });

  it("spends most of the time falling and the shares add up to one", () => {
    const total = drop.reduce((sum, frame) => sum + frame.share, 0);
    expect(total).toBeCloseTo(1);
    expect(drop[0]?.share).toBeGreaterThan(0.4);
  });

  it("grows the shadow as the pin nears the ground", () => {
    expect(drop.map((frame) => frame.shadow)).toEqual([1, 0.88, 1, 0.964, 1]);
    expect(pinDrop(120, []).length).toBe(1);
  });
});
