import { describe, expect, it } from "vitest";
import { spotlightEnabled, spotlightPoint } from "../src/lib/motion/spotlight";

describe("spotlightEnabled", () => {
  it("is on for a mouse (hover + fine pointer) with motion allowed", () => {
    expect(
      spotlightEnabled({ prefersReducedMotion: false, finePointer: true }),
    ).toBe(true);
  });

  it("is off on touch screens (no hover to follow)", () => {
    expect(
      spotlightEnabled({ prefersReducedMotion: false, finePointer: false }),
    ).toBe(false);
  });

  it("is off with reduced motion", () => {
    expect(
      spotlightEnabled({ prefersReducedMotion: true, finePointer: true }),
    ).toBe(false);
  });
});

describe("spotlightPoint", () => {
  it("converts a viewport point into the element's own coordinates", () => {
    expect(
      spotlightPoint({ left: 100, top: -300 }, { clientX: 250, clientY: 40 }),
    ).toEqual({ x: "150px", y: "340px" });
  });

  it("rounds to whole pixels", () => {
    expect(
      spotlightPoint({ left: 0.4, top: 0 }, { clientX: 10.9, clientY: 5.2 }),
    ).toEqual({ x: "11px", y: "5px" });
  });
});
