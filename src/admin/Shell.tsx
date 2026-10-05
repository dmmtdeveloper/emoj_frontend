/**
 * Panel frame: sidebar + navbar + content.
 *
 * - Sidebar (desktop, from 1024px): fixed column on `surface-inverse`, the
 *   six sections with the current one marked (`aria-current="page"`).
 *   It folds to icons only (labels stay as tooltips and accessible names);
 *   the choice is remembered in this browser.
 * - Sidebar (mobile): the same navigation in a native <dialog> drawer, which
 *   traps focus and closes with Esc, on backdrop click or on navigation.
 * - Navbar: menu button (mobile), page title and description, "Ver sitio"
 *   and the user menu (native popover: light dismiss and Esc for free).
 */
import {
  CircleCheck,
  ExternalLink,
  LoaderCircle,
  FileText,
  FolderKanban,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { activeNavItem, ADMIN_NAV, type AdminNavItem } from "../lib/admin/nav";
import { LOGIN_PATH } from "../lib/admin/redirect";
import { adminApi } from "./api";
import { useApp } from "./app-context";
import { useUser } from "./session";
import { cx, Isotype, Notice } from "./ui";

const ICONS: Record<AdminNavItem["icon"], LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  news: FileText,
  media: Image,
  messages: Mail,
  account: UserRound,
};

const COLLAPSED_KEY = "emoj-admin-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page.
  }
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      : source.slice(0, 2);
  return letters.toUpperCase();
}

function NavList({
  current,
  collapsed,
}: {
  current: AdminNavItem | undefined;
  collapsed: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === current?.href;
        return (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cx(
                "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-base leading-5 font-medium text-ink-inverse no-underline transition-colors duration-200 hover:bg-ink-inverse/10 hover:text-ink-inverse",
                active && "bg-ink-inverse/12 font-semibold",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-accent"
                />
              )}
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className={cx(collapsed && "sr-only")}>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <a
      href="/admin"
      className={cx(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-ink-inverse no-underline hover:text-ink-inverse",
        collapsed && "justify-center px-0",
      )}
    >
      <Isotype
        className={cx("h-auto shrink-0", collapsed ? "w-10" : "w-[68px]")}
      />
      <span
        className={cx(
          "text-lg leading-6 font-semibold",
          collapsed && "sr-only",
        )}
      >
        Panel <span className="sr-only">de administración de </span>EMOJ
      </span>
    </a>
  );
}

/** "Actualizando el sitio…" while a rebuild is running (about 2 minutes). */
function RebuildStatus() {
  const { rebuild, hadRebuild } = useApp();
  if (!rebuild.building && !hadRebuild) return null;
  const minutes = rebuild.building
    ? Math.max(1, Math.ceil(rebuild.remainingMs / 60_000))
    : 0;
  return (
    <p
      role="status"
      title={
        rebuild.building
          ? "Los cambios publicados tardan unos 2 minutos en verse en el sitio."
          : undefined
      }
      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-surface-sunken px-3 text-sm font-semibold whitespace-nowrap text-ink"
    >
      {rebuild.building ? (
        <>
          <LoaderCircle
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="motion-safe:animate-spin"
          />
          <span className="sr-only sm:not-sr-only">Actualizando el sitio</span>
          <span className="font-medium text-ink-muted">~{minutes} min</span>
        </>
      ) : (
        <>
          <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Sitio actualizado</span>
        </>
      )}
    </p>
  );
}

