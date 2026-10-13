/**
 * Wires the "Cómo trabajamos" section (src/components/home/WorkFlow.astro)
 * to the page scroll, using the pure logic in src/lib/motion/work-flow.ts.
 *
 * - Arms the scroll layout (`data-wf-mode="scroll"`): a tall track with a
 *   sticky stage. Without this script, or with reduced motion, the section
 *   stays a plain list with the finished stroke.
 * - Each frame while the section is on screen: draws the river up to the
 *   scroll position, marks stations, shows the active stage, fills the
 *   chips, flows water particles along the drawn stroke (canvas) and, at
 *   the end, frames the logo.
 * - Stations and chips scroll the page to their stage.
 * - "Pausar movimiento" stops the ambient motion (particles, glow, ripples);
 *   the river still follows the scroll, which the visitor controls.
 *
 * Styles are only set through the CSSOM (CSP `style-src 'self'` allows it).
 */
import {
  activeStage,
  easeInOutCubic,
  endingShare,
  riverShare,
  scrollForStage,
  stageFill,
  STATIONS,
  workFlowMode,
} from "../lib/motion/work-flow";

/** The working view box, and the one that frames the whole logo at the end. */
const VIEW = { x: 60, y: 20, w: 720, h: 300 };
const VIEW_END = { x: -138, y: 20, w: 1128, h: 470 };
const SAMPLES = 1200;
const PARTICLES = 170;

interface Particle {
  t: number;
  v: number;
  off: number;
  wob: number;
  r: number;
  light: boolean;
  a: number;
}

