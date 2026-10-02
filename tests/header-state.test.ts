import { describe, expect, it } from "vitest";
import { headerMode, isHeaderSolid } from "../src/lib/motion/header-state";

describe("headerMode", () => {
  const base = {
    hasOverlay: true,
    supportsScrollTimeline: false,
    hasIntersectionObserver: true,
  };

  it("is static (always solid) on pages without an overlay hero", () => {
    expect(headerMode({ ...base, hasOverlay: false })).toBe("static");
  });

  it("uses the CSS scroll timeline when supported", () => {
    expect(headerMode({ ...base, supportsScrollTimeline: true })).toBe("css");
  });

  it("falls back to an IntersectionObserver sentinel", () => {
    expect(headerMode(base)).toBe("observer");
  });

  it("stays solid when neither is available", () => {
    expect(headerMode({ ...base, hasIntersectionObserver: false })).toBe(
      "static",
    );
  });
});

describe("isHeaderSolid", () => {
  it("is transparent while the top sentinel is visible", () => {
    expect(isHeaderSolid({ isIntersecting: true })).toBe(false);
  });

  it("is solid once the sentinel scrolls out of view", () => {
    expect(isHeaderSolid({ isIntersecting: false })).toBe(true);
  });
});
