/**
 * Chapter 3 · "Del primer trazo a la obra"
 * (src/components/home/scenes/ObraScene.astro).
 *
 * One stretch of the pinned progress per stage, in three beats
 * (phaseBeats()), the same rhythm as deivid.space:
 * - at rest: the stage's card beside the drawing, whose layer for this
 *   stage draws as it arrives (`--obra-draw` on that layer);
 * - a closer look: the drawing grows to the centre (`--obra-focus` 1), the
 *   card and the chapter title step back, a small label names the stage;
 * - back at rest before the next stage swaps the card.
 * The last stage's layer is the photo of the built work sliding in under
 * the pen (`--obra-ink`). Only the card on screen is reachable.
 *
 * The growth is one transform from the drawing's resting box (the slot) to
 * its large box, measured on resize (`--obra-dx`, `--obra-dy`, `--obra-s`).
 */
import { easeOutCubic, phaseBeats } from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

export const obraScene: SceneFactory = (track, tools) => {
  const stage = track.querySelector<HTMLElement>("[data-obra-stage]");
  const ink = track.querySelector<HTMLElement>("[data-obra-ink]");
  const slot = track.querySelector<HTMLElement>("[data-obra-slot]");
  const head = track.querySelector<HTMLElement>("[data-obra-head]");
  const cards = [...track.querySelectorAll<HTMLElement>("[data-obra-card]")];
  const captions = [
    ...track.querySelectorAll<HTMLElement>("[data-obra-caption]"),
  ];
  const bars = [...track.querySelectorAll<HTMLElement>("[data-obra-bar]")];
  const jumps = [...track.querySelectorAll<HTMLElement>("[data-obra-jump]")];
  // Both copies of the drawing (on the paper and over the photo).
  const drawings = [...track.querySelectorAll<SVGSVGElement>(".obra")];
  const layersOf = drawings.map((svg) => [
    ...svg.querySelectorAll<SVGGElement>("[data-obra-layer]"),
  ]);
  const count = cards.length;
  if (!stage || !ink || !slot || count === 0 || drawings.length === 0) {
    return null;
  }
  let active = -1;

  jumps.forEach((button, i) => {
    // Land on the stage at rest, its layer drawn.
    button.addEventListener("click", () =>
      tools.scrollTo(track, (i + 0.15) / count),
    );
  });

  return {
    measure() {
      const drawing = drawings[0];
      if (!drawing) return;
      // Measure the drawing at full screen (focus 1: no transform).
      setVar(stage, "--obra-focus", 1);
      const origin = stage.getBoundingClientRect();
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - origin.left,
          y: r.top - origin.top,
          w: r.width,
          h: r.height,
        };
      };
      const full = rect(drawing);
      const box = rect(slot);
      if (full.w === 0 || full.h === 0 || box.w === 0) return;
      // The drawing keeps its proportions (viewBox 960×600, centred).
      const content = (w: number, h: number) => Math.min(w / 960, h / 600);
      const scale = content(box.w, box.h) / content(full.w, full.h);
      setVar(stage, "--obra-s", scale);
      setVar(stage, "--obra-dx", box.x + box.w / 2 - (full.x + full.w / 2));
      setVar(stage, "--obra-dy", box.y + box.h / 2 - (full.y + full.h / 2));
    },

    render(progress) {
      const beat = phaseBeats(progress, count);
      // Earlier stages' layers stay drawn; later ones are blank.
      for (const layers of layersOf) {
        layers.forEach((layer, i) => {
          const drawn = i < beat.phase ? 1 : i === beat.phase ? beat.draw : 0;
          setVar(layer, "--obra-draw", easeOutCubic(drawn));
        });
      }
      const built = beat.phase === count - 1 ? easeOutCubic(beat.draw) : 0;
      setVar(ink, "--obra-ink", built);
      stage.toggleAttribute("data-built", built > 0.35);

      setVar(stage, "--obra-focus", beat.focus);
      if (head) setVar(head, "--obra-head", 1 - beat.focus);
      captions.forEach((caption, i) => {
        setVar(caption, "--obra-caption", i === beat.phase ? beat.focus : 0);
      });
      cards.forEach((card, i) => {
        setVar(
          card,
          "--obra-card",
          i === beat.phase ? easeOutCubic(beat.card) : 0,
        );
      });

      bars.forEach((bar, i) => {
        const fill =
          i < beat.phase ? 1 : i === beat.phase ? progress * count - i : 0;
        setVar(bar, "--obra-fill", Math.min(1, Math.max(0, fill)));
      });
      const shown = beat.card > 0.5 ? beat.phase : -1;
      if (shown !== active) {
        active = shown;
        cards.forEach((card, i) => {
          card.inert = i !== shown;
        });
      }
      jumps.forEach((button, i) => {
        if (i === beat.phase) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    },
  };
};
