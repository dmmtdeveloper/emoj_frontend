/**
 * Chapter 1 · "El primer trazo" (src/components/home/scenes/HeroScene.astro).
 *
 * On load the pen draws the first part of the isotype stroke (a short,
 * time-based intro). Then the scroll takes over:
 * - 0 → DRAW_TO: the stroke is finished and its end dot pops in.
 * - LENS_FROM → LENS_TO: the end dot opens as a circular lens
 *   (clip-path) onto the photo, until it covers the screen.
 * - From LENS_TO the real copy switches to its cream tone over the photo
 *   (the lens copy, identical, goes away), so its links show their hover.
 */
import {
  easeInOutCubic,
  easeOutCubic,
  heroLens,
  LENS_FROM,
  LENS_TO,
  mix,
  popIn,
  segment,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

const INTRO_MS = 1900;
/** Share of the stroke the load intro draws; the scroll draws the rest. */
const INTRO_SHARE = 0.46;
const DRAW_TO = 0.3;

export const heroScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-hero-stage]");
  const svg = track.querySelector<SVGSVGElement>("[data-hero-stroke]");
  const dot = track.querySelector<SVGCircleElement>("[data-hero-dot]");
  const lens = track.querySelector<HTMLElement>("[data-hero-lens]");
  if (!stage || !svg || !dot || !lens) return null;

  const start = performance.now();
  let lensX = 0;
  let lensY = 0;
  let dotRadius = 8;
  let cover = 2000;
  let tone = "";

  return {
    measure() {
      const box = stage.getBoundingClientRect();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const x = dot.cx.baseVal.value;
      const y = dot.cy.baseVal.value;
      lensX = ctm.a * x + ctm.c * y + ctm.e - box.left;
      lensY = ctm.b * x + ctm.d * y + ctm.f - box.top;
      dotRadius = dot.r.baseVal.value * ctm.a;
      cover = Math.hypot(
        Math.max(lensX, box.width - lensX),
        Math.max(lensY, box.height - lensY),
      );
      setVar(stage, "--lens-x", lensX);
      setVar(stage, "--lens-y", lensY);
    },

    render(progress, now) {
      const intro = easeInOutCubic((now - start) / INTRO_MS);
      const drawn = Math.min(
        1,
        INTRO_SHARE * intro +
          (1 - INTRO_SHARE) * easeInOutCubic(segment(progress, 0, DRAW_TO)),
      );
      setVar(stage, "--hero-draw", drawn);
      setVar(stage, "--hero-dot-a", popIn(segment(intro, 0, 0.22)));
      setVar(stage, "--hero-dot-b", popIn(segment(drawn, 0.965, 1)));

      const radius =
        drawn >= 0.999 ? heroLens(progress, { dot: dotRadius, cover }) : 0;
      // A dot-sized lens hides behind the dot itself; open it from there.
      setVar(stage, "--lens-r", progress > LENS_FROM ? radius : 0);
      const opened = segment(progress, LENS_FROM, 1);
      setVar(stage, "--hero-photo-scale", mix(1.18, 1, easeOutCubic(opened)));
      // The stroke on the sheet steps back as the lens takes the screen.
      setVar(stage, "--hero-sheet-fade", segment(progress, LENS_FROM, LENS_TO));
      setVar(stage, "--hero-cue", 1 - segment(progress, 0, 0.05));
      // After the lens, the copy drifts up a little as the chapter ends.
      setVar(
        stage,
        "--hero-lift",
        easeInOutCubic(segment(progress, LENS_TO, 1)),
      );

      const next = progress >= LENS_TO - 0.005 ? "photo" : "sheet";
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
