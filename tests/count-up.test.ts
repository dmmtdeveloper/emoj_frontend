import { describe, expect, it } from "vitest";
import {
  countValueAt,
  easeOutCubic,
  formatCount,
  parseCount,
} from "../src/lib/motion/count-up";

describe("parseCount", () => {
  it.each([
    ["30+", { prefix: "", value: 30, suffix: "+" }],
    ["7", { prefix: "", value: 7, suffix: "" }],
    ["+1.200 l/s", { prefix: "+", value: 1200, suffix: " l/s" }],
    ["  6 ", { prefix: "", value: 6, suffix: "" }],
  ])("%j", (text, expected) => {
    expect(parseCount(text)).toEqual(expected);
  });

  it.each(["", "sin cifras", "1,5"])("returns null for %j", (text) => {
    expect(parseCount(text)).toBeNull();
  });
});

describe("formatCount", () => {
  it("keeps prefix and suffix and groups thousands like es-CL", () => {
    expect(
      formatCount({ prefix: "+", value: 1200, suffix: " l/s" }, 1200),
    ).toBe("+1.200 l/s");
    expect(formatCount({ prefix: "", value: 30, suffix: "+" }, 12)).toBe("12+");
  });
});

describe("easeOutCubic", () => {
  it("starts at 0, ends at 1 and clamps out-of-range input", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });
});

describe("countValueAt", () => {
  const spec = { prefix: "", value: 30, suffix: "+" };

  it("goes from 0 to the target, rounded to integers", () => {
    expect(countValueAt(spec, 0)).toBe(0);
    expect(countValueAt(spec, 0.5)).toBe(26);
    expect(countValueAt(spec, 1)).toBe(30);
  });

  it("never overshoots the target", () => {
    expect(countValueAt(spec, 5)).toBe(30);
  });
});
