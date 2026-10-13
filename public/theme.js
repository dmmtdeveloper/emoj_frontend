// Applies the visitor's chosen theme before the page paints, so a dark
// choice never flashes light (src/lib/theme.ts). Loaded as a blocking
// external script: the CSP forbids inline scripts.
try {
  const theme = localStorage.getItem("emoj-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // Storage blocked: the site follows the device.
}
