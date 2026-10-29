import { describe, expect, it } from "vitest";
import { labelAlong, pinDrop, pinShadow } from "../src/lib/motion/survey";

describe("labelAlong", () => {
  it("sits at a share of the street, lifted off it", () => {
    const label = labelAlong({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5, 10);
    expect(label.x).toBeCloseTo(50);
    expect(label.y).toBeCloseTo(-10);
    expect(label.angle).toBeCloseTo(0);
  });

  it("follows a sloping street", () => {
    const label = labelAlong({ x: 0, y: 0 }, { x: 100, y: 100 }, 0, 0);
    expect(label.angle).toBeCloseTo(45);
  });

  it("never reads upside down", () => {
    // Drawn right to left: the text still reads left to right.
    expect(
      labelAlong({ x: 100, y: 0 }, { x: 0, y: 0 }, 0.5, 0).angle,
    ).toBeCloseTo(0);
    // Drawn top to bottom: a vertical street reads bottom to top.
    expect(
      labelAlong({ x: 0, y: 0 }, { x: 0, y: 100 }, 0.5, 0).angle,
    ).toBeCloseTo(-90);
  });

  it("lifts the label to the same side whatever way the street is drawn", () => {
    const a = labelAlong({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5, 10);
    const b = labelAlong({ x: 100, y: 0 }, { x: 0, y: 0 }, 0.5, 10);
    expect(b.y).toBeCloseTo(a.y);
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

  it("shrinks the shadow of a pin in the air", () => {
    expect(pinShadow(-120, 120)).toBeCloseTo(0.4);
    expect(pinShadow(0, 120)).toBe(1);
  });
});
