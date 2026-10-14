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
