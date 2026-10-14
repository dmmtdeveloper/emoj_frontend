/**
 * Light and dark themes. Light is the default, whatever the device prefers;
 * the visitor switches with the sun/moon button (site header and panel
 * top bar). The choice is kept in localStorage and applied before paint by
 * public/theme.js as `<html data-theme="light|dark">` (tokens.css reads it;
 * its prefers-color-scheme block only matters without JavaScript).
 */

export type Theme = "light" | "dark";

/** localStorage key; public/theme.js reads the same one. */
export const THEME_KEY = "emoj-theme";

export function storedTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function effectiveTheme(stored: Theme | null): Theme {
  return stored ?? "light";
}

export function toggledTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
