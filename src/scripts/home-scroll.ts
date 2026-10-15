/**
 * Home page scroll restoration (logic in src/lib/motion/scroll-restore.ts):
 * the browser's own restoration is turned off and the position is saved
 * when the page is left, so a reload never lands half way through the
 * hero. Pages restored from the back/forward cache keep their state and
 * skip this. A URL with a #fragment is left to the browser.
 */
import { restoredScroll } from "../lib/motion/scroll-restore";

const KEY = "emoj-home-scroll";

function readSaved(): number | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function init(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero || !("scrollRestoration" in history)) return;
  history.scrollRestoration = "manual";

  window.addEventListener("pagehide", () => {
    try {
      sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
    } catch {
      // Storage blocked: the next load simply starts at the top.
    }
  });

  if (location.hash) return;
  const entry = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  const target = restoredScroll({
    saved: readSaved(),
    navType: entry?.type ?? "navigate",
    heroHeight: hero.getBoundingClientRect().height,
  });
  if (target === null) return;
  const go = () => window.scrollTo({ top: target, behavior: "instant" });
  go();
  // Content below the hero can still grow while loading; settle again.
  if (target > 0 && document.readyState !== "complete") {
    window.addEventListener("load", go, { once: true });
  }
}

init();
