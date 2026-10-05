/**
 * Sections of the admin panel, in sidebar order. Icons are resolved in the
 * React shell (lucide-react) by `icon` name, so this stays framework-free
 * and testable.
 */

export interface AdminNavItem {
  label: string;
  href: string;
  icon: "dashboard" | "projects" | "news" | "media" | "messages" | "account";
  /** Short line shown under the page title in the navbar. */
  description: string;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: "Resumen",
    href: "/admin",
    icon: "dashboard",
    description: "Lo pendiente y lo último publicado",
  },
  {
    label: "Proyectos",
    href: "/admin/proyectos",
    icon: "projects",
    description: "Casos de proyecto del sitio",
  },
  {
    label: "Noticias",
    href: "/admin/noticias",
    icon: "news",
    description: "Artículos y novedades",
  },
  {
    label: "Medios",
    href: "/admin/medios",
    icon: "media",
    description: "Fotos e imágenes",
  },
  {
    label: "Mensajes",
    href: "/admin/mensajes",
    icon: "messages",
    description: "Consultas del formulario de contacto",
  },
  {
    label: "Cuenta",
    href: "/admin/cuenta",
    icon: "account",
    description: "Tu usuario y tu contraseña",
  },
];

function trimSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The section a path belongs to (the dashboard matches only itself). */
export function activeNavItem(pathname: string): AdminNavItem | undefined {
  const path = trimSlash(pathname);
  return ADMIN_NAV.find((item) =>
    item.href === "/admin"
      ? path === "/admin"
      : path === item.href || path.startsWith(`${item.href}/`),
  );
}
