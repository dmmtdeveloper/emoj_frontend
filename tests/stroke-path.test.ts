import { describe, expect, it } from "vitest";
import {
  boxShare,
  drawFromEnd,
  parseCubicPath,
  pointAlong,
  samplePath,
  strokeSchedule,
} from "../src/lib/motion/stroke-path";
import { ISOTYPE } from "../src/components/home/chapters/isotype";

describe("parseCubicPath", () => {
  it("reads relative cubics, chained from the end of the previous one", () => {
    expect(parseCubicPath("M10,20c0,0,10,0,10,0 5,5,5,5,0,10")).toEqual([
      {
        from: { x: 10, y: 20 },
        c1: { x: 10, y: 20 },
        c2: { x: 20, y: 20 },
        to: { x: 20, y: 20 },
      },
      {
        from: { x: 20, y: 20 },
        c1: { x: 25, y: 25 },
        c2: { x: 25, y: 25 },
        to: { x: 20, y: 30 },
      },
    ]);
  });

  it("reads absolute cubics and numbers glued by their signs", () => {
    const [curve] = parseCubicPath("M0 0C1-1 2-2 3-3");
    expect(curve?.to).toEqual({ x: 3, y: -3 });
    expect(curve?.c1).toEqual({ x: 1, y: -1 });
  });

  it("refuses commands it does not know", () => {
    expect(() => parseCubicPath("M0 0L10 10")).toThrow();
  });

  it("reads the whole isotype stroke, right end to left end", () => {
    const curves = parseCubicPath(ISOTYPE.stroke);
    expect(curves).toHaveLength(6);
    expect(curves[0]?.from).toEqual({ x: 704.94, y: 135.39 });
    expect(curves.at(-1)?.to.x).toBeCloseTo(147.78, 2);
    expect(curves.at(-1)?.to.y).toBeCloseTo(175.51, 2);
  });
});

describe("pointAlong", () => {
  // A straight cubic, its handles at the thirds: uniform speed.
  const line = samplePath(parseCubicPath("M0,0c10,0,20,0,30,0"));

  it("measures the path", () => {
    expect(line.length).toBeCloseTo(30, 3);
  });

  it("finds the point at a share of the length", () => {
    expect(pointAlong(line, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(line, 0.5).x).toBeCloseTo(15, 1);
    expect(pointAlong(line, 1).x).toBeCloseTo(30, 3);
  });

  it("keeps the share inside 0..1", () => {
    expect(pointAlong(line, -1)).toEqual(pointAlong(line, 0));
    expect(pointAlong(line, 2)).toEqual(pointAlong(line, 1));
  });

  it("follows the isotype from end to end", () => {
    const stroke = samplePath(parseCubicPath(ISOTYPE.stroke));
    expect(pointAlong(stroke, 0)).toEqual({ x: 704.94, y: 135.39 });
    expect(pointAlong(stroke, 1).x).toBeCloseTo(147.78, 1);
  });
});

describe("boxShare", () => {
  it("places a point in a viewBox, as shares of its width and height", () => {
    expect(boxShare({ x: 96, y: 40 }, "96 40 660 258")).toEqual({
      x: 0,
      y: 0,
    });
    const middle = boxShare({ x: 426, y: 169 }, "96 40 660 258");
    expect(middle.x).toBeCloseTo(0.5);
    expect(middle.y).toBeCloseTo(0.5);
  });
});

describe("drawFromEnd", () => {
  it("shows the last share of a path drawn backwards", () => {
    expect(drawFromEnd(0)).toBe("1 1");
    expect(drawFromEnd(0.25)).toBe("0.75 1");
    expect(drawFromEnd(1)).toBe("0 1");
    expect(drawFromEnd(3)).toBe("0 1");
  });
});

describe("strokeSchedule", () => {
  const schedule = strokeSchedule([0.1, 0.5, 1], 0.1, 0.7, 0.4);

  it("gives every station an equal slot: travel, then a hold", () => {
    expect(schedule).toEqual([
      { from: 0, to: 0.1, start: 1000, reach: 2200 },
      { from: 0.1, to: 0.5, start: 3000, reach: 4200 },
      { from: 0.5, to: 1, start: 5000, reach: 6200 },
    ]);
  });

  it("reaches each station before the next slot starts", () => {
    schedule.slice(1).forEach((next, i) => {
      expect(schedule[i]?.reach).toBeLessThan(next.start);
    });
  });
});
