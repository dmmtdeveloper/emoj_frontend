/**
 * Site-wide motion enhancements, bundled as one same-origin module (CSP
 * safe). Everything here is optional: the HTML ships final states and CSS
 * handles motion where scroll-driven animations exist.
 *
 * - Header: IntersectionObserver fallback for the transparent-over-hero
 *   header when `animation-timeline: scroll()` is unsupported.
 * - Reveal: IntersectionObserver fallback for `[data-reveal]`.
 * - Count-up: `[data-count]` numbers count from 0 when they scroll in.
 * - Draw on view: `[data-draw-on-view]` (footer logo) draws once when it
 *   enters the viewport.
 * - Signature frames: `[data-signature-frame]` outlines get their path from
 *   the photo's size, rebuilt on resize (the drawing itself is CSS).
 */
import {
  countValueAt,
  formatCount,
  parseCount,
  type CountSpec,
} from "../lib/motion/count-up";
import { drawOnViewMode, initDrawOnView } from "../lib/motion/draw-on-view";
import { headerMode, isHeaderSolid } from "../lib/motion/header-state";
import { initRevealFallback, revealMode } from "../lib/motion/reveal";
import { signatureFramePath } from "../lib/motion/signature-frame";

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

function initDrawOnViewElements(): void {
  const mode = drawOnViewMode({
    prefersReducedMotion,
    hasIntersectionObserver,
  });
  if (mode !== "observer") return;
  initDrawOnView({
    elements: [...document.querySelectorAll<SVGElement>("[data-draw-on-view]")],
    factory: (callback) =>
      new IntersectionObserver(
        (entries) =>
          callback(
            entries.map((entry) => ({
              target: entry.target as SVGElement,
              isIntersecting: entry.isIntersecting,
              boundingClientRect: entry.boundingClientRect,
            })),
          ),
        { rootMargin: "0px 0px -10% 0px", threshold: 0.6 },
      ),
  });
}

/** Space between each line end of a signature frame and its dot, in px. */
const FRAME_DOT_GAP = 9;

function drawSignatureFrame(svg: SVGSVGElement): void {
  const photo = svg.parentElement;
  if (!photo) return;
  const box = svg.getBoundingClientRect();
  const outset = (box.width - photo.getBoundingClientRect().width) / 2;
  const base = Number.parseFloat(
    getComputedStyle(svg).getPropertyValue("--radius-signature"),
  );
  const frame = signatureFramePath({
    width: box.width,
    height: box.height,
    // Concentric with the photo's corners.
    radius: (Number.isFinite(base) ? base : 50) + outset,
    dotGap: FRAME_DOT_GAP,
  });
  if (!frame) return;
  svg.setAttribute("viewBox", `0 0 ${frame.start.x} ${frame.end.y}`);
  svg.querySelector("path")?.setAttribute("d", frame.d);
  const [start, end] = svg.querySelectorAll("circle");
  for (const [dot, point] of [
    [start, frame.start],
    [end, frame.end],
  ] as const) {
    dot?.setAttribute("cx", String(point.x));
    dot?.setAttribute("cy", String(point.y));
  }
}

function initSignatureFrames(): void {
  const frames = document.querySelectorAll<SVGSVGElement>(
    "[data-signature-frame]",
  );
  if (frames.length === 0) return;
  if (!("ResizeObserver" in window)) {
    frames.forEach(drawSignatureFrame);
    return;
  }
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      drawSignatureFrame(entry.target as SVGSVGElement);
    }
  });
  frames.forEach((svg) => observer.observe(svg));
}

initHeader();
initReveal();
initCountUp();
initDrawOnViewElements();
initSignatureFrames();
