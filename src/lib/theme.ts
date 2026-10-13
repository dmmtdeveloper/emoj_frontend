/**
 * Light and dark themes. The site follows the device (prefers-color-scheme)
 * until the visitor picks one with the header's sun/moon button; the choice
 * is kept in localStorage and applied before paint by public/theme.js as
 * `<html data-theme="light|dark">` (tokens.css reads it).
 */

export type Theme = "light" | "dark";

/** localStorage key; public/theme.js reads the same one. */
export const THEME_KEY = "emoj-theme";

export function storedTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function effectiveTheme(
  stored: Theme | null,
  prefersDark: boolean,
): Theme {
  return stored ?? (prefersDark ? "dark" : "light");
}

export function toggledTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
