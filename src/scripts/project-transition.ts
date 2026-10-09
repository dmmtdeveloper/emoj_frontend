/**
 * Names only the photo of the project being opened, right before the page
 * swaps, so the cross-document view transition morphs that one photo into
 * the cover of the project page (motion.css `.vt-project[data-vt-on]`).
 *
 * Naming every card statically made each other photo a group of its own
 * that lingered over the new page, and a card scrolled out of the rail
 * still flew in from off screen. The attribute stays on the card, so going
 * back from the project page (back/forward cache) morphs the cover home.
 */
import {
  projectSlugFromUrl,
  projectTransitionName,
} from "../lib/content/transition";

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < window.innerHeight &&
    r.left < window.innerWidth
  );
}

window.addEventListener("pageswap", (event) => {
  for (const el of document.querySelectorAll("[data-vt-on]")) {
    el.removeAttribute("data-vt-on");
  }
  const url = event.activation?.entry?.url;
  const slug = event.viewTransition && url ? projectSlugFromUrl(url) : null;
  if (!slug) return;
  const name = projectTransitionName(slug);
  for (const el of document.querySelectorAll<HTMLElement>(".vt-project")) {
    if (el.dataset.vt === name && inViewport(el)) {
      el.setAttribute("data-vt-on", "");
      return;
    }
  }
});
