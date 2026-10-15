import { describe, expect, it } from "vitest";
import { restoredScroll } from "../src/lib/motion/scroll-restore";

describe("restoredScroll", () => {
  it("does nothing on a fresh visit", () => {
    expect(
      restoredScroll({ saved: 800, navType: "navigate", heroHeight: 900 }),
    ).toBeNull();
  });

  it("does nothing without a saved position", () => {
    expect(
      restoredScroll({ saved: null, navType: "reload", heroHeight: 900 }),
    ).toBeNull();
  });

  it("goes back to the top when a reload lands in the upper half of the hero", () => {
    expect(
      restoredScroll({ saved: 97, navType: "reload", heroHeight: 900 }),
    ).toBe(0);
    expect(
      restoredScroll({ saved: 449, navType: "back_forward", heroHeight: 900 }),
    ).toBe(0);
  });

  it("keeps a position further down the page", () => {
    expect(
      restoredScroll({ saved: 450, navType: "reload", heroHeight: 900 }),
    ).toBe(450);
    expect(
      restoredScroll({ saved: 3200, navType: "back_forward", heroHeight: 900 }),
    ).toBe(3200);
  });

  it("ignores broken values", () => {
    expect(
      restoredScroll({ saved: Number.NaN, navType: "reload", heroHeight: 900 }),
    ).toBeNull();
    expect(
      restoredScroll({ saved: -20, navType: "reload", heroHeight: 900 }),
    ).toBe(0);
  });
});
