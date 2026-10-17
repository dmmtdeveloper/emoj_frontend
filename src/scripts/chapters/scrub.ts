/**
 * Scroll-scrubbed chapters for the home (the same pattern as the
 * deividportfolio site, with EMOJ's chapters).
 *
 * A chapter is a track ([data-track]) holding a sticky stage ([data-stage])
 * with the head / scene / body grid (src/components/home/chapters/
 * Chapter.astro). Each scene builds one anime.js timeline authored against
 * SCENE_LENGTH whose progress follows the scroll: scrolling down plays it,
 * scrolling up rewinds it. Progress 0 → 1 spans exactly the pinned interval
 * (the track's extra tail, `--ch-pin`).
 *
 * Around the scene's own timeline every chapter gets:
 * - the copy reveal: label, title and body settle while the track scrolls
 *   into place, so they are readable when the stage pins;
 * - the desktop focus: while pinned, the scene moves to the centre of the
 *   stage and grows, the label rises to the top and the rest of the copy
 *   steps back; near the end everything returns (`--stage-focus` 0 → 1 → 0,
 *   turned into motion by chapters.css).
 *
 * While the scenes play, a fast scroll cannot skip the chapters: it stops at
 * each one (./scroll-gate.ts).
 *
 * Without the scenes mark (public/theme.js: no IntersectionObserver or
 * reduced motion) the timeline jumps to its end, so every scene reads at
 * rest, and nothing pins.
 */
import { createTimeline, onScroll, stagger, utils } from "animejs";
import { focusFit, SCENE_LENGTH } from "../../lib/motion/chapters";
import { initScrollGate } from "./scroll-gate";

export { SCENE_LENGTH };

export type SceneTimeline = ReturnType<typeof createTimeline>;

/** True when the chapters play with the scroll (set before paint). */
export const scenesOn = (): boolean =>
  document.documentElement.dataset["scenes"] !== undefined;

/** The pinned interval of a chapter track, as onScroll thresholds. */
function pinnedBounds(stage: HTMLElement) {
  // The stage sticks at its own `top` (the header height), read live so a
  // resize re-aims the thresholds.
  const offset = () => parseFloat(getComputedStyle(stage).top) || 0;
  return {
    offset,
    enter: () => `top+=${offset()} top`,
    leave: () => `top+=${offset() + stage.offsetHeight} bottom`,
  };
}

/** Label, title and body settle while the track scrolls into place. */
function revealCopy(
  track: HTMLElement,
  stage: HTMLElement,
  offset: () => number,
) {
  const copy = stage.querySelectorAll<HTMLElement>(
    ":scope > .ch-head > *, :scope > .ch-body > *",
  );
  if (copy.length === 0) return;
  utils.set(copy, { opacity: 0, translateY: 14 });
  createTimeline({
    autoplay: onScroll({
      target: track,
      enter: "bottom top",
      leave: () => `top+=${offset()} top`,
      sync: 0.6,
    }),
  }).add(
    copy,
    {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 600,
      delay: stagger(90),
      ease: "outQuad",
    },
    0,
  );
}

/** Share of the pinned interval spent moving into and out of focus. */
const FOCUS_SHARE = 0.12;

/** Offset of an element inside the stage, ignoring transforms. */
function offsetIn(element: HTMLElement, stage: HTMLElement) {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = element;
  while (node && node !== stage) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left };
}

function focusStage(stage: HTMLElement, timeline: SceneTimeline) {
  if (stage.hasAttribute("data-focus")) return;
  const scene = stage.querySelector<HTMLElement>(":scope > .ch-scene");
  const head = stage.querySelector<HTMLElement>(":scope > .ch-head");
  const label = head?.firstElementChild as HTMLElement | null;
  if (!scene || !head || !label) return;
  stage.setAttribute("data-focus", "");

  const measure = () => {
    const at = offsetIn(scene, stage);
    const fit = focusFit({
      width: stage.clientWidth,
      height: stage.clientHeight,
      gutter: offsetIn(head, stage).left,
      label: { top: offsetIn(label, stage).top, height: label.offsetHeight },
      scene: {
        left: at.left,
        top: at.top,
        width: scene.offsetWidth,
        height: scene.offsetHeight,
      },
    });
    stage.style.setProperty("--focus-dx", `${fit.dx}px`);
    stage.style.setProperty("--focus-dy", `${fit.dy}px`);
    stage.style.setProperty("--focus-k", String(fit.scale));
    stage.style.setProperty("--focus-label-dy", `${fit.labelDy}px`);
  };
  measure();
  void document.fonts?.ready.then(measure);
  let timer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(measure, 150);
  });

  // One continuous track (in, hold, out) so a scrub that jumps backward
  // over the hold still lands on the right value.
  const span = SCENE_LENGTH * FOCUS_SHARE;
  timeline
    .add(
      stage,
      { "--stage-focus": [0, 1], duration: span, ease: "inOutCubic" },
      0,
    )
    .add(
      stage,
      {
        "--stage-focus": [1, 1],
        duration: SCENE_LENGTH - span * 2,
        ease: "linear",
      },
      span,
    )
    .add(
      stage,
      { "--stage-focus": [1, 0], duration: span, ease: "inOutCubic" },
      SCENE_LENGTH - span,
    );
}

/**
 * Builds a chapter scene's timeline and hands it to the scroll. `build`
 * adds the scene's own tweens, positioned in 0..SCENE_LENGTH.
 */
export function scrubbedScene(
  root: Element,
  build: (timeline: SceneTimeline) => void,
): SceneTimeline {
  const on = scenesOn();
  // A fast scroll stops at every chapter instead of skipping them.
  if (on) initScrollGate();
  const track = root.closest<HTMLElement>("[data-track]");
  const stage = track?.querySelector<HTMLElement>("[data-stage]") ?? null;
  const pinned = stage ? pinnedBounds(stage) : null;

  const timeline = createTimeline({
    defaults: { ease: "inOutQuad" },
    autoplay:
      on && track && pinned
        ? // A fractional sync smooths the scrub instead of snapping per frame.
          onScroll({
            target: track,
            enter: pinned.enter,
            leave: pinned.leave,
            sync: 0.6,
          })
        : false,
  });
  build(timeline);
  if (on && stage) focusStage(stage, timeline);
  // Pin the length so authored positions map to the same scroll share.
  timeline.add(root, { opacity: 1, duration: 1 }, SCENE_LENGTH - 1);
  if (!on) timeline.seek(timeline.duration);
  else if (track && stage && pinned) revealCopy(track, stage, pinned.offset);
  root.setAttribute("data-armed", "");
  return timeline;
}

/** All the scene roots matching `selector`, with typed lookups inside. */
export function eachScene(
  selector: string,
  run: (
    root: HTMLElement,
    $: <T extends Element = HTMLElement>(selector: string) => T,
    $$: <T extends Element = HTMLElement>(selector: string) => T[],
  ) => void,
): void {
  for (const root of document.querySelectorAll<HTMLElement>(selector)) {
    const $ = <T extends Element = HTMLElement>(s: string) => {
      const found = root.querySelector<T>(s);
      if (!found) throw new Error(`Missing ${s} in ${selector}`);
      return found;
    };
    const $$ = <T extends Element = HTMLElement>(s: string) => [
      ...root.querySelectorAll<T>(s),
    ];
    run(root, $, $$);
  }
}
