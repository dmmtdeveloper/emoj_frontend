import { describe, expect, it } from "vitest";
import {
  HEADER_SOLID_RANGE,
  headerMode,
  headerSolidAt,
} from "../src/lib/motion/header-state";

describe("headerMode", () => {
  it("is static (always solid) on pages without an overlay hero", () => {
    expect(headerMode({ hasOverlay: false })).toBe("static");
  });

  it("follows the scroll on pages with an overlay hero", () => {
    expect(headerMode({ hasOverlay: true })).toBe("scroll");
  });
});

describe("headerSolidAt", () => {
  it("is transparent at the top of the page", () => {
    expect(headerSolidAt(0)).toBe(0);
  });

  it("turns solid gradually over the range", () => {
    expect(headerSolidAt(HEADER_SOLID_RANGE / 2)).toBeCloseTo(0.5);
  });

  it("is fully solid past the range", () => {
    expect(headerSolidAt(HEADER_SOLID_RANGE)).toBe(1);
    expect(headerSolidAt(5000)).toBe(1);
  });

  it("waits for the start offset before turning solid", () => {
    expect(headerSolidAt(100, 200)).toBe(0);
    expect(headerSolidAt(200 + HEADER_SOLID_RANGE / 2, 200)).toBeCloseTo(0.5);
  });

  it("treats overscroll above the top as transparent", () => {
    expect(headerSolidAt(-40)).toBe(0);
  });
});
