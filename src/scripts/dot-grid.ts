/**
 * Interactive 3D dot grid: sections can carry a subtle version behind their
 * content (DotField.astro). Nodes sit on
 * springs (src/lib/motion/dot-grid.ts); the pointer pushes them aside and
 * lifts them toward the viewer, the plane tilts slightly toward it, and
 * lifted dots grow, brighten and show relief (highlight + cast shadow).
 * Every fourth row and column is drawn as a line through the nodes, like
 * the blueprint's 96px lines.
 *
 * The loop only runs while something moves and stops once the grid is back
 * at rest. Colours come from the design tokens at runtime. Without
 * JavaScript, on touch screens or with reduced motion the static CSS grid
 * stays.
 */
import {
  createGrid,
  DEFAULT_PARAMS,
  type Grid,
  project,
  stepGrid,
  type View,
} from "../lib/motion/dot-grid";
import { spotlightEnabled } from "../lib/motion/spotlight";

const SPACING = 24;
const LINE_EVERY = 4;
const MAX_TILT_X = 0.07;
const MAX_TILT_Y = 0.1;
const FOCAL = 520;

interface Palette {
  dot: string;
  shadow: string;
}

/** How the grid looks: colours, line strength and each dot's opacity. */
export interface DotGridLook {
  palette: Palette;
  lineAlpha: number;
  /** Device pixel ratio cap: big section canvases use less memory. */
  maxDpr: number;
  /** Opacity of the dot resting at (x, y), `lifted` 0-1 toward the viewer. */
  dotAlpha: (
    x: number,
    y: number,
    w: number,
    h: number,
    lifted: number,
  ) => number;
}

const EDGE_FADE = 160;

/**
 * A section background: dots in the canvas's text colour (a token, so it
 * follows light and dark mode), barely visible at rest and fading out near
 * the edges; they only show up when the pointer lifts them.
 */
function subtleLook(canvas: HTMLCanvasElement): DotGridLook {
  const style = getComputedStyle(canvas);
  return {
    palette: {
      dot: style.color || "currentColor",
      shadow: style.getPropertyValue("--plum-950").trim() || "black",
    },
    lineAlpha: 0.03,
    maxDpr: 1.5,
    dotAlpha: (x, y, w, h, lifted) => {
      const edge = Math.min(1, Math.min(x, w - x, y, h - y) / EDGE_FADE);
      return Math.max(0, edge) * Math.min(0.45, 0.1 + 0.4 * lifted);
    },
  };
}

export function initDotGrid(
  frame: HTMLElement,
  canvas: HTMLCanvasElement,
  look: DotGridLook,
  interactive = true,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { palette } = look;
  let grid: Grid = createGrid(1, 1, SPACING);
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointer: { x: number; y: number } | null = null;
  let tiltX = 0;
  let tiltY = 0;
  let running = false;
  let last = 0;
  // The canvas only holds pixels while it is on (or near) the screen.
  let visible = false;

  const release = (): void => {
    canvas.width = 0;
    canvas.height = 0;
  };

  const resize = (): void => {
    if (!visible) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, look.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    grid = createGrid(width, height, SPACING);
    draw();
  };

  const draw = (): void => {
    if (!visible) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const view: View = {
      cx: width / 2,
      cy: height / 2,
      focal: FOCAL,
      tiltX,
      tiltY,
    };
    const { cols, rows, restX, restY, dx, dy, dz } = grid;
    const n = restX.length;
    const sx = new Float32Array(n);
    const sy = new Float32Array(n);
    const ss = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = project(
        (restX[i] ?? 0) + (dx[i] ?? 0),
        (restY[i] ?? 0) + (dy[i] ?? 0),
        dz[i] ?? 0,
        view,
      );
      sx[i] = p.x;
      sy[i] = p.y;
      ss[i] = p.scale;
    }

    // Lines every LINE_EVERY nodes, through the displaced nodes.
    ctx.strokeStyle = palette.dot;
    ctx.lineWidth = 1;
    ctx.globalAlpha = look.lineAlpha;
    ctx.beginPath();
    for (let r = 0; r < rows; r += LINE_EVERY) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c === 0) ctx.moveTo(sx[i] ?? 0, sy[i] ?? 0);
        else ctx.lineTo(sx[i] ?? 0, sy[i] ?? 0);
      }
    }
    for (let c = 0; c < cols; c += LINE_EVERY) {
      for (let r = 0; r < rows; r++) {
        const i = r * cols + c;
        if (r === 0) ctx.moveTo(sx[i] ?? 0, sy[i] ?? 0);
        else ctx.lineTo(sx[i] ?? 0, sy[i] ?? 0);
      }
    }
    ctx.stroke();

    // Dots: brightness from the base mask plus how much they are lifted.
    for (let i = 0; i < n; i++) {
      const x = sx[i] ?? 0;
      const y = sy[i] ?? 0;
      if (x < -8 || y < -8 || x > width + 8 || y > height + 8) continue;
      const lifted = Math.min(1, Math.max(0, (dz[i] ?? 0) / 40));
      const alpha = look.dotAlpha(
        restX[i] ?? 0,
        restY[i] ?? 0,
        width,
        height,
        lifted,
      );
      if (alpha < 0.02) continue;
      const radius = (1 + 1.4 * lifted) * (ss[i] ?? 1);
      if (lifted > 0.04) {
        // Relief: cast shadow to the bottom right, body, highlight top left.
        ctx.globalAlpha = 0.55 * lifted;
        ctx.fillStyle = palette.shadow;
        ctx.beginPath();
        ctx.arc(x + 0.9 * radius, y + 0.9 * radius, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette.dot;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (lifted > 0.04) {
        ctx.globalAlpha = Math.min(1, alpha + 0.25);
        ctx.beginPath();
        ctx.arc(
          x - 0.35 * radius,
          y - 0.35 * radius,
          0.4 * radius,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now: number): void => {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    const targetX = pointer ? (pointer.y / height - 0.5) * MAX_TILT_X : 0;
    const targetY = pointer ? -(pointer.x / width - 0.5) * MAX_TILT_Y : 0;
    tiltX += (targetX - tiltX) * Math.min(1, dt * 4);
    tiltY += (targetY - tiltY) * Math.min(1, dt * 4);
    const energy = stepGrid(grid, pointer, dt, DEFAULT_PARAMS);
    draw();
    const tilting =
      Math.abs(tiltX - targetX) + Math.abs(tiltY - targetY) > 0.0005;
    if (visible && (pointer || energy > 0 || tilting)) {
      requestAnimationFrame(tick);
    } else {
      tiltX = tiltY = 0;
      running = false;
    }
  };

  const start = (): void => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  };

  if (interactive) listen();
  // Marks the frame (a section can then hide a CSS fallback); the canvas is sized
  // when it comes near the screen and emptied when it leaves.
  frame.dataset["dotGrid"] = "";
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) resize();
      else {
        pointer = null;
        release();
      }
    },
    { rootMargin: "200px 0px" },
  ).observe(canvas);

  function listen(): void {
    frame.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      start();
    });
    frame.addEventListener("pointerleave", () => {
      pointer = null;
      start();
    });
  }
}

const enabled = spotlightEnabled({
  prefersReducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  finePointer: matchMedia("(hover: hover) and (pointer: fine)").matches,
});

// Section backgrounds: still on touch screens and with reduced motion.
for (const canvas of document.querySelectorAll<HTMLCanvasElement>(
  "canvas[data-dot-field]",
)) {
  const frame = canvas.parentElement;
  if (frame) initDotGrid(frame, canvas, subtleLook(canvas), enabled);
}