function initWorkFlow(section: HTMLElement): void {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (workFlowMode({ prefersReducedMotion }) === "static") return;

  const q = <T extends Element>(selector: string): T | null =>
    section.querySelector<T>(selector);
  const pin = q<HTMLElement>("[data-wf-pin]");
  const wrap = q<HTMLElement>("[data-wf-stagewrap]");
  const stage = q<HTMLElement>("[data-wf-stage]");
  const svg = q<SVGSVGElement>("[data-wf-svg]");
  const ghost = q<SVGPathElement>("[data-wf-ghost]");
  const river = q<SVGPathElement>("[data-wf-river]");
  const head = q<SVGCircleElement>("[data-wf-head]");
  const canvas = q<HTMLCanvasElement>("[data-wf-water]");
  const counter = q<HTMLElement>("[data-wf-counter]");
  const pause = q<HTMLButtonElement>("[data-wf-pause]");
  const ctx = canvas?.getContext("2d");
  if (
    !pin ||
    !wrap ||
    !stage ||
    !svg ||
    !ghost ||
    !river ||
    !head ||
    !canvas ||
    !ctx
  )
    return;

  const stations = [
    ...section.querySelectorAll<SVGGElement>("[data-wf-station]"),
  ];
  const steps = [...section.querySelectorAll<HTMLElement>("[data-wf-step]")];
  const chips = [
    ...section.querySelectorAll<HTMLButtonElement>("[data-wf-chip]"),
  ];
  const fills = chips.map((chip) =>
    chip.querySelector<HTMLElement>("[data-wf-fill]"),
  );

  section.dataset["wfMode"] = "scroll";

  /** The same color at alpha 0, so a gradient fades without going grey. */
  const clear = (color: string): string => {
    const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
    if (!hex) return "rgba(0, 0, 0, 0)";
    const n = parseInt(hex, 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
  };
  // Canvas colors follow the section's theme roles (WorkFlow.astro); they
  // are read again when the site theme changes.
  const colors = { river: "#9E2B25", spark: "#FEABA0", glow: "#EA8377" };
  function readColors(): void {
    const css = getComputedStyle(section);
    const read = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    colors.river = read("--wf-river", colors.river);
    colors.spark = read("--wf-spark", colors.spark);
    colors.glow = read("--wf-glow", colors.glow);
  }
  readColors();
  new MutationObserver(readColors).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", readColors);

  // The stroke runs right to left in the brand file; sample it reversed so
  // the river flows from the left dot, with a normal for the particles.
  const length = ghost.getTotalLength();
  const pts = Array.from({ length: SAMPLES + 1 }, (_, k) => {
    const p = ghost.getPointAtLength(length * (1 - k / SAMPLES));
    return { x: p.x, y: p.y, nx: 0, ny: 0 };
  });
  pts.forEach((p, k) => {
    const a = pts[Math.max(0, k - 2)] ?? p;
    const b = pts[Math.min(SAMPLES, k + 2)] ?? p;
    const m = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    p.nx = -(b.y - a.y) / m;
    p.ny = (b.x - a.x) / m;
  });
  const origin = { x: 0, y: 0, nx: 0, ny: 0 };
  const at = (t: number) =>
    pts[Math.max(0, Math.min(SAMPLES, Math.round(t * SAMPLES)))] ?? origin;

  /** Puts a stage name beside its station, in the direction set in the markup. */
  function placeLabel(label: SVGTextElement, radius: number): void {
    const x = Number(label.dataset["x"]);
    const y = Number(label.dataset["y"]);
    const dx = Number(label.dataset["dx"] ?? 0);
    const dy = Number(label.dataset["dy"] ?? 0);
    const size = Math.max(15, 12 / scale);
    const gap = radius + 8 / Math.min(1, scale);
    label.style.fontSize = `${size}px`;
    label.setAttribute("x", String(x + dx * gap));
    // Below or above, shift by half a line so the text clears the disc.
    label.setAttribute("y", String(y + dy * gap + Math.sign(dy) * size * 0.5));
  }

  // ---- Sizing ----
  let scale = 1;
  let dpr = 1;
  let shiftY = 0;
  let zoom = 1;
  function fit(): void {
    if (!pin || !wrap || !stage || !canvas) return;
    const box = wrap.getBoundingClientRect();
    let w = box.width;
    let h = (w * VIEW.h) / VIEW.w;
    if (h > box.height) {
      h = box.height;
      w = (h * VIEW.w) / VIEW.h;
    }
    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = w / VIEW.w;
    // Keep station markers readable on phones.
    const radius = Math.max(15, 11 / scale);
    for (const station of stations) {
      station
        .querySelectorAll("circle")
        .forEach((c) => c.setAttribute("r", String(radius)));
      const num = station.querySelector<SVGTextElement>(".wf__num");
      if (num) num.style.fontSize = `${radius * 0.86}px`;
      const label = station.querySelector<SVGTextElement>(".wf__label");
      if (label) placeLabel(label, radius);
    }
    section.classList.toggle("is-compact", w < 640);
    // Ending: the logo moves to the middle of the window and grows a little.
    const pinBox = pin.getBoundingClientRect();
    const stageTop = box.top + (box.height - h) / 2;
    shiftY = pinBox.top + pinBox.height / 2 - (stageTop + h / 2);
    zoom = w < 600 ? 1.3 : 1.12;
  }

  // ---- Scroll ----
  function progress(): number {
    const total = section.offsetHeight - (pin?.offsetHeight ?? 0);
    if (total <= 0) return 1;
    return Math.max(
      0,
      Math.min(1, -section.getBoundingClientRect().top / total),
    );
  }
  function jumpTo(index: number): void {
    const total = section.offsetHeight - (pin?.offsetHeight ?? 0);
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + scrollForStage(index) * total,
      behavior: "smooth",
    });
  }
  stations.forEach((station, i) =>
    station.addEventListener("click", () => jumpTo(i)),
  );
  chips.forEach((chip, i) => chip.addEventListener("click", () => jumpTo(i)));

  let paused = false;
  pause?.addEventListener("click", () => {
    paused = !paused;
    pause.setAttribute("aria-pressed", String(paused));
    const label = paused ? "Reanudar movimiento" : "Pausar movimiento";
    pause.setAttribute("aria-label", label);
    pause.title = label;
  });

  // ---- Render ----
  let active = -2;
  const reached = new Set<number>();
  function render(d: number, ripples: boolean): void {
    if (!river || !head) return;
    river.style.strokeDashoffset = String(d - 1);
    const p = at(d);
    head.setAttribute("cx", String(p.x));
    head.setAttribute("cy", String(p.y));
    head.style.opacity = d > 0.002 && d < 0.999 ? "1" : "0";
    section.classList.toggle("is-done", d >= 0.999);

    STATIONS.forEach((station, i) => {
      const isReached = d >= station - 0.001;
      const el = stations[i];
      el?.classList.toggle("is-reached", isReached);
      if (isReached && !reached.has(i)) {
        reached.add(i);
        if (ripples && el) {
          el.classList.remove("is-ripple");
          void el.getBBox();
          el.classList.add("is-ripple");
        }
      }
      if (!isReached) reached.delete(i);
      const fill = fills[i];
      if (fill) fill.style.transform = `scaleX(${stageFill(i, d)})`;
    });

    const a = activeStage(d);
    stations.forEach((el, i) => el.classList.toggle("is-active", i === a));
    if (a === active) return;
    active = a;
    for (const step of steps)
      step.classList.toggle("is-on", Number(step.dataset["wfStep"]) === a);
    chips.forEach((chip, i) => {
      if (i === a) chip.setAttribute("aria-current", "step");
      else chip.removeAttribute("aria-current");
    });
    if (counter)
      counter.textContent = a < 0 ? "00" : String(a + 1).padStart(2, "0");
  }

  let lastView = "";
  function renderEnding(e: number): void {
    if (!svg || !stage) return;
    section.style.setProperty("--wf-end", e.toFixed(4));
    section.classList.toggle("is-logo", e > 0.5);
    const k = easeInOutCubic(e);
    const view = [
      VIEW.x + (VIEW_END.x - VIEW.x) * k,
      VIEW.y + (VIEW_END.y - VIEW.y) * k,
      VIEW.w + (VIEW_END.w - VIEW.w) * k,
      VIEW.h + (VIEW_END.h - VIEW.h) * k,
    ]
      .map((v) => v.toFixed(2))
      .join(" ");
    if (view !== lastView) {
      svg.setAttribute("viewBox", view);
      lastView = view;
    }
    stage.style.transform =
      k > 0
        ? `translateY(${(shiftY * k).toFixed(1)}px) scale(${(1 + (zoom - 1) * k).toFixed(4)})`
        : "";
  }

  // ---- Water: particles flowing inside the drawn part of the stroke ----
  const spawn = (): Particle => ({
    t: Math.random(),
    v: 0.035 + Math.random() * 0.05,
    off: (Math.random() - 0.5) * 5.5,
    wob: Math.random() * Math.PI * 2,
    r: 0.5 + Math.random() * 0.9,
    light: Math.random() < 0.18,
    a: 0.3 + Math.random() * 0.45,
  });
  const particles = Array.from({ length: PARTICLES }, spawn);

  function drawWater(
    d: number,
    dt: number,
    now: number,
    moving: boolean,
    visible: number,
  ): void {
    if (!ctx || !canvas) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (d <= 0.003 || visible <= 0) return;
    canvas.style.opacity = String(visible);
    const X = (x: number) => (x - VIEW.x) * scale;
    const Y = (y: number) => (y - VIEW.y) * scale;
    for (const particle of particles) {
      if (moving) particle.t += particle.v * dt;
      if (particle.t > d) {
        Object.assign(particle, spawn());
        particle.t = Math.random() * Math.min(d, 0.05);
      }
      const p = at(particle.t);
      const o =
        particle.off +
        Math.sin(now * 0.002 + particle.wob + particle.t * 40) * 1.2;
      ctx.globalAlpha = particle.a * Math.min(1, (d - particle.t) / 0.03);
      ctx.fillStyle = particle.light ? colors.spark : colors.river;
      ctx.beginPath();
      ctx.arc(
        X(p.x + p.nx * o),
        Y(p.y + p.ny * o),
        particle.r * Math.max(0.8, scale * 0.9),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (d < 0.999) {
      const p = at(d);
      const radius = 46 * scale;
      const glow = ctx.createRadialGradient(
        X(p.x),
        Y(p.y),
        0,
        X(p.x),
        Y(p.y),
        radius,
      );
      glow.addColorStop(0, colors.glow);
      glow.addColorStop(1, clear(colors.glow));
      // Parked on a station, the coral disc is the marker: dim the glow.
      const parked = STATIONS.some((station) => Math.abs(d - station) < 0.008);
      ctx.globalAlpha =
        (0.45 + (moving ? Math.sin(now * 0.004) * 0.12 : 0)) *
        (parked ? 0.3 : 1);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- Loop, only while the section is on screen ----
  let riverNow = 0;
  let ending = 0;
  let last = 0;
  let running = false;
  function frame(now: number): void {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    const s = progress();
    section.classList.toggle("is-started", s > 0.01);
    const ease = Math.min(1, dt * 8);
    const riverTarget = riverShare(s);
    riverNow += (riverTarget - riverNow) * ease;
    if (Math.abs(riverTarget - riverNow) < 0.0003) riverNow = riverTarget;
    const endTarget = endingShare(s);
    ending += (endTarget - ending) * ease;
    if (Math.abs(endTarget - ending) < 0.0005) ending = endTarget;
    renderEnding(ending);
    render(riverNow, !paused);
    drawWater(riverNow, dt, now, !paused, Math.max(0, 1 - ending * 4));
    requestAnimationFrame(frame);
  }
  function start(): void {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  const stop = (): void => {
    running = false;
  };

  fit();
  riverNow = riverShare(progress());
  ending = endingShare(progress());
  renderEnding(ending);
  render(riverNow, false);
  new ResizeObserver(() => {
    fit();
    renderEnding(ending);
  }).observe(wrap);
  new IntersectionObserver(([entry]) =>
    entry?.isIntersecting ? start() : stop(),
  ).observe(section);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start(),
  );
}

for (const section of document.querySelectorAll<HTMLElement>(
  "[data-work-flow]",
)) {
  initWorkFlow(section);
}
