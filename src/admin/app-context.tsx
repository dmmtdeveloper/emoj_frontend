/**
 * Panel-wide state shared by the shell and the pages:
 *
 * - Navigation: the in-app router's `navigate()`, and a leave guard an
 *   editor sets while it has unsaved changes (it decides whether and how to
 *   ask before leaving).
 * - Success dialog: after saving, publishing, unpublishing or deleting, an
 *   editor shows what happened and, for public changes, whether the site
 *   already shows it (src/lib/admin/site-refresh.ts). It lives here so it
 *   stays open when the editor moves to another address (a new item gets
 *   its edit page, a deleted one goes back to the list).
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pageForPath } from "../lib/admin/router";
import type { SiteState } from "../lib/admin/site-refresh";

/** Returns true when it took over the navigation (it will call `proceed`). */
export type LeaveGuard = (proceed: () => void) => boolean;

interface AppContextValue {
  path: string;
  search: string;
  navigate: (href: string, options?: { replace?: boolean }) => void;
  setLeaveGuard: (guard: LeaveGuard | null) => void;
  /** The open success dialog, if any. */
  success: SuccessDialog | null;
  /**
   * Opens the success dialog. With `refresh`, the dialog says the site is
   * updating and then whether it already shows the change.
   */
  showSuccess: (dialog: SuccessRequest, refresh?: Promise<SiteState>) => void;
  closeSuccess: () => void;
  /** One-time success message for the page at `path` (after a redirect). */
  flash: string | null;
  setFlash: (message: string, path: string) => void;
}

export interface SuccessRequest {
  /** Builds the text for the current state of the site. */
  build: (state: SiteState | "pending" | null) => {
    title: string;
    text: string;
    showLink: boolean;
  };
  /** Public page of the item, for "Ver en el sitio". */
  siteHref: string | null;
}

export interface SuccessDialog extends SuccessRequest {
  state: SiteState | "pending" | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

function currentLocation() {
  return { path: window.location.pathname, search: window.location.search };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(currentLocation);
  const guard = useRef<LeaveGuard | null>(null);
  const [success, setSuccess] = useState<
    (SuccessDialog & { token: object }) | null
  >(null);
  const [flashState, setFlashState] = useState<{
    message: string;
    path: string;
  } | null>(null);
  const flash =
    flashState && flashState.path === location.path ? flashState.message : null;

  const setFlash = useCallback((message: string, path: string) => {
    setFlashState({ message, path });
  }, []);

  /** Updates the location; a flash for another page is dropped (shown once). */
  const moveTo = useCallback((next: { path: string; search: string }) => {
    setLocation(next);
    setFlashState((current) =>
      current && current.path !== next.path ? null : current,
    );
  }, []);

  const go = useCallback(
    (href: string, replace: boolean) => {
      const url = new URL(href, window.location.origin);
      const next = `${url.pathname}${url.search}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        if (replace) window.history.replaceState(null, "", next);
        else window.history.pushState(null, "", next);
      }
      moveTo(currentLocation());
      window.scrollTo(0, 0);
      // Move focus to the new content so screen readers announce it.
      document.getElementById("contenido")?.focus({ preventScroll: true });
    },
    [moveTo],
  );

  const navigate = useCallback(
    (href: string, options: { replace?: boolean } = {}) => {
      const url = new URL(href, window.location.origin);
      if (pageForPath(url.pathname) === null) {
        window.location.assign(url.href);
        return;
      }
      const proceed = () => {
        guard.current = null;
        go(url.href, options.replace ?? false);
      };
      if (guard.current?.(proceed)) return;
      proceed();
    },
    [go],
  );

  useEffect(() => {
    function onPopState() {
      const target = currentLocation();
      const pending = guard.current;
      if (pending) {
        // Undo the browser's move and ask first; on confirm, go there.
        const back = `${location.path}${location.search}`;
        window.history.pushState(null, "", back);
        const proceed = () => {
          guard.current = null;
          go(`${target.path}${target.search}`, false);
        };
        if (pending(proceed)) return;
        proceed();
        return;
      }
      moveTo(target);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [go, moveTo, location.path, location.search]);

  const setLeaveGuard = useCallback((next: LeaveGuard | null) => {
    guard.current = next;
  }, []);

  const showSuccess = useCallback(
    (dialog: SuccessRequest, refresh?: Promise<SiteState>) => {
      const token = {};
      setSuccess({ ...dialog, state: refresh ? "pending" : null, token });
      void refresh?.then((state) =>
        setSuccess((current) =>
          current?.token === token ? { ...current, state } : current,
        ),
      );
    },
    [],
  );

  const closeSuccess = useCallback(() => setSuccess(null), []);

  const value = useMemo(
    () => ({
      path: location.path,
      search: location.search,
      navigate,
      setLeaveGuard,
      success,
      showSuccess,
      closeSuccess,
      flash,
      setFlash,
    }),
    [
      location,
      navigate,
      setLeaveGuard,
      success,
      showSuccess,
      closeSuccess,
      flash,
      setFlash,
    ],
  );

  return <AppContext value={value}>{children}</AppContext>;
}
