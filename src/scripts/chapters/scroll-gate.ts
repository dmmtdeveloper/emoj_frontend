/**
 * Scroll control for the home chapters, so a fast scroll cannot skip them.
 *
 * - Mouse and trackpad (fine pointer): Lenis smooths the wheel, and every
 *   wheel step goes through the chapter gates (src/lib/motion/
 *   scroll-gate.ts): a burst stops at the next chapter's start and holds;
 *   a new burst continues into the chapter. Inside a chapter each step is
 *   slowed and the scroll may only run a short lead ahead of the scene,
 *   so a hard spin plays the animation at a steady pace.
 * - Touch: native scrolling, with CSS scroll-snap stops at each chapter
 *   (chapters.css), which hold a single fling.
 *
 * Keyboard, the scrollbar, anchors and programmatic scrolls are left
 * native. Only with the scenes on (never with reduced motion).
 */
import Lenis from "lenis";
import {
  BURST_GAP,
  chapterPace,
  gateStep,
  INITIAL_GATE,
  type ChapterRange,
  type GateState,
} from "../../lib/motion/scroll-gate";

let started = false;

/**
 * Each chapter's stretch of scroll: from where its stage pins (the track's
 * top minus the sticky top) until the track has scrolled away, so the
 * pace holds through the scene and the hand-over to the next chapter.
 */
function chapterRanges(): ChapterRange[] {
  return [...document.querySelectorAll<HTMLElement>("[data-track]")].map(
    (track) => {
      const stage = track.querySelector<HTMLElement>("[data-stage]");
      const sticky = stage ? parseFloat(getComputedStyle(stage).top) || 0 : 0;
      const start = Math.round(
        track.getBoundingClientRect().top + window.scrollY - sticky,
      );
      return { start, end: start + track.offsetHeight };
    },
  );
}

export function initScrollGate(): void {
  if (started) return;
  started = true;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let ranges: ChapterRange[] = [];
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
      if (now - state.last > BURST_GAP) {
        ranges = chapterRanges();
        gates = ranges.map(({ start }) => start);
      }
      const from = lenis.targetScroll;
      // Inside a chapter the step is slowed and capped to a lead over the
      // scroll, so the scene plays at a steady pace; then the gates.
      const paced = chapterPace(ranges, {
        from,
        delta: deltaY,
        current: lenis.animatedScroll,
        viewport: window.innerHeight,
      });
      const to = Math.min(lenis.limit, Math.max(0, paced));
      const step = gateStep(gates, state, { from, to, now });
      state = step.state;
      if (event.cancelable) event.preventDefault();
      if (Math.abs(step.target - from) >= 0.5) {
        lenis.scrollTo(step.target, { programmatic: false, lerp: 0.1 });
      }
      return false;
    },
  });
}
