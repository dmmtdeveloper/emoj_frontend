/**
 * Scroll scenes of the home (logic in src/lib/motion/scenes.ts).
 *
 * Each chapter is a `[data-scene="<name>"]` track. This module arms it
 * (`data-scene-armed`: the track grows and its stage sticks, see
 * src/styles/scenes.css), then, on every frame while the chapter is near the
 * screen, reads the track's progress through the pinned stretch, smooths it
 * a little and hands it to the chapter's scene. A scene derives everything
 * from that number, so scrolling up rewinds it exactly.
 *
 * Without JavaScript, with reduced motion or without IntersectionObserver
 * nothing is armed: every chapter stays a plain section in its final state.
 * Styles are only set through the CSSOM (CSP `style-src 'self'` allows it).
 */
import {
  approach,
  sceneMode,
  scrollForProgress,
  trackProgress,
} from "../lib/motion/scenes";
import { closingScene } from "./scenes/closing";
import { heroScene } from "./scenes/hero";
import { reelScene } from "./scenes/reel";
import { servicesScene } from "./scenes/services";
import { stackScene } from "./scenes/stack";
import { yearsScene } from "./scenes/years";
import type { Scene, SceneFactory, SceneTools } from "./scenes/types";

/** Time constant of the progress smoothing (ms): soft, never laggy. */
const SMOOTHING_MS = 110;

const FACTORIES: Record<string, SceneFactory> = {
  hero: heroScene,
  services: servicesScene,
  reel: reelScene,
  years: yearsScene,
  stack: stackScene,
  closing: closingScene,
};

interface Chapter {
  track: HTMLElement;
  scene: Scene;
  /** Progress shown (smoothed) and the one the scroll asks for. */
  shown: number;
  target: number;
  near: boolean;
  /** Smoothing on: off for the first frame and after jumps. */
  smooth: boolean;
}

const chapters: Chapter[] = [];
let frame = 0;
let last = 0;

function targetOf(chapter: Chapter): number {
  const box = chapter.track.getBoundingClientRect();
  return trackProgress({
    top: box.top,
    height: box.height,
    viewport: window.innerHeight,
  });
}

function tick(now: number): void {
  frame = 0;
  const elapsed = last === 0 ? 16 : Math.min(64, now - last);
  last = now;
  let busy = false;
  for (const chapter of chapters) {
    if (!chapter.near) continue;
    chapter.target = targetOf(chapter);
    chapter.shown = chapter.smooth
      ? approach(chapter.shown, chapter.target, elapsed, SMOOTHING_MS)
      : chapter.target;
    chapter.smooth = true;
    chapter.scene.render(chapter.shown, now);
    if (chapter.shown !== chapter.target || chapter.scene.busy?.(now)) {
      busy = true;
    }
  }
  if (busy) request();
  else last = 0;
}

function request(): void {
  if (frame === 0) frame = requestAnimationFrame(tick);
}

function measureAll(): void {
  for (const chapter of chapters) {
    chapter.scene.measure?.();
    chapter.smooth = false;
  }
  request();
}

const tools: SceneTools = {
  scrollTo(track, progress) {
    const box = track.getBoundingClientRect();
    window.scrollTo({
      top: scrollForProgress(
        {
          pageTop: box.top + window.scrollY,
          height: box.height,
          viewport: window.innerHeight,
        },
        progress,
      ),
      behavior: "smooth",
    });
  },
  wake: request,
};

function init(): void {
  const mode = sceneMode({
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    hasIntersectionObserver: "IntersectionObserver" in window,
  });
  if (mode === "static") return;

  for (const track of document.querySelectorAll<HTMLElement>("[data-scene]")) {
    const factory = FACTORIES[track.dataset["scene"] ?? ""];
    if (!factory) continue;
    const scene = factory(track, tools);
    if (!scene) continue;
    track.setAttribute("data-scene-armed", "");
    chapters.push({
      track,
      scene,
      shown: 0,
      target: 0,
      near: false,
      smooth: false,
    });
  }
  if (chapters.length === 0) return;

  // Measure after arming: armed tracks have their pinned layout now.
  for (const chapter of chapters) chapter.scene.measure?.();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const chapter = chapters.find((c) => c.track === entry.target);
        if (!chapter) continue;
        if (entry.isIntersecting && !chapter.near) chapter.smooth = false;
        chapter.near = entry.isIntersecting;
      }
      request();
    },
    // A screen of margin: a scene is set before it is seen.
    { rootMargin: "100% 0px 100% 0px" },
  );
  for (const chapter of chapters) observer.observe(chapter.track);

  window.addEventListener("scroll", request, { passive: true });
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measureAll, 120);
  });
  // Fonts change text metrics that some scenes measure.
  void document.fonts?.ready.then(measureAll);
  window.addEventListener("load", measureAll, { once: true });
  window.addEventListener("pageshow", measureAll);
  request();
}

init();
