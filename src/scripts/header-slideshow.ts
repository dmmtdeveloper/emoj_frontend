/**
 * Page header slideshows (src/components/ui/HeaderSlideshow.astro): the
 * photos play on their own, like the home hero (src/scripts/hero-slideshow.ts),
 * with the same timing helper (src/lib/motion/slideshow.ts). Sets
 * `data-state` on the photos, runs the counter and its progress line,
 * follows the pause checkbox and holds while the header is off screen or
 * the tab is hidden. Nothing runs with reduced motion.
 */
import { createSlideshow } from "../lib/motion/slideshow";

/** Time each photo stays before the next one wipes in. */
const SLIDE_MS = 6500;

function wire(root: HTMLElement): void {
  const frame = root.querySelector<HTMLElement>("[data-hs-frame]");
  const slides = [...root.querySelectorAll<HTMLElement>("[data-hs-slide]")];
  if (!frame || slides.length < 2) return;
  const count = root.querySelector<HTMLElement>("[data-hs-count]");
  const progress = root.querySelector<HTMLElement>("[data-hs-progress]");
  const toggle = root.querySelector<HTMLInputElement>("[data-hs-toggle]");

  // The zoom origin comes from a data attribute (CSP forbids style="").
  for (const slide of slides) {
    const origin = slide.dataset["origin"];
    if (origin) slide.style.setProperty("--hs-origin", origin);
  }

  /** Start loading (and decoding) a photo before its turn. */
  const prepare = (i: number) => {
    const img = slides[i]?.querySelector<HTMLImageElement>("img");
    if (!img) return;
    img.loading = "eager";
    img.decode().catch(() => undefined);
  };

  const restartProgress = () => {
    if (!progress) return;
    progress.removeAttribute("data-run");
    void progress.offsetWidth;
    progress.setAttribute("data-run", "");
  };

  const show = createSlideshow({
    count: slides.length,
    interval: SLIDE_MS,
    onChange: (index, previous) => {
      slides.forEach((slide, i) => {
        if (i === index) slide.dataset["state"] = "active";
        else if (i === previous) slide.dataset["state"] = "prev";
        else delete slide.dataset["state"];
      });
      if (count) count.textContent = String(index + 1).padStart(2, "0");
      restartProgress();
      prepare((index + 1) % slides.length);
    },
  });

  let onScreen = true;
  const updateVisibility = () => {
    const visible = onScreen && !document.hidden;
    root.toggleAttribute("data-held", !visible);
    show.setVisible(visible);
    if (visible && show.playing) restartProgress();
  };

  /** Follow the checkbox (also when the browser restores it checked). */
  const syncPause = () => {
    const paused = toggle?.checked ?? false;
    root.toggleAttribute("data-paused", paused);
    if (paused && show.playing) show.pause();
    else if (!paused && !show.playing) {
      show.play();
      restartProgress();
    }
  };
  toggle?.addEventListener("change", syncPause);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (!entry || entry.isIntersecting === onScreen) return;
        onScreen = entry.isIntersecting;
        updateVisibility();
      },
      { threshold: 0.15 },
    ).observe(frame);
  }
  document.addEventListener("visibilitychange", updateVisibility);

  root.setAttribute("data-playing", "");
  frame.setAttribute("data-playing", "");
  restartProgress();
  prepare(1);
  show.start();
  syncPause();
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  for (const root of document.querySelectorAll<HTMLElement>("[data-hs]")) {
    wire(root);
  }
}
