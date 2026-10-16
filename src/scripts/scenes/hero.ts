/**
 * Chapter 1 · "El plano" (src/components/home/scenes/HeroScene.astro).
 *
 * The plan is drawn step by step (a layer each, `[data-cad-step]`): the
 * step's command is typed on the command line, then the crosshair draws its
 * lines one after another (`--s` on the step; each line has its place `--k`
 * of `--n`). On load the first two layers are drawn (a short, time-based
 * intro); then the scroll takes over:
 * - 0 → DRAW_TO: the remaining layers.
 * - WINDOW_FROM → WINDOW_TO: "ZOOM Ventana" is typed and the window is
 *   dragged over the pump station; the photo appears inside it.
 * - ZOOM_FROM → ZOOM_TO: the zoom takes the window to the full screen
 *   (zoomWindow()); the CAD chrome and then the plan go away.
 * - Then the other photos wipe in one by one (`--slide-in`), with the
 *   counter following. The progress is split by heroPhases().
 */
import {
  cadReadout,
  cadStepPhases,
  easeInOutCubic,
  heroPhases,
  mix,
  segment,
  typedText,
  weightedSlice,
  zoomWindow,
  type Box,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

const INTRO_MS = 3400;
/** Layers the load intro draws; the scroll draws the rest. */
const INTRO_STEPS = 2;
const DRAW_TO = 0.4;
const WINDOW_FROM = 0.42;
const WINDOW_TO = 0.54;
const ZOOM_FROM = 0.58;
const ZOOM_TO = 0.93;
const WINDOW_COMMAND = "ZOOM  Ventana";

interface Point {
  x: number;
  y: number;
}

interface Step {
  el: SVGGElement;
  lines: SVGGeometryElement[];
  lengths: number[];
  layer: string;
  command: string;
}

export const heroScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-hero-stage]");
  const world = track.querySelector<HTMLElement>("[data-hero-world]");
  const plan = track.querySelector<SVGSVGElement>("[data-hero-plan]");
  const windowRect = track.querySelector<SVGRectElement>("[data-hero-window]");
  const photo = track.querySelector<HTMLElement>("[data-hero-photo]");
  const cursor = track.querySelector<HTMLElement>("[data-hero-cursor]");
  const typed = track.querySelector<HTMLElement>("[data-hero-typed]");
  const history = track.querySelector<HTMLElement>("[data-hero-history]");
  const hint = track.querySelector<HTMLElement>("[data-hero-hint]");
  const xy = track.querySelector<HTMLElement>("[data-hero-xy]");
  const layer = track.querySelector<HTMLElement>("[data-hero-layer]");
  const swatch = track.querySelector<HTMLElement>("[data-hero-swatch]");
  const slides = [...track.querySelectorAll<HTMLElement>("[data-hero-slide]")];
  const count = track.querySelector<HTMLElement>("[data-hero-count]");
  const countBar = track.querySelector<HTMLElement>("[data-hero-count-bar]");
  if (!stage || !world || !plan || !windowRect || !photo || !cursor) {
    return null;
  }

  // Each step's lines get their place in the step; each label shows once
  // the line before it is mostly drawn.
  const steps: Step[] = [
    ...track.querySelectorAll<SVGGElement>("[data-cad-step]"),
  ].map((el) => {
    const lines = [...el.querySelectorAll<SVGGeometryElement>(".cad-line")];
    let place = -1;
    for (const item of el.querySelectorAll<SVGElement>(
      ".cad-line, .cad-label",
    )) {
      if (item.classList.contains("cad-line")) place += 1;
      setVar(item, "--k", Math.max(0, place));
    }
    setVar(el, "--n", lines.length);
    return {
      el,
      lines,
      lengths: lines.map((line) => line.getTotalLength()),
      layer: el.dataset["layer"] ?? "",
      command: el.dataset["command"] ?? "",
    };
  });
  const firstStep = steps[0];
  const lastStep = steps.at(-1);
  if (!firstStep || !lastStep) return null;
  const weights = steps.map((step) => Number(step.el.dataset["weight"] ?? 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const introShare =
    weights.slice(0, INTRO_STEPS).reduce((sum, w) => sum + w, 0) / total;

  const start = performance.now();
  let stageBox = { left: 0, top: 0, width: 0, height: 0 };
  let win: Box = { left: 0, top: 0, width: 0, height: 0 };
  let shown = { typed: "", history: "", layer: "", xy: "", count: "" };
  let tone = "";
  let hintOn: boolean | null = null;

  /** Where a point of an element of the plan is on the stage. */
  const onStage = (el: SVGGraphicsElement, point: DOMPoint): Point => {
    const matrix = el.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const screen = point.matrixTransform(matrix);
    return { x: screen.x - stageBox.left, y: screen.y - stageBox.top };
  };

  /** The pen: the point `share` along the step's lines. */
  const penOf = (step: Step, share: number): Point => {
    const n = step.lines.length;
    const index = Math.min(n - 1, Math.floor(share * n));
    const line = step.lines[index];
    if (!line) return { x: 0, y: 0 };
    const local = Math.min(1, share * n - index);
    return onStage(
      line,
      line.getPointAtLength(local * (step.lengths[index] ?? 0)),
    );
  };

  /** The model coordinates under a point of the stage (status bar). */
  const modelOf = (point: Point): Point => {
    const matrix = plan.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const inner = new DOMPoint(
      point.x + stageBox.left,
      point.y + stageBox.top,
    ).matrixTransform(matrix.inverse());
    return { x: 4200 + inner.x * 0.5, y: 6500 - inner.y * 0.5 };
  };

  const write = (
    key: keyof typeof shown,
    el: HTMLElement | null,
    text: string,
  ) => {
    if (!el || shown[key] === text) return;
    shown = { ...shown, [key]: text };
    el.textContent = text;
  };

  return {
    measure() {
      // Read the window as dragged, without the zoom.
      setVar(stage, "--zs", 1);
      setVar(stage, "--zx", 0);
      setVar(stage, "--zy", 0);
      setVar(stage, "--drag", 1);
      const box = stage.getBoundingClientRect();
      stageBox = {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
      const rect = windowRect.getBoundingClientRect();
      win = {
        left: rect.left - box.left,
        top: rect.top - box.top,
        width: rect.width,
        height: rect.height,
      };
      setVar(stage, "--zox", win.left + win.width / 2);
      setVar(stage, "--zoy", win.top + win.height / 2);
    },

    render(trackProgress, now) {
      const box = stage.getBoundingClientRect();
      stageBox = { ...stageBox, left: box.left, top: box.top };
      const phase = heroPhases(trackProgress, slides.length);
      const progress = phase.plan;
      const intro = easeInOutCubic((now - start) / INTRO_MS);
      const drawn = Math.min(
        1,
        introShare * intro + (1 - introShare) * segment(progress, 0, DRAW_TO),
      );

      // The layers.
      const at = weightedSlice(drawn, weights);
      const inStep = cadStepPhases(at.local);
      steps.forEach((step, i) => {
        const share = i < at.index ? 1 : i > at.index ? 0 : inStep.drawn;
        setVar(step.el, "--s", share);
      });
      const current = steps[at.index] ?? firstStep;
      const previous = steps[at.index - 1];

      // The zoom window: typed, then dragged.
      const windowShare = segment(progress, WINDOW_FROM, WINDOW_TO);
      const inWindow = cadStepPhases(windowShare);
      const drag = easeInOutCubic(inWindow.drawn);
      setVar(stage, "--drag", drag);
      setVar(stage, "--window", windowShare > 0 ? 1 : 0);

      // The cursor: travels while a command is typed, then draws.
      let pen: Point;
      const corner = { x: win.left, y: win.top };
      const farCorner = { x: win.left + win.width, y: win.top + win.height };
      if (windowShare > 0) {
        const lastPen = penOf(lastStep, 1);
        pen =
          inWindow.drawn > 0
            ? {
                x: mix(corner.x, farCorner.x, drag),
                y: mix(corner.y, farCorner.y, drag),
              }
            : {
                x: mix(lastPen.x, corner.x, easeInOutCubic(inWindow.typed)),
                y: mix(lastPen.y, corner.y, easeInOutCubic(inWindow.typed)),
              };
      } else if (inStep.drawn > 0 || drawn >= 1) {
        pen = penOf(current, drawn >= 1 ? 1 : inStep.drawn);
      } else {
        const from = previous
          ? penOf(previous, 1)
          : { x: stageBox.width * 0.62, y: stageBox.height * 0.5 };
        const to = penOf(current, 0);
        const t = easeInOutCubic(inStep.typed);
        pen = { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t) };
      }
      setVar(stage, "--cur-x", pen.x);
      setVar(stage, "--cur-y", pen.y);
      write("xy", xy, cadReadout(modelOf(pen)));

      // The command line.
      const done = steps
        .slice(0, windowShare > 0 ? steps.length : at.index)
        .map((step) => step.command);
      let line: string;
      if (windowShare > 0) {
        line = typedText(WINDOW_COMMAND, inWindow.typed);
      } else if (drawn >= 1) {
        line = "";
      } else {
        line = typedText(current.command, inStep.typed);
      }
      write("typed", typed, line);
      write("history", history, done.slice(-2).join("\n"));
      const layerName = windowShare > 0 ? "0" : current.layer;
      write("layer", layer, layerName);
      if (swatch) {
        swatch.dataset["step"] = windowShare > 0 ? "" : String(at.index);
      }
      // The hint shows while the screen waits for the scroll.
      const waiting = line === "" && intro >= 1 && windowShare === 0;
      if (hint && waiting !== hintOn) {
        hintOn = waiting;
        hint.hidden = !waiting;
      }

      // The photo inside the window, then the zoom to the full screen.
      setVar(stage, "--photo-in", segment(progress, WINDOW_TO, ZOOM_FROM));
      const zoom = easeInOutCubic(segment(progress, ZOOM_FROM, ZOOM_TO));
      const z = zoomWindow(win, stageBox, zoom);
      setVar(stage, "--zs", z.scale);
      setVar(stage, "--zx", z.x);
      setVar(stage, "--zy", z.y);
      setVar(stage, "--clip-t", windowShare > 0 ? z.clip.top : 0);
      setVar(stage, "--clip-r", windowShare > 0 ? z.clip.right : 0);
      setVar(stage, "--clip-b", windowShare > 0 ? z.clip.bottom : 0);
      setVar(stage, "--clip-l", windowShare > 0 ? z.clip.left : 0);
      setVar(stage, "--chrome", 1 - segment(progress, ZOOM_FROM + 0.02, 0.72));
      setVar(stage, "--plan-out", segment(progress, 0.76, ZOOM_TO));
      setVar(
        stage,
        "--hero-lift",
        easeInOutCubic(segment(trackProgress, 0.96, 1)),
      );

      // The other photos: the next one wipes in over the last, from the
      // left, and settles from a slight zoom.
      slides.forEach((slide, i) => {
        if (i === 0) return;
        const share =
          i - 1 < phase.photo ? 1 : i - 1 === phase.photo ? phase.slide : 0;
        setVar(slide, "--slide-in", easeInOutCubic(share));
      });
      if (slides.length > 1) {
        const settled = phase.plan < 1 ? 0 : phase.photo + phase.slide;
        const number = Math.min(slides.length, 1 + Math.floor(settled + 0.5));
        write("count", count, String(number).padStart(2, "0"));
        if (countBar) {
          setVar(countBar, "--hero-count-fill", settled / (slides.length - 1));
        }
      }

      const next = progress >= ZOOM_TO - 0.005 ? "photo" : "plan";
      if (next !== tone) {
        tone = next;
        stage.dataset["tone"] = next;
      }
    },

    busy(now) {
      return now - start < INTRO_MS;
    },
  };
};
