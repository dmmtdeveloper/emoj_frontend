/**
 * The header's sun/moon button ([data-theme-toggle]): switches between the
 * light and dark themes and remembers the choice (src/lib/theme.ts). The
 * button is a toggle for dark mode (aria-pressed); the icons swap in CSS
 * (motion.css `.theme-toggle`). With View Transitions the page crossfades.
 */
import {
  THEME_KEY,
  effectiveTheme,
  storedTheme,
  toggledTheme,
  type Theme,
} from "../lib/theme";

const root = document.documentElement;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_COLORS: Record<Theme, string> = {
  light: "#FFF8F0",
  dark: "#170828",
};

function readStored(): Theme | null {
  try {
    return storedTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

function current(): Theme {
  return effectiveTheme(
    storedTheme(root.dataset.theme ?? null),
    darkQuery.matches,
  );
}

function sync(): void {
  const dark = current() === "dark";
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-pressed", String(dark));
  }
  // The browser bar follows an explicit choice too.
  if (root.dataset.theme) {
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", THEME_COLORS[current()]);
    }
  }
}

function apply(theme: Theme): void {
  root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  sync();
}

const stored = readStored();
if (stored && root.dataset.theme !== stored) root.dataset.theme = stored;
sync();
darkQuery.addEventListener("change", sync);

for (const button of document.querySelectorAll("[data-theme-toggle]")) {
  button.addEventListener("click", () => {
    const next = toggledTheme(current());
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (document.startViewTransition && !reduced) {
      document.startViewTransition(() => apply(next));
    } else {
      apply(next);
    }
  });
}
