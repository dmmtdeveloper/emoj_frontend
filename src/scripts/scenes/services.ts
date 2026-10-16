/**
 * Chapter 2 · Services (src/components/home/scenes/ServicesScene.astro).
 *
 * The pinned progress opens on the chapter title (INTRO), then splits in
 * one stretch per service. In its stretch a sheet draws its sketch
 * (`--svc-draw`), then the photo slides in under it (`--svc-ink`) and
 * holds. Around each boundary the next sheet wipes in over the last one
 * (`--svc-enter`) and the cards cross-fade (`--svc-card`). Only the card on
 * screen is reachable (`inert` on the rest).
 */
import {
  easeInOutCubic,
  easeOutCubic,
  segment,
  sliceOf,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

/** Share of the progress the chapter title holds before the first sheet. */
const INTRO = 0.07;
/** Half the width of the hand-over between two sheets, in progress. */
const HANDOVER = 0.022;

export const servicesScene: SceneFactory = (track, tools) => {
  const stage = track.querySelector<HTMLElement>("[data-svc-stage]");
  const intro = track.querySelector<HTMLElement>("[data-svc-intro]");
  const sheets = [...track.querySelectorAll<HTMLElement>("[data-svc-sheet]")];
  const bars = [...track.querySelectorAll<HTMLElement>("[data-svc-bar]")];
  const jumps = [...track.querySelectorAll<HTMLElement>("[data-svc-jump]")];
  const count = sheets.length;
  if (!stage || count === 0) return null;
  let active = -2;

  /** Progress where sheet `i` starts (the first one right after the title). */
  const startOf = (i: number): number => INTRO + (i / count) * (1 - INTRO);
  /** Raw (linear) hand-over into sheet `i`: 0 before, 1 after. */
  const handover = (i: number, progress: number): number =>
    i === 0
      ? segment(progress, INTRO * 0.78, INTRO)
      : segment(progress, startOf(i) - HANDOVER, startOf(i) + HANDOVER);

  jumps.forEach((button, i) => {
    button.addEventListener("click", () => {
      // Land where the sketch is drawn and the photo is in.
      tools.scrollTo(track, startOf(i) + (0.85 / count) * (1 - INTRO));
    });
  });

  return {
    render(progress) {
      const opening = segment(progress, 0, INTRO);
      if (intro) {
        // The title is gone before the first card arrives.
        setVar(intro, "--svc-intro", 1 - segment(opening, 0.35, 0.86));
        intro.inert = opening >= 0.7;
      }

      sheets.forEach((sheet, i) => {
        const local = segment(progress, startOf(i), startOf(i + 1));
        const enter = easeInOutCubic(handover(i, progress));
        const leave =
          i === count - 1 ? 0 : easeInOutCubic(handover(i + 1, progress));
        setVar(sheet, "--svc-enter", enter);
        // Cards never overlap: the old one leaves in the first half of the
        // hand-over, the new one arrives in the second.
        const arrive = segment(handover(i, progress), 0.5, 1);
        const depart =
          i === count - 1 ? 0 : segment(handover(i + 1, progress), 0, 0.5);
        setVar(sheet, "--svc-card", easeOutCubic(arrive) * (1 - depart));
        setVar(sheet, "--svc-draw", easeOutCubic(segment(local, 0, 0.45)));
        setVar(sheet, "--svc-ink", easeInOutCubic(segment(local, 0.45, 0.75)));
        // The covered sheet drifts back a little under the new one.
        setVar(sheet, "--svc-under", leave);
      });

      const inSheets = segment(progress, INTRO, 1);
      const { index, local } = sliceOf(inSheets, count);
      const current = progress < INTRO ? -1 : index;
      bars.forEach((bar, i) => {
        setVar(bar, "--svc-fill", i < current ? 1 : i === current ? local : 0);
      });
      if (current !== active) {
        active = current;
        stage.dataset["service"] = String(current);
        sheets.forEach((sheet, i) => {
          sheet.inert = i !== current;
          sheet.toggleAttribute("data-active", i === current);
        });
        jumps.forEach((button, i) => {
          if (i === current) button.setAttribute("aria-current", "step");
          else button.removeAttribute("aria-current");
        });
      }
    },
  };
};
