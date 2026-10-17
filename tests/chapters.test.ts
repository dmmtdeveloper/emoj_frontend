import { describe, expect, it } from "vitest";
import {
  deckSlot,
  focusFit,
  noise,
  orbitPoint,
  SCENE_LENGTH,
  stageTimes,
  typedText,
} from "../src/lib/motion/chapters";

describe("focusFit", () => {
  const stage = { width: 1400, height: 800, gutter: 100 };
  const label = { top: 200, height: 16 };

  it("moves the scene to the centre of the room under the label", () => {
    const fit = focusFit({
      ...stage,
      label,
      scene: { left: 760, top: 200, width: 500, height: 400 },
    });
    // pad = max(24, 40) = 40; room top = 40 + 16 + 16 = 72.
    // room = 1200 x 688 → scale min(2.4, 1.72) = 1.72.
    expect(fit.scale).toBeCloseTo(1.72);
    expect(fit.dx).toBeCloseTo(700 - 1010);
    expect(fit.dy).toBeCloseTo(72 + 344 - 400);
    expect(fit.labelDy).toBeCloseTo(40 - 200);
  });

  it("never shrinks the scene nor grows it more than twice", () => {
    const small = focusFit({
      ...stage,
      label,
      scene: { left: 760, top: 200, width: 100, height: 80 },
    });
    expect(small.scale).toBe(2);
    const big = focusFit({
      ...stage,
      label,
      scene: { left: 0, top: 0, width: 1300, height: 900 },
    });
    expect(big.scale).toBe(1);
  });
});

describe("deckSlot", () => {
  it("puts card `step` in front and the rest behind in order", () => {
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 0, 4))).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 1, 4))).toEqual([3, 0, 1, 2]);
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 3, 4))).toEqual([1, 2, 3, 0]);
  });
});

describe("stageTimes", () => {
  it("spreads the stages evenly over a stretch of the timeline", () => {
    expect(stageTimes(4, 0.2, 0.6)).toEqual([2000, 3000, 4000, 5000]);
    expect(SCENE_LENGTH).toBe(10000);
  });
});

describe("noise", () => {
  it("is deterministic and stays in 0..1", () => {
    expect(noise(3)).toBe(noise(3));
    for (let i = 0; i < 50; i++) {
      expect(noise(i)).toBeGreaterThanOrEqual(0);
      expect(noise(i)).toBeLessThan(1);
    }
    expect(noise(1)).not.toBe(noise(2));
  });
});

describe("typedText", () => {
  it("shows the text as it is typed", () => {
    expect(typedText("LINEA", 0)).toBe("");
    expect(typedText("LINEA", 0.4)).toBe("LI");
    expect(typedText("LINEA", 1)).toBe("LINEA");
    expect(typedText("LINEA", 7)).toBe("LINEA");
  });
});

describe("orbitPoint", () => {
  it("places a point on a circle, clockwise from the top", () => {
    const top = orbitPoint(0, 100, { x: 300, y: 300 });
    expect(top.x).toBeCloseTo(300);
    expect(top.y).toBeCloseTo(200);
    const right = orbitPoint(90, 100, { x: 300, y: 300 });
    expect(right.x).toBeCloseTo(400);
    expect(right.y).toBeCloseTo(300);
    const bottom = orbitPoint(180, 100, { x: 300, y: 300 });
    expect(bottom.y).toBeCloseTo(400);
  });
});
