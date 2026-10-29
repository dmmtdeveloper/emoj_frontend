// Applies the theme before the page paints (src/lib/theme.ts): the visitor's
// choice if they made one, otherwise light, whatever the device prefers.
// Loaded as a blocking external script: the CSP forbids inline scripts.
let theme = "light";
try {
  const stored = localStorage.getItem("emoj-theme");
  theme = stored === "dark" ? "dark" : "light";
} catch {
  // Storage blocked: light.
}
document.documentElement.dataset.theme = theme;

// The home's chapters (src/scripts/chapters/scrub.ts) start pinned and at
// their first frame. Marking the page here, before paint, keeps a reload
// from flashing their finished state first. Without JavaScript or with
// reduced motion the mark is never set and every scene shows at rest.
try {
  if (
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.documentElement.dataset.scenes = "";
  }
} catch {
  // No matchMedia: scenes stay at rest.
}
