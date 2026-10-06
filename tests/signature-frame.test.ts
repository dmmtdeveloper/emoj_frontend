import { describe, expect, it } from "vitest";
import { signatureFramePath } from "../src/lib/motion/signature-frame";

describe("signatureFramePath", () => {
  it("draws an open bracket from the top-right, around the rounded left corners, to the bottom-right", () => {
    const frame = signatureFramePath({ width: 700, height: 440, radius: 64 });
    expect(frame).toEqual({
      d: "M700 0H64A64 64 0 0 0 0 64V376A64 64 0 0 0 64 440H700",
      start: { x: 700, y: 0 },
      end: { x: 700, y: 440 },
    });
  });

  it("stops the line short of the dots when there is a gap, like the isotype", () => {
    const frame = signatureFramePath({
      width: 700,
      height: 440,
      radius: 64,
      dotGap: 8,
    });
    expect(frame).toEqual({
      d: "M692 0H64A64 64 0 0 0 0 64V376A64 64 0 0 0 64 440H692",
      start: { x: 700, y: 0 },
      end: { x: 700, y: 440 },
    });
  });

  it("caps the radius at half the height so the corners never overlap", () => {
    const frame = signatureFramePath({ width: 300, height: 80, radius: 64 });
    expect(frame?.d).toBe(
      "M300 0H40A40 40 0 0 0 0 40V40A40 40 0 0 0 40 80H300",
    );
  });

  it("rounds to two decimals to keep the attribute short", () => {
    const frame = signatureFramePath({
      width: 640.12345,
      height: 400.98765,
      radius: 62.5,
    });
    expect(frame?.d).toBe(
      "M640.12 0H62.5A62.5 62.5 0 0 0 0 62.5V338.49A62.5 62.5 0 0 0 62.5 400.99H640.12",
    );
    expect(frame?.end).toEqual({ x: 640.12, y: 400.99 });
  });

  it("returns null for a box with no size (hidden or not laid out yet)", () => {
    expect(
      signatureFramePath({ width: 0, height: 400, radius: 50 }),
    ).toBeNull();
    expect(
      signatureFramePath({ width: 600, height: 0, radius: 50 }),
    ).toBeNull();
  });
});
