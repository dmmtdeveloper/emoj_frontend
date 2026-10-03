import { describe, expect, it } from "vitest";
import {
  createGrid,
  DEFAULT_PARAMS,
  nodeIndex,
  project,
  stepGrid,
} from "../src/lib/motion/dot-grid";

describe("createGrid", () => {
  it("covers the box with one spare node beyond each edge, centred", () => {
    const grid = createGrid(100, 50, 20);
    // ceil(100/20)+3 columns, ceil(50/20)+3 rows
    expect(grid.cols).toBe(8);
    expect(grid.rows).toBe(6);
    expect(grid.restX.length).toBe(48);
    const first = grid.restX[0] ?? 0;
    const last = grid.restX[grid.cols - 1] ?? 0;
    // symmetric around the centre of the box
    expect((first + last) / 2).toBeCloseTo(50);
    expect(last - first).toBe((grid.cols - 1) * 20);
  });

  it("starts at rest", () => {
    const grid = createGrid(60, 60, 20);
    expect([...grid.dz].every((v) => v === 0)).toBe(true);
    expect([...grid.vx].every((v) => v === 0)).toBe(true);
  });
});

describe("stepGrid", () => {
  const params = { ...DEFAULT_PARAMS, radius: 100 };

  function nodeNear(grid: ReturnType<typeof createGrid>, x: number, y: number) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < grid.restX.length; i++) {
      const d = Math.hypot((grid.restX[i] ?? 0) - x, (grid.restY[i] ?? 0) - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  it("pushes nearby nodes away from the pointer and lifts them", () => {
    const grid = createGrid(400, 400, 20);
    const pointer = { x: 200, y: 200 };
    const right = nodeNear(grid, 240, 200);
    for (let i = 0; i < 20; i++) stepGrid(grid, pointer, 1 / 60, params);
    expect(grid.dx[right]).toBeGreaterThan(0);
    expect(grid.dz[right]).toBeGreaterThan(0);
  });

  it("leaves nodes outside the radius untouched", () => {
    const grid = createGrid(800, 400, 20);
    const far = nodeNear(grid, 700, 200);
    for (let i = 0; i < 20; i++)
      stepGrid(grid, { x: 100, y: 200 }, 1 / 60, params);
    expect(grid.dx[far]).toBe(0);
    expect(grid.dz[far]).toBe(0);
  });

  it("springs back to rest once the pointer leaves", () => {
    const grid = createGrid(400, 400, 20);
    for (let i = 0; i < 30; i++)
      stepGrid(grid, { x: 200, y: 200 }, 1 / 60, params);
    let energy = Infinity;
    for (let i = 0; i < 600; i++) energy = stepGrid(grid, null, 1 / 60, params);
    expect(energy).toBeLessThan(1e-3);
    const centre = nodeNear(grid, 220, 200);
    expect(Math.abs(grid.dz[centre] ?? 1)).toBeLessThan(0.05);
  });

  it("reports motion energy so the loop can stop when settled", () => {
    const grid = createGrid(200, 200, 20);
    expect(stepGrid(grid, null, 1 / 60, params)).toBe(0);
    expect(stepGrid(grid, { x: 100, y: 100 }, 1 / 60, params)).toBeGreaterThan(
      0,
    );
  });
});

describe("project", () => {
  const view = { cx: 100, cy: 50, focal: 800, tiltX: 0, tiltY: 0 };

  it("is the identity for a flat, untilted plane", () => {
    const p = project(30, 70, 0, view);
    expect(p.x).toBeCloseTo(30);
    expect(p.y).toBeCloseTo(70);
    expect(p.scale).toBeCloseTo(1);
  });

  it("enlarges points raised toward the viewer", () => {
    const p = project(100, 50, 40, view);
    expect(p.scale).toBeGreaterThan(1);
  });

  it("tilting moves the far side away (smaller) and the near side closer", () => {
    const tilted = { ...view, tiltY: 0.1 };
    const left = project(0, 50, 0, tilted);
    const right = project(200, 50, 0, tilted);
    expect(left.scale).not.toBeCloseTo(right.scale);
  });
});

describe("nodeIndex", () => {
  it("maps column and row to the flat index", () => {
    const grid = createGrid(100, 50, 20);
    expect(nodeIndex(grid, 3, 2)).toBe(2 * grid.cols + 3);
  });
});
