/**
 * Chapter 5 · "30 años" (src/components/home/scenes/YearsScene.astro).
 *
 * Lays out the cut-out "30" to the stage, finds a point with ink inside the
 * "0" (drawing the same text on a canvas and reading one row of pixels),
 * and zooms the sheet into that point: once the stroke covers the screen
 * only the photo is left. Then the content comes in and the facts count up,
 * all from the progress, so scrolling back plays it in reverse.
 */
import {
  easeInOutCubic,
  easeOutCubic,
  mix,
  segment,
  zoomScale,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

const FIGURE = "30";
const FONT_WEIGHT = 600;
const FONT_FAMILY = '"Space Grotesk"';
const ZOOM_FROM = 0.1;
const ZOOM_TO = 0.6;

export const yearsScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-years-stage]");
  const cut = track.querySelector<HTMLElement>("[data-years-cut]");
  const svg = track.querySelector<SVGSVGElement>("[data-years-svg]");
  const texts = [
    ...track.querySelectorAll<SVGTextElement>("[data-years-text]"),
  ];
  const content = track.querySelector<HTMLElement>("[data-years-content]");
  const counts = [...track.querySelectorAll<HTMLElement>("[data-years-count]")];
  if (!stage || !cut || !svg || texts.length === 0 || !content) return null;

  let maxScale = 60;
  let shownState = "";
  const values = counts.map((el) => Number(el.dataset["yearsCount"]) || 0);
  const shownCounts: string[] = counts.map(() => "");

  const layout = (): void => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width === 0 || height === 0) return;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    for (const rect of svg.querySelectorAll("rect")) {
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", String(height));
    }

    const size = Math.round(Math.min(width * 0.8, height * 0.8));
    const font = `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.font = font;
    const metrics = ctx.measureText(FIGURE);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.7;
    const baseline = Math.round(height / 2 + ascent / 2);

    for (const text of texts) {
      text.setAttribute("x", String(width / 2));
      text.setAttribute("y", String(baseline));
      text.setAttribute("font-size", String(size));
    }

    // Where the "0" sits, and one row of pixels across its middle.
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(FIGURE, width / 2, baseline);
    const zeroLeft = width / 2 - metrics.width / 2 + ctx.measureText("3").width;
    const zeroWidth = ctx.measureText("0").width;
    const row = Math.round(baseline - ascent / 2);
    const x0 = Math.max(0, Math.round(zeroLeft));
    const span = Math.max(1, Math.min(width - x0, Math.round(zeroWidth)));
    const pixels = ctx.getImageData(x0, row, span, 1).data;
    let start = -1;
    let end = -1;
    for (let x = 0; x < span; x++) {
      const ink = (pixels[x * 4 + 3] ?? 0) > 128;
      if (ink && start < 0) start = x;
      if (!ink && start >= 0) {
        end = x;
        break;
      }
    }
    if (start < 0) {
      start = Math.round(span * 0.08);
      end = Math.round(span * 0.2);
    }
    if (end < 0) end = span;
    const originX = x0 + (start + end) / 2;
    const inkWidth = Math.max(4, end - start);
    cut.style.transformOrigin = `${originX}px ${row}px`;
    // Enough that the stroke is wider than the whole screen from its point.
    maxScale = ((2.4 * Math.hypot(width, height)) / inkWidth) * 1.05;
  };

  return {
    measure() {
      layout();
      // The figure is measured with its own font; redo it once loaded.
      void document.fonts
        ?.load(`${FONT_WEIGHT} 100px ${FONT_FAMILY}`, FIGURE)
        .then(layout);
    },

    render(progress) {
      const zoom = easeInOutCubic(segment(progress, ZOOM_FROM, ZOOM_TO));
      cut.style.transform = `scale(${zoomScale(zoom, maxScale)})`;
      const state = zoom >= 1 ? "through" : "sheet";
      if (state !== shownState) {
        shownState = state;
        stage.dataset["state"] = state;
      }
      setVar(stage, "--years-around", 1 - segment(progress, 0.04, 0.16));
      // The outline that draws the figure goes as the dive starts.
      setVar(stage, "--years-outline", 1 - segment(progress, ZOOM_FROM, 0.2));
      setVar(
        stage,
        "--years-photo",
        mix(1.22, 1, easeOutCubic(segment(progress, ZOOM_FROM, 0.75))),
      );
      setVar(stage, "--years-veil", segment(progress, 0.5, 0.72));
      const shown = easeOutCubic(segment(progress, 0.6, 0.8));
      setVar(stage, "--years-content", shown);
      content.inert = shown < 0.5;

      const counted = easeOutCubic(segment(progress, 0.66, 0.9));
      counts.forEach((el, i) => {
        const label = String(Math.round((values[i] ?? 0) * counted));
        if (label !== shownCounts[i]) {
          shownCounts[i] = label;
          el.textContent = label;
        }
      });
    },
  };
};