function UserMenu() {
  const user = useUser();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await adminApi.logout();
    window.location.assign(LOGIN_PATH);
  }

  return (
    <>
      <button
        type="button"
        popoverTarget="admin-user-menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm font-semibold text-ink hover:bg-surface-sunken"
      >
        <span className="hidden max-w-[16ch] truncate md:inline">
          {user.name || user.email}
        </span>
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-surface-inverse text-[13px] tracking-[0.04em] text-ink-inverse"
        >
          {initials(user.name, user.email)}
        </span>
        <span className="sr-only">Menú de usuario</span>
      </button>
      <div
        id="admin-user-menu"
        popover="auto"
        className="admin-popover w-72 rounded-lg border border-border bg-surface-raised p-2 text-ink shadow-(--shadow-md)"
      >
        <div className="border-b border-border px-3 pt-2 pb-3">
          <p className="font-semibold">{user.name || "Sin nombre"}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
        </div>
        <ul className="flex flex-col gap-1 pt-2">
          <li>
            <a
              href="/admin/cuenta"
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-ink no-underline hover:bg-surface-sunken hover:text-ink"
            >
              <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />
              Mi cuenta y contraseña
            </a>
          </li>
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => void signOut()}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-ink hover:bg-surface-sunken disabled:opacity-60"
            >
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
              {busy ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

function FlashNotice() {
  const { flash } = useApp();
  if (!flash) return null;
  return (
    <div className="mx-auto mb-6 max-w-6xl">
      <Notice tone="success">{flash}</Notice>
    </div>
  );
}

export function Shell({
  path,
  children,
}: {
  /** Current pathname (kept by the in-app router in AdminApp). */
  path: string;
  children: ReactNode;
}) {
  const current = activeNavItem(path);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const title = current ? `${current.label} | Panel EMOJ` : "Panel EMOJ";
    document.title = title;
  }, [current]);

  // After an in-app navigation, close the mobile drawer and the user menu.
  useEffect(() => {
    drawer.current?.close();
    const menu = document.getElementById("admin-user-menu");
    if (menu?.matches(":popover-open")) menu.hidePopover();
  }, [path]);

  // Close the drawer on a click on its backdrop (outside the panel). Esc is
  // handled natively by <dialog>, so this is a pointer-only convenience.
  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      writeCollapsed(!value);
      return !value;
    });
  }

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 bg-surface-inverse p-3 text-ink-inverse transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="pt-2">
          <Brand collapsed={collapsed} />
        </div>
        <nav aria-label="Secciones del panel" className="flex-1">
          <NavList current={current} collapsed={collapsed} />
        </nav>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className={cx(
            "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-inverse/80 hover:bg-ink-inverse/10 hover:text-ink-inverse",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className={cx(collapsed && "sr-only")}>
            {collapsed ? "Mostrar menú" : "Contraer menú"}
          </span>
        </button>
      </aside>

      {/* Mobile drawer */}
      <dialog
        ref={drawer}
        aria-label="Secciones del panel"
        className="admin-drawer m-0 h-dvh max-h-none w-[min(18rem,85vw)] max-w-none bg-surface-inverse p-0 text-ink-inverse"
      >
        <div className="h-full p-3">
          <div className="flex items-center justify-between gap-2 pt-2 pb-6">
            <Brand collapsed={false} />
            <button
              type="button"
              onClick={() => drawer.current?.close()}
              className="grid size-11 place-items-center rounded-md text-ink-inverse hover:bg-ink-inverse/10"
            >
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">Cerrar menú</span>
            </button>
          </div>
          <nav aria-label="Secciones del panel">
            <NavList current={current} collapsed={false} />
          </nav>
        </div>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => drawer.current?.showModal()}
            className="-ml-2 grid size-11 place-items-center rounded-md text-ink hover:bg-surface-sunken lg:hidden"
          >
            <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Abrir menú</span>
          </button>
          <div className="min-w-0 flex-1 py-2">
            <h1 className="truncate text-xl leading-7 font-semibold text-ink">
              {current?.label ?? "Panel"}
            </h1>
            {current && (
              <p className="hidden truncate text-sm leading-5 text-ink-muted sm:block">
                {current.description}
              </p>
            )}
          </div>
          <RebuildStatus />
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink no-underline hover:bg-surface-sunken hover:text-ink sm:inline-flex"
          >
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            Ver sitio
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
          <UserMenu />
        </header>
        <main
          id="contenido"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none md:px-8 md:py-8"
        >
          <FlashNotice />
          {children}
        </main>
      </div>
    </div>
  );
}
