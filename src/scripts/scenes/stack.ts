/**
 * Chapter 6 · Why EMOJ (src/components/home/scenes/StackScene.astro).
 *
 * The cards are sticky (armed CSS); each frame reads how close the next
 * card is to its pinned place and presses the card under it back by that
 * much. The chapter progress is not needed: positions are the clock here.
 */
import { stackPress } from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

export const stackScene: SceneFactory = (track) => {
  const cards = [...track.querySelectorAll<HTMLElement>("[data-stack-card]")];
  if (cards.length < 2) return null;
  let pinTops: number[] = [];

  return {
    measure() {
      pinTops = cards.map(
        (card) => parseFloat(getComputedStyle(card).top) || 0,
      );
    },

    render() {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) {
          setVar(card, "--stack-press", 0);
          return;
        }
        // Pressed by the next card as it travels its last card height.
        const press = stackPress({
          nextTop: next.getBoundingClientRect().top,
          pinTop: pinTops[i + 1] ?? 0,
          span: card.offsetHeight,
        });
        setVar(card, "--stack-press", press);
      });
    },
  };
};
