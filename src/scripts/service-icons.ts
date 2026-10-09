/**
 * Touch screens have no hover, so a service card plays its icon gesture
 * once when most of it is in view (`data-icon-play` on the card, motion.css
 * "Service icon gestures"). Nothing runs with a mouse or reduced motion.
 */
function init(): void {
  if (!window.matchMedia("(hover: none)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;
  const cards = [...document.querySelectorAll(".svc-icon")]
    .map((icon) => icon.closest<HTMLElement>(".group"))
    .filter((card): card is HTMLElement => card !== null);
  if (cards.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-icon-play", "");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  for (const card of new Set(cards)) observer.observe(card);
}

init();
