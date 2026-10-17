/**
 * Scroll control for the home chapters, so a fast scroll cannot skip them.
 *
 * - Mouse and trackpad (fine pointer): Lenis smooths the wheel, and every
 *   wheel step goes through the chapter gates (src/lib/motion/
 *   scroll-gate.ts): a burst stops at the next chapter's start and holds;
 *   a new burst continues into the chapter.
 * - Touch: native scrolling, with CSS scroll-snap stops at each chapter
 *   (chapters.css), which hold a single fling.
 *
 * Keyboard, the scrollbar, anchors and programmatic scrolls are left
 * native. Only with the scenes on (never with reduced motion).
 */
import Lenis from "lenis";
import {
  BURST_GAP,
  gateStep,
  INITIAL_GATE,
  type GateState,
} from "../../lib/motion/scroll-gate";

let started = false;

/** Where each chapter's stage pins: the track's top minus the sticky top. */
function chapterStarts(): number[] {
  return [...document.querySelectorAll<HTMLElement>("[data-track]")].map(
    (track) => {
      const stage = track.querySelector<HTMLElement>("[data-stage]");
      const sticky = stage ? parseFloat(getComputedStyle(stage).top) || 0 : 0;
      return Math.round(
        track.getBoundingClientRect().top + window.scrollY - sticky,
      );
    },
  );
}

export function initScrollGate(): void {
  if (started) return;
  started = true;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let gates: number[] = [];
  let state: GateState = INITIAL_GATE;

  const lenis: Lenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    allowNestedScroll: true,
    virtualScroll: ({ deltaY, event }) => {
      if (!event.type.includes("wheel") || event.ctrlKey) return true;
      // The event's own time: under a busy main thread events are handled
      // late, which would read as pauses and end the burst too soon.
      const now = event.timeStamp;
      // A new burst: re-measure, the layout may have changed since.
      if (now - state.last > BURST_GAP) gates = chapterStarts();
      const from = lenis.targetScroll;
      const to = Math.min(lenis.limit, Math.max(0, from + deltaY));
      const step = gateStep(gates, state, { from, to, now });
      state = step.state;
      if (Math.abs(step.target - to) < 0.5) return true;
      if (event.cancelable) event.preventDefault();
      if (Math.abs(step.target - from) >= 0.5) {
        lenis.scrollTo(step.target, { programmatic: false, lerp: 0.1 });
      }
      return false;
    },
  });
}
