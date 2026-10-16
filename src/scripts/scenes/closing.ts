/**
 * Chapter 7 · "El último trazo" (src/components/home/scenes/ClosingScene.astro).
 *
 * The scroll draws the isotype stroke from the left dot; at its end the
 * right dot swells (`--close-dot`) and opens leftwards into the quote
 * button (`--close-open`). The tagline settles in last.
 */
import {
  easeInOutCubic,
  easeOutCubic,
  popIn,
  segment,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

export const closingScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-close-stage]");
  if (!stage) return null;

  return {
    render(progress) {
      const drawn = easeInOutCubic(segment(progress, 0, 0.55));
      setVar(stage, "--close-draw", drawn);
      setVar(stage, "--close-start", popIn(segment(progress, 0, 0.06)));
      setVar(stage, "--close-dot", popIn(segment(progress, 0.52, 0.64)));
      setVar(
        stage,
        "--close-open",
        easeInOutCubic(segment(progress, 0.64, 0.86)),
      );
      setVar(stage, "--close-tag", easeOutCubic(segment(progress, 0.8, 1)));
    },
  };
};
