import { describe, expect, it } from "vitest";
import {
  HEADER_SOLID_AT,
  headerMode,
  headerSolidAt,
  solidStartFor,
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

  it("stays transparent up to the threshold", () => {
    expect(headerSolidAt(HEADER_SOLID_AT)).toBe(0);
  });

  it("is solid as soon as the page passes the threshold", () => {
    expect(headerSolidAt(HEADER_SOLID_AT + 1)).toBe(1);
    expect(headerSolidAt(5000)).toBe(1);
  });

  it("never stops half way (a restored scroll lands anywhere)", () => {
    for (let y = -50; y <= 400; y += 7) {
      expect([0, 1]).toContain(headerSolidAt(y));
      expect([0, 1]).toContain(headerSolidAt(y, 200));
    }
  });

  it("waits for the start offset before turning solid", () => {
    expect(headerSolidAt(200, 200)).toBe(0);
    expect(headerSolidAt(200 + HEADER_SOLID_AT + 1, 200)).toBe(1);
  });

  it("treats overscroll above the top as transparent", () => {
    expect(headerSolidAt(-40)).toBe(0);
  });
});

describe("solidStartFor", () => {
  it("keeps the bar clear until the hero's foot reaches it", () => {
    expect(solidStartFor({ heroBottom: 2610, headerHeight: 72 })).toBe(
      2610 - 72 - HEADER_SOLID_AT,
    );
  });

  it("never starts above the top of the page", () => {
    expect(solidStartFor({ heroBottom: 40, headerHeight: 72 })).toBe(0);
  });
});
