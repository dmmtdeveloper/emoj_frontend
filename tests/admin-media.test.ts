import { describe, expect, it } from "vitest";
import {
  ALT_MAX,
  altError,
  formatBytes,
  orderedIds,
  smallForCover,
  uploadError,
} from "../src/lib/admin/media";

function file(type: string, size: number) {
  return { type, size, name: "x" };
}

describe("uploadError", () => {
  it("accepts JPEG, PNG, WebP and AVIF up to 15 MB", () => {
    expect(uploadError(file("image/jpeg", 1000))).toBeNull();
    expect(uploadError(file("image/avif", 15 * 1024 * 1024))).toBeNull();
  });

  it("explains other formats and files that are too big", () => {
    expect(uploadError(file("image/svg+xml", 10))).toMatch(/JPG, PNG, WebP/);
    expect(uploadError(file("application/pdf", 10))).toMatch(/JPG, PNG, WebP/);
    expect(uploadError(file("image/png", 15 * 1024 * 1024 + 1))).toMatch(
      /15 MB/,
    );
  });
});

describe("altError", () => {
  it("requires a description of at most 250 characters", () => {
    expect(altError("  ")).toMatch(/Describe/);
    expect(altError("Planta elevadora de aguas servidas")).toBeNull();
    expect(altError("x".repeat(ALT_MAX + 1))).toMatch(/250/);
  });
});

describe("smallForCover", () => {
  it("flags images narrower than 1600 px", () => {
    expect(smallForCover({ width: 1200, height: 800 })).toBe(true);
    expect(smallForCover({ width: 2048, height: 1365 })).toBe(false);
    expect(smallForCover({ width: 0, height: 0 })).toBe(false);
  });
});

describe("formatBytes", () => {
  it("uses KB and MB with a Chilean decimal comma", () => {
    expect(formatBytes(900)).toBe("1 KB");
    expect(formatBytes(250_000)).toBe("244 KB");
    expect(formatBytes(3_400_000)).toBe("3,2 MB");
  });
});

describe("orderedIds", () => {
  it("moves an item up or down and removes it", () => {
    expect(orderedIds(["a", "b", "c"], "c", "up")).toEqual(["a", "c", "b"]);
    expect(orderedIds(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(orderedIds(["a", "b", "c"], "a", "down")).toEqual(["b", "a", "c"]);
    expect(orderedIds(["a", "b", "c"], "b", "remove")).toEqual(["a", "c"]);
  });
});
