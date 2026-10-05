/**
 * Links in the news editor. The API keeps only absolute http, https and
 * mailto links (others make the body invalid), so the editor checks them
 * the same way and completes what people usually type ("www.mop.gob.cl",
 * "persona@empresa.cl").
 */

const ALLOWED = new Set(["http:", "https:", "mailto:"]);

export function isAllowedLink(href: string): boolean {
  try {
    const url = new URL(href);
    if (!ALLOWED.has(url.protocol)) return false;
    return url.protocol === "mailto:"
      ? url.pathname !== ""
      : url.hostname !== "";
  } catch {
    return false;
  }
}

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]\S*)?$/i;

/** The link to store, or null when it cannot be a valid link. */
export function normalizeLink(input: string): string | null {
  const value = input.trim();
  if (value === "" || /\s/.test(value)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return isAllowedLink(value) ? value : null;
  }
  if (EMAIL.test(value)) return `mailto:${value}`;
  if (HOST.test(value)) return `https://${value}`;
  return null;
}
