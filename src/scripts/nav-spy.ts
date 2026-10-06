/**
 * Header scroll spy (SiteHeader.astro): while the page scrolls, the link of
 * the section under the reading line is highlighted by a pill that slides
 * between links. Sections opt in with `data-nav-section="<href>"` (the home
 * page). Where no section crosses the line, the current page's link keeps
 * the highlight. The pill is drawn with clip-path on a full-width layer
 * (set through CSSOM, which the CSP allows), so only clip-path animates.
 *
 * `aria-current` is not touched: it still names the page you are on.
 */
import { sectionAt } from "../lib/motion/nav-spy";

/** Reading line, as a fraction of the viewport height from the top. */
const LINE = 0.4;

function init(): void {
  const nav = document.querySelector<HTMLElement>("[data-nav-spy]");
  const list = nav?.querySelector("ul");
  const indicator = nav?.querySelector<HTMLElement>("[data-nav-indicator]");
  if (!nav || !list || !indicator) return;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("[data-nav-link]")];
  const home =
    links.find((a) => a.hasAttribute("data-active"))?.dataset["navLink"] ??
    null;
  const sections = [
    ...document.querySelectorAll<HTMLElement>("[data-nav-section]"),
  ];

  let shown: string | null | undefined;

  const place = (href: string | null) => {
    if (href === shown) return;
    const link = links.find((a) => a.dataset["navLink"] === href);
    for (const a of links) a.toggleAttribute("data-active", a === link);
    if (!link) {
      indicator.removeAttribute("data-visible");
      shown = href;
      return;
    }
    const box = list.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    const left = r.left - box.left;
    const right = box.right - r.right;
    indicator.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
    // Slide only after the first placement, so it does not fly in on load.
    if (shown !== undefined) indicator.setAttribute("data-moved", "");
    indicator.setAttribute("data-visible", "");
    shown = href;
  };

  const update = () => {
    const line = window.innerHeight * LINE;
    const hit = sectionAt(
      sections.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          href: el.dataset["navSection"] ?? "",
          top: r.top,
          bottom: r.bottom,
        };
      }),
      line,
    );
    place(hit ?? home);
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  nav.setAttribute("data-spy-ready", "");
  update();
  if (sections.length > 0) {
    window.addEventListener("scroll", schedule, { passive: true });
  }
  // Link widths change with the layout (fonts loading, resizing).
  window.addEventListener("resize", () => {
    shown = undefined;
    schedule();
  });
  document.fonts?.ready.then(() => {
    shown = undefined;
    schedule();
  });
}

init();
