import { describe, expect, it } from "vitest";
import { spotlightEnabled } from "../src/lib/motion/spotlight";

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
