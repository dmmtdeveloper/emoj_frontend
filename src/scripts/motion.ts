/**
 * Site-wide motion enhancements, bundled as one same-origin module (CSP
 * safe). Everything here is optional: the HTML ships final states and CSS
 * handles motion where scroll-driven animations exist.
 *
 * - Header: IntersectionObserver fallback for the transparent-over-hero
 *   header when `animation-timeline: scroll()` is unsupported.
 * - Reveal: IntersectionObserver fallback for `[data-reveal]`.
 * - Count-up: `[data-count]` numbers count from 0 when they scroll in.
 */
import {
  countValueAt,
  formatCount,
  parseCount,
  type CountSpec,
} from "../lib/motion/count-up";
import { headerMode, isHeaderSolid } from "../lib/motion/header-state";
import { initRevealFallback, revealMode } from "../lib/motion/reveal";

const COUNT_DURATION_MS = 1600;

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const hasIntersectionObserver = "IntersectionObserver" in window;
const supports = (rule: string): boolean =>
  typeof CSS !== "undefined" && CSS.supports(rule);

function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const sentinel = document.querySelector<HTMLElement>(
    "[data-header-sentinel]",
  );
  if (!header || !sentinel) return;
  const mode = headerMode({
    hasOverlay: header.hasAttribute("data-overlay"),
    supportsScrollTimeline: supports("animation-timeline: scroll()"),
    hasIntersectionObserver,
  });
  if (mode !== "observer") return;
  new IntersectionObserver(([entry]) => {
    if (entry) header.dataset["solid"] = String(isHeaderSolid(entry));
  }).observe(sentinel);
}

function initReveal(): void {
  const mode = revealMode({
    prefersReducedMotion,
    supportsScrollTimeline: supports("animation-timeline: view()"),
    hasIntersectionObserver,
  });
  if (mode !== "observer") return;
  initRevealFallback({
    elements: [
      ...document.querySelectorAll<HTMLElement>(
        "[data-reveal], [data-reveal-stagger] > *",
      ),
    ],
    rootClassList: document.documentElement.classList,
    factory: (callback) =>
      new IntersectionObserver(
        (entries) =>
          callback(
            entries.map((entry) => ({
              target: entry.target as HTMLElement,
              isIntersecting: entry.isIntersecting,
              boundingClientRect: entry.boundingClientRect,
            })),
          ),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
      ),
  });
}

function runCount(element: HTMLElement, spec: CountSpec): void {
  const start = performance.now();
  const step = (now: number): void => {
    const progress = (now - start) / COUNT_DURATION_MS;
    element.textContent = formatCount(spec, countValueAt(spec, progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initCountUp(): void {
  if (prefersReducedMotion || !hasIntersectionObserver) return;
  const pending = new Map<Element, CountSpec>();
  for (const element of document.querySelectorAll<HTMLElement>(
    "[data-count]",
  )) {
    const spec = parseCount(element.textContent ?? "");
    if (spec) pending.set(element, spec);
  }
  if (pending.size === 0) return;
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const spec = pending.get(element);
        if (!spec) continue;
        if (!seen.has(element)) {
          seen.add(element);
          // Already on screen at load: keep the final value, no animation.
          if (entry.isIntersecting) {
            observer.unobserve(element);
            continue;
          }
          element.textContent = formatCount(spec, 0);
        }
        if (entry.isIntersecting) {
          observer.unobserve(element);
          runCount(element, spec);
        }
      }
    },
    { threshold: 0.6 },
  );
  for (const element of pending.keys()) observer.observe(element);
}

initHeader();
initReveal();
initCountUp();
