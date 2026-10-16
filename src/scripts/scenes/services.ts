/**
 * Chapter 2 · Services (src/components/home/scenes/ServicesScene.astro).
 *
 * The pinned progress is split in one stretch per service. In its stretch a
 * sheet draws its sketch (`--svc-draw`), then the photo slides in under it
 * (`--svc-ink`). Around each boundary the next sheet enters over the last
 * one (`--svc-enter`) and the captions cross-fade (`--svc-caption`). Only
 * the sheet on screen is reachable (`inert` on the rest).
 */
import {
  easeInOutCubic,
  easeOutCubic,
  segment,
  sliceOf,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

/** Half the width of the hand-over between two sheets, in progress. */
const HANDOVER = 0.03;

export const servicesScene: SceneFactory = (track, tools) => {
  const sheets = [...track.querySelectorAll<HTMLElement>("[data-svc-sheet]")];
  const bars = [...track.querySelectorAll<HTMLElement>("[data-svc-bar]")];
  const jumps = [...track.querySelectorAll<HTMLElement>("[data-svc-jump]")];
  const count = sheets.length;
  if (count === 0) return null;
  let active = -1;

  /** Raw (linear) hand-over into sheet `i`: 0 before, 1 after. */
  const handover = (i: number, progress: number): number =>
    i === 0 ? 1 : segment(progress, i / count - HANDOVER, i / count + HANDOVER);
  const enterOf = (i: number, progress: number): number =>
    easeInOutCubic(handover(i, progress));

  jumps.forEach((button, i) => {
    button.addEventListener("click", () => {
      // Land where the sketch is drawn and the photo is in.
      tools.scrollTo(track, (i + 0.8) / count);
    });
  });

  return {
    render(progress) {
      sheets.forEach((sheet, i) => {
        const local = segment(progress, i / count, (i + 1) / count);
        const enter = enterOf(i, progress);
        const leave = i === count - 1 ? 0 : enterOf(i + 1, progress);
        setVar(sheet, "--svc-enter", enter);
        // Captions never overlap: the old one leaves in the first half of
        // the hand-over, the new one arrives in the second.
        const arrive = segment(handover(i, progress), 0.5, 1);
        const depart =
          i === count - 1 ? 0 : segment(handover(i + 1, progress), 0, 0.5);
        setVar(sheet, "--svc-caption", arrive * (1 - depart));
        // The first sheet starts drawing as the stage pins.
        setVar(sheet, "--svc-draw", easeOutCubic(segment(local, 0, 0.5)));
        setVar(sheet, "--svc-ink", easeInOutCubic(segment(local, 0.5, 0.82)));
        // The covered sheet steps back a little under the new one.
        setVar(sheet, "--svc-under", leave);
      });

      const { index, local } = sliceOf(progress, count);
      bars.forEach((bar, i) => {
        setVar(bar, "--svc-fill", i < index ? 1 : i === index ? local : 0);
      });
      if (index !== active) {
        active = index;
        sheets.forEach((sheet, i) => {
          sheet.inert = i !== index;
          sheet.toggleAttribute("data-active", i === index);
        });
        jumps.forEach((button, i) => {
          if (i === index) button.setAttribute("aria-current", "step");
          else button.removeAttribute("aria-current");
        });
      }
    },
  };
};
