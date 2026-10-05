/**
 * Client-side navigation between panel sections: the shell (sidebar and
 * navbar) stays mounted and only the content changes, with the URL kept in
 * sync through the History API. Every section also exists as its own Astro
 * page, so a direct visit or a reload of any URL still works.
 */

export type ShellPage =
  "dashboard" | "projects" | "news" | "media" | "messages" | "account";

const PAGES: Record<string, ShellPage> = {
  "/admin": "dashboard",
  "/admin/proyectos": "projects",
  "/admin/noticias": "news",
  "/admin/medios": "media",
  "/admin/mensajes": "messages",
  "/admin/cuenta": "account",
};

/** The section rendered at `pathname`, or null outside the shell. */
export function pageForPath(pathname: string): ShellPage | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PAGES[path] ?? null;
}

interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

interface AnchorLike {
  href: string;
  target: string;
}

/**
 * Whether a click on a link should navigate inside the panel instead of
 * loading the page: a plain left click (new-tab gestures keep working), same
 * origin, no `target`, and a destination that is a shell section.
 */
export function isInAppClick(
  event: ClickLike,
  anchor: AnchorLike,
  origin: string,
): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (anchor.target && anchor.target !== "_self") return false;
  let url: URL;
  try {
    url = new URL(anchor.href, origin);
  } catch {
    return false;
  }
  return url.origin === origin && pageForPath(url.pathname) !== null;
}
