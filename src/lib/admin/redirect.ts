/**
 * Where to go after signing in. The `next` parameter comes from the URL, so
 * it is untrusted: only plain paths inside the panel are accepted (no other
 * origins, no protocol-relative `//`, no backslashes, no `..`), and never the
 * sign-in pages themselves.
 */

export const ADMIN_HOME = "/admin";
export const LOGIN_PATH = "/admin/login";

const AUTH_PAGES = ["/admin/login", "/admin/recuperar", "/admin/restablecer"];

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return ADMIN_HOME;
  if (!raw.startsWith("/admin")) return ADMIN_HOME;
  if (raw.startsWith("//") || raw.includes("\\") || raw.includes("..")) {
    return ADMIN_HOME;
  }
  const path = raw.split(/[?#]/)[0] ?? "";
  if (path !== "/admin" && !path.startsWith("/admin/")) return ADMIN_HOME;
  if (AUTH_PAGES.some((p) => path === p || path === `${p}/`)) return ADMIN_HOME;
  return raw;
}

/** Login URL that returns to `pathname` + `search` afterwards. */
export function loginUrl(pathname: string, search: string): string {
  const here = `${pathname}${search}`;
  if (here === ADMIN_HOME || here === `${ADMIN_HOME}/`) return LOGIN_PATH;
  return `${LOGIN_PATH}?next=${encodeURIComponent(here)}`;
}
