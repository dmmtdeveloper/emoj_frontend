/**
 * Chapter 3 · "La lámina se completa"
 * (src/components/home/scenes/ObraScene.astro).
 *
 * At rest the sheet sits beside the text with the stages blank. Scrolling
 * on, it grows to the centre (`--focus`, focusCurve()) and the stages fill
 * in one by one (`--row` on each row, itemShare()): the text is written
 * across and the box is ticked. Then the APROBADO stamp lands (`--stamp`),
 * the photo of the built work comes out of the sheet (`--built`), and the
 * sheet goes back beside the text, complete.
 */
import {
  easeOutCubic,
  focusCurve,
  itemShare,
  segment,
} from "../../lib/motion/scenes";
import { measureFocus } from "./focus";
import { setVar, type SceneFactory } from "./types";

const FOCUS = [0.05, 0.16, 0.86, 0.96] as const;
const ROWS_FROM = 0.18;
const ROWS_TO = 0.68;

export const obraScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-obra-stage]");
  const sheet = track.querySelector<HTMLElement>("[data-obra-sheet]");
  const slot = track.querySelector<HTMLElement>("[data-obra-slot]");
  const done = track.querySelector<HTMLElement>("[data-obra-done]");
  const rows = [...track.querySelectorAll<HTMLElement>("[data-obra-row]")];
  if (!stage || !sheet || !slot || rows.length === 0) return null;
  let shownDone = "";

  return {
    measure() {
      // The sheet keeps its layout and is scaled to fit the screen.
      const area = sheet.parentElement ?? sheet;
      setVar(stage, "--fit", 1);
      setVar(stage, "--focus", 1);
      const header =
        document.querySelector<HTMLElement>("[data-site-header]")
          ?.offsetHeight ?? 72;
      const room = window.innerHeight - header - window.innerHeight * 0.16;
      setVar(stage, "--fit", Math.min(1, room / area.offsetHeight));
      measureFocus(stage, area, slot);
    },

    render(progress) {
      setVar(stage, "--focus", focusCurve(progress, FOCUS));
      let complete = 0;
      rows.forEach((row, i) => {
        const share = itemShare(progress, i, rows.length, ROWS_FROM, ROWS_TO);
        setVar(row, "--row", share);
        if (share >= 1) complete += 1;
      });
      setVar(stage, "--stamp", easeOutCubic(segment(progress, 0.7, 0.75)));
      setVar(stage, "--built", easeOutCubic(segment(progress, 0.74, 0.84)));
      const label = String(complete).padStart(2, "0");
      if (done && label !== shownDone) {
        shownDone = label;
        done.textContent = label;
      }
    },
  };
};
