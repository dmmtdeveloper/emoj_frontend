/**
 * Home hero slideshow (Hero.astro): the photos play on their own. Timing
 * lives in src/lib/motion/slideshow.ts; this file wires it to the page:
 * `data-state` on the photos, the counter and its progress line, the pause
 * button, and holding while the hero is off screen or the tab is hidden.
 *
 * Nothing runs with reduced motion: the hero keeps its first photo.
 */
import { createSlideshow } from "../lib/motion/slideshow";

/** Time each photo stays before the next one wipes in. */
const SLIDE_MS = 6500;

const LABEL_PAUSE = "Pausar el cambio de fotos";
const LABEL_PLAY = "Reanudar el cambio de fotos";

function init(): void {
  const frame = document.querySelector<HTMLElement>("[data-hero]");
  if (!frame) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const slides = [...frame.querySelectorAll<HTMLElement>("[data-hero-slide]")];
  if (slides.length < 2) return;
  const count = frame.querySelector<HTMLElement>("[data-hero-count]");
  const progress = frame.querySelector<HTMLElement>("[data-hero-progress]");
  const toggle = frame.querySelector<HTMLButtonElement>("[data-hero-toggle]");

  const imageOf = (i: number) =>
    slides[i]?.querySelector<HTMLImageElement>("img") ?? null;

  /** Start loading (and decoding) a photo before its turn. */
  const prepare = (i: number) => {
    const img = imageOf(i);
    if (!img) return;
    img.loading = "eager";
    img.decode().catch(() => undefined);
  };

  /** Restart the progress line from zero. */
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
    frame.toggleAttribute("data-held", !visible);
    show.setVisible(visible);
    // The timer starts a full interval again, so the line does too.
    if (visible && show.playing) restartProgress();
  };

  toggle?.addEventListener("click", () => {
    if (show.playing) {
      show.pause();
      frame.setAttribute("data-paused", "");
      toggle.setAttribute("aria-label", LABEL_PLAY);
    } else {
      show.play();
      frame.removeAttribute("data-paused");
      toggle.setAttribute("aria-label", LABEL_PAUSE);
      restartProgress();
    }
  });

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

  frame.setAttribute("data-slideshow", "");
  restartProgress();
  prepare(1);
  show.start();
}

init();
