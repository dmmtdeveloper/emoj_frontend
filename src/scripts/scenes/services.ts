/**
 * Chapter 2 · Services (src/components/home/scenes/ServicesScene.astro).
 *
 * At rest the deck sits beside the list. Scrolling on, it grows to the
 * centre (`--focus` 1, focusCurve()) while the text steps back, and the
 * scroll shuffles it: the top card is thrown off to the left and the next
 * service comes up (deckPlace()), with its name on the label and its row
 * marked in the list. Then the deck goes back beside the list.
 */
import { deckPlace, focusCurve, segment } from "../../lib/motion/scenes";
import { measureFocus } from "./focus";
import { setVar, type SceneFactory } from "./types";

/** When the deck grows, shuffles and goes back (shares of the progress). */
const FOCUS = [0.06, 0.18, 0.84, 0.95] as const;
const SHUFFLE_FROM = 0.2;
const SHUFFLE_TO = 0.82;

export const servicesScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-svc-stage]");
  const deck = track.querySelector<HTMLElement>("[data-svc-deck]");
  const slot = track.querySelector<HTMLElement>("[data-svc-slot]");
  const label = track.querySelector<HTMLElement>("[data-svc-label]");
  const count = track.querySelector<HTMLElement>("[data-svc-count]");
  const pages = [...track.querySelectorAll<HTMLElement>("[data-svc-page]")];
  const items = [...track.querySelectorAll<HTMLElement>("[data-svc-item]")];
  if (!stage || !deck || !slot || pages.length === 0) return null;
  const titles = items.map(
    (item) => item.querySelector(".svc-item__title")?.textContent ?? "",
  );
  let current = -1;

  return {
    measure() {
      measureFocus(stage, deck, slot);
    },

    render(progress) {
      setVar(stage, "--focus", focusCurve(progress, FOCUS));
      const t =
        (pages.length - 1) * segment(progress, SHUFFLE_FROM, SHUFFLE_TO);
      pages.forEach((page, i) => {
        const place = deckPlace(i - t, i % 2 === 0 ? 1 : -1);
        page.style.transform = `translate(${place.x * 100}%, ${place.y * 100}%) rotate(${place.rotate}deg) scale(${place.scale})`;
        page.style.opacity = String(place.opacity);
        page.style.zIndex = String(place.z);
      });

      const now = Math.min(pages.length - 1, Math.round(t));
      if (now !== current) {
        current = now;
        if (label) label.textContent = titles[now] ?? "";
        if (count) count.textContent = String(now + 1).padStart(2, "0");
        items.forEach((item, i) =>
          item.toggleAttribute("data-active", i === now),
        );
      }
    },
  };
};
