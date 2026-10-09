/**
 * Featured projects rail (FeaturedProjects.astro). The list scrolls on its
 * own (scroll-snap, touch, trackpad, keyboard focus); this adds the arrow
 * buttons, the "01 / 07" counter and the progress line. Numbers come from
 * src/lib/motion/rail.ts.
 *
 * Without JavaScript the controls stay hidden and the rail still scrolls.
 * With reduced motion the arrows jump instead of gliding.
 */
import { railState, railTarget, type RailMetrics } from "../lib/motion/rail";

function init(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>("[data-rail-list]");
  if (!list) return;
  const cards = [...list.children] as HTMLElement[];
  const prev = root.querySelector<HTMLButtonElement>("[data-rail-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-rail-next]");
  const count = root.querySelector<HTMLElement>("[data-rail-count]");
  const bar = root.querySelector<HTMLElement>("[data-rail-progress]");
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  const metrics = (): RailMetrics => {
    const [first, second] = cards;
    const step =
      first && second
        ? second.offsetLeft - first.offsetLeft
        : (first?.offsetWidth ?? 1);
    return {
      scrollLeft: list.scrollLeft,
      scrollWidth: list.scrollWidth,
      clientWidth: list.clientWidth,
      step: Math.max(step, 1),
      count: cards.length,
    };
  };

  const update = (): void => {
    const state = railState(metrics());
    root.toggleAttribute("data-rail-scrollable", state.scrollable);
    if (prev) prev.disabled = state.atStart;
    if (next) next.disabled = state.atEnd;
    if (count) count.textContent = String(state.index + 1).padStart(2, "0");
    if (bar) bar.style.transform = `scaleX(${state.progress})`;
  };

  const go = (direction: 1 | -1): void => {
    list.scrollTo({
      left: railTarget(metrics(), direction),
      behavior: smooth ? "smooth" : "auto",
    });
  };

  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));
  let frame = 0;
  list.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  new ResizeObserver(update).observe(list);
  root.setAttribute("data-rail-ready", "");
  update();
}

for (const root of document.querySelectorAll<HTMLElement>("[data-rail]")) {
  init(root);
}
