/**
 * Physics and projection for the hero's interactive dot grid (a "3D dot
 * matrix"): a plane of nodes on springs that the pointer pushes aside and
 * lifts toward the viewer, seen through a light perspective tilt. Pure
 * functions over typed arrays, so they are testable and cheap per frame;
 * drawing lives in src/scripts/dot-grid.ts.
 *
 * Units: pixels and seconds. +z points toward the viewer.
 */

export interface Grid {
  cols: number;
  rows: number;
  spacing: number;
  restX: Float32Array;
  restY: Float32Array;
  dx: Float32Array;
  dy: Float32Array;
  dz: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
}

export interface GridParams {
  /** Reach of the pointer, px. */
  radius: number;
  /** Sideways push away from the pointer at its centre, px/s². */
  push: number;
  /** Lift toward the viewer at the pointer's centre, px/s². */
  lift: number;
  /** Spring stiffness back to rest, 1/s². */
  stiffness: number;
  /** Velocity damping, 1/s. */
  damping: number;
}

export const DEFAULT_PARAMS: GridParams = {
  radius: 190,
  push: 420,
  lift: 2600,
  stiffness: 60,
  damping: 11,
};

/**
 * Nodes every `spacing` px over a `width`×`height` box, one spare node
 * beyond each edge (so the tilted plane never shows a border), centred on
 * the box.
 */
export function createGrid(
  width: number,
  height: number,
  spacing: number,
): Grid {
  const cols = Math.ceil(width / spacing) + 3;
  const rows = Math.ceil(height / spacing) + 3;
  const n = cols * rows;
  const restX = new Float32Array(n);
  const restY = new Float32Array(n);
  const x0 = width / 2 - ((cols - 1) * spacing) / 2;
  const y0 = height / 2 - ((rows - 1) * spacing) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      restX[i] = x0 + c * spacing;
      restY[i] = y0 + r * spacing;
    }
  }
  return {
    cols,
    rows,
    spacing,
    restX,
    restY,
    dx: new Float32Array(n),
    dy: new Float32Array(n),
    dz: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    vz: new Float32Array(n),
  };
}

export function nodeIndex(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col;
}

/**
 * Advances the springs by `dt` (semi-implicit Euler). Returns the mean
 * motion energy (velocity² plus spring offset²); 0 means fully at rest, so
 * the render loop can stop.
 */
export function stepGrid(
  grid: Grid,
  pointer: { x: number; y: number } | null,
  dt: number,
  params: GridParams = DEFAULT_PARAMS,
): number {
  const { radius, push, lift, stiffness, damping } = params;
  const { restX, restY, dx, dy, dz, vx, vy, vz } = grid;
  const n = restX.length;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    let ax = 0;
    let ay = 0;
    let az = 0;
    if (pointer) {
      const ox = (restX[i] ?? 0) - pointer.x;
      const oy = (restY[i] ?? 0) - pointer.y;
      const d = Math.hypot(ox, oy);
      if (d < radius) {
        const t = 1 - d / radius;
        const f = t * t;
        if (d > 0.0001) {
          ax += (ox / d) * f * push;
          ay += (oy / d) * f * push;
        }
        az += f * lift;
      }
    }
    const px = dx[i] ?? 0;
    const py = dy[i] ?? 0;
    const pz = dz[i] ?? 0;
    let nvx = vx[i] ?? 0;
    let nvy = vy[i] ?? 0;
    let nvz = vz[i] ?? 0;
    if (ax === 0 && ay === 0 && az === 0 && px === 0 && py === 0 && pz === 0) {
      if (nvx === 0 && nvy === 0 && nvz === 0) continue;
    }
    nvx += (ax - stiffness * px - damping * nvx) * dt;
    nvy += (ay - stiffness * py - damping * nvy) * dt;
    nvz += (az - stiffness * pz - damping * nvz) * dt;
    let nx = px + nvx * dt;
    let ny = py + nvy * dt;
    let nz = pz + nvz * dt;
    // Snap tiny residues to exact rest so the loop can stop.
    if (
      !pointer &&
      Math.abs(nx) + Math.abs(ny) + Math.abs(nz) < 0.002 &&
      Math.abs(nvx) + Math.abs(nvy) + Math.abs(nvz) < 0.02
    ) {
      nx = ny = nz = nvx = nvy = nvz = 0;
    }
    dx[i] = nx;
    dy[i] = ny;
    dz[i] = nz;
    vx[i] = nvx;
    vy[i] = nvy;
    vz[i] = nvz;
    energy += nvx * nvx + nvy * nvy + nvz * nvz + nx * nx + ny * ny + nz * nz;
  }
  return energy / n;
}

export interface View {
  /** Pivot of the tilt (usually the box centre), px. */
  cx: number;
  cy: number;
  /** Perspective distance, px (larger = flatter). */
  focal: number;
  /** Rotation around the horizontal axis, radians (+ tips the top away). */
  tiltX: number;
  /** Rotation around the vertical axis, radians (+ brings the left side closer). */
  tiltY: number;
}

/** Projects a point of the plane to the screen; `scale` > 1 when nearer. */
export function project(
  x: number,
  y: number,
  z: number,
  view: View,
): { x: number; y: number; scale: number } {
  const X = x - view.cx;
  const Y = y - view.cy;
  const cosY = Math.cos(view.tiltY);
  const sinY = Math.sin(view.tiltY);
  const x1 = X * cosY - z * sinY;
  const z1 = -X * sinY + z * cosY;
  const cosX = Math.cos(view.tiltX);
  const sinX = Math.sin(view.tiltX);
  const y2 = Y * cosX - z1 * sinX;
  const z2 = Y * sinX + z1 * cosX;
  const scale = view.focal / (view.focal - z2);
  return { x: view.cx + x1 * scale, y: view.cy + y2 * scale, scale };
}
