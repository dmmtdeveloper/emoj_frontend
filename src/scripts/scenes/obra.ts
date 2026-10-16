/**
 * Chapter 3 · "La obra se arma" (src/components/home/scenes/ObraScene.astro).
 *
 * One stretch of the pinned progress per stage. The drawing's layers build
 * up in order (`--obra-draw` on each layer, layerDraw()); the last stage
 * slides the photo of the built work in under the pen (`--obra-ink`). The
 * cards cross-fade at each boundary (`--obra-card`), and only the one on
 * screen is reachable (`inert` on the rest).
 */
import {
  easeInOutCubic,
  easeOutCubic,
  layerDraw,
  segment,
  sliceOf,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

/** Half the width of the cross-fade between two cards, in progress. */
const HANDOVER = 0.03;

export const obraScene: SceneFactory = (track, tools) => {
  const stage = track.querySelector<HTMLElement>("[data-obra-stage]");
  const ink = track.querySelector<HTMLElement>("[data-obra-ink]");
  const cards = [...track.querySelectorAll<HTMLElement>("[data-obra-card]")];
  const bars = [...track.querySelectorAll<HTMLElement>("[data-obra-bar]")];
  const jumps = [...track.querySelectorAll<HTMLElement>("[data-obra-jump]")];
  // Both copies of the drawing (on the paper and over the photo).
  const drawings = [...track.querySelectorAll<SVGSVGElement>(".obra")];
  const layersOf = drawings.map((svg) => [
    ...svg.querySelectorAll<SVGGElement>("[data-obra-layer]"),
  ]);
  const count = cards.length;
  if (!stage || !ink || count === 0) return null;
  let active = -1;

  /** Handover into card `i`: 0 before, 1 after. */
  const handover = (i: number, progress: number): number =>
    i === 0 ? 1 : segment(progress, i / count - HANDOVER, i / count + HANDOVER);

  jumps.forEach((button, i) => {
    button.addEventListener("click", () => {
      tools.scrollTo(track, (i + 0.75) / count);
    });
  });

  return {
    render(progress) {
      // The drawn layers are the first stages; the last one is the photo.
      for (const layers of layersOf) {
        layers.forEach((layer, i) => {
          setVar(
            layer,
            "--obra-draw",
            easeOutCubic(layerDraw(progress, i, count)),
          );
        });
      }
      const built = easeInOutCubic(layerDraw(progress, count - 1, count));
      setVar(ink, "--obra-ink", built);
      stage.toggleAttribute("data-built", built > 0.35);

      cards.forEach((card, i) => {
        const arrive = segment(handover(i, progress), 0.5, 1);
        const depart =
          i === count - 1 ? 0 : segment(handover(i + 1, progress), 0, 0.5);
        setVar(card, "--obra-card", easeOutCubic(arrive) * (1 - depart));
      });

      const { index, local } = sliceOf(progress, count);
      bars.forEach((bar, i) => {
        setVar(bar, "--obra-fill", i < index ? 1 : i === index ? local : 0);
      });
      if (index !== active) {
        active = index;
        cards.forEach((card, i) => {
          card.inert = i !== index;
        });
        jumps.forEach((button, i) => {
          if (i === index) button.setAttribute("aria-current", "step");
          else button.removeAttribute("aria-current");
        });
      }
    },
  };
};
