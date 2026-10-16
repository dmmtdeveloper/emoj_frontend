/**
 * Chapter 5 · Projects reel (src/components/home/scenes/ReelScene.astro).
 *
 * The track is as tall as the reel is wider than the screen (plus a short
 * pause at each end), so one pixel of scroll moves the reel one pixel.
 * Cards rise in as they come in from the right (`--reel-e`) and their
 * photos drift with their position on screen (`--reel-px`).
 */
import {
  clamp01,
  enterShare,
  reelShift,
  segment,
} from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

/** Pauses at the start and end of the pin, as shares of the progress. */
const LEAD_IN = 0.06;
const LEAD_OUT = 0.94;

export const reelScene: SceneFactory = (track, tools) => {
  const list = track.querySelector<HTMLElement>("[data-reel-list]");
  const ghost = track.querySelector<HTMLElement>("[data-reel-ghost]");
  const count = track.querySelector<HTMLElement>("[data-reel-count]");
  const bar = track.querySelector<HTMLElement>("[data-reel-progress]");
  const cards = [...track.querySelectorAll<HTMLElement>("[data-reel-card]")];
  if (!list || cards.length === 0) return null;

  let overflow = 0;
  let viewport = 1;
  let lefts: number[] = [];
  let widths: number[] = [];
  let shown = "";

  const travel = (progress: number) => segment(progress, LEAD_IN, LEAD_OUT);

  // A card reached with the keyboard while off screen: bring it in.
  list.addEventListener("focusin", (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-reel-card]",
    );
    const i = card ? cards.indexOf(card) : -1;
    if (i < 0 || overflow <= 0) return;
    const share = clamp01(((lefts[i] ?? 0) - (lefts[0] ?? 0)) / overflow);
    tools.scrollTo(track, LEAD_IN + share * (LEAD_OUT - LEAD_IN));
  });

  return {
    measure() {
      list.style.transform = "";
      viewport = window.innerWidth;
      lefts = cards.map((card) => card.offsetLeft);
      widths = cards.map((card) => card.offsetWidth);
      // The end of the last card plus the container's right gutter (the
      // list's scrollWidth leaves that padding out).
      const gutter = parseFloat(getComputedStyle(list).paddingRight) || 0;
      const end = (lefts.at(-1) ?? 0) + (widths.at(-1) ?? 0) + gutter;
      overflow = Math.max(0, end - list.clientWidth);
      const pause = window.innerHeight * 0.35;
      track.style.height = `${window.innerHeight + overflow + pause}px`;
    },

    render(progress) {
      const t = travel(progress);
      const shift = reelShift(t, overflow);
      list.style.transform = `translate3d(${shift}px, 0, 0)`;
      if (ghost) ghost.style.transform = `translate3d(${shift * 0.35}px, 0, 0)`;
      if (bar) setVar(bar, "--reel-fill", t);

      let current = 0;
      cards.forEach((card, i) => {
        const left = (lefts[i] ?? 0) + shift;
        const width = widths[i] ?? 0;
        setVar(card, "--reel-e", enterShare({ left, width, viewport }));
        setVar(card, "--reel-px", (left + width / 2 - viewport / 2) / viewport);
        if (left < viewport * 0.3) current = i;
      });
      const label = String(Math.min(current + 1, cards.length - 1)).padStart(
        2,
        "0",
      );
      if (count && label !== shown) {
        shown = label;
        count.textContent = label;
      }
    },
  };
};
