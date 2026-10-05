/**
 * Panel-wide state shared by the shell and the pages:
 *
 * - Navigation: the in-app router's `navigate()`, and a leave guard an
 *   editor sets while it has unsaved changes (it decides whether and how to
 *   ask before leaving).
 * - Site rebuild: when content goes public (publish, unpublish, edit or
 *   delete of a published item) the API rebuilds the static site, which
 *   takes about two minutes; the navbar shows it (src/lib/admin/rebuild.ts).
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
import { rebuildState, type RebuildState } from "../lib/admin/rebuild";

/** Returns true when it took over the navigation (it will call `proceed`). */
export type LeaveGuard = (proceed: () => void) => boolean;

interface AppContextValue {
  path: string;
  search: string;
  navigate: (href: string, options?: { replace?: boolean }) => void;
  setLeaveGuard: (guard: LeaveGuard | null) => void;
  rebuild: RebuildState;
  /** Whether a rebuild was started in this browser tab. */
  hadRebuild: boolean;
  markRebuild: () => void;
  /** One-time success message for the page at `path` (after a redirect). */
  flash: string | null;
  setFlash: (message: string, path: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

const REBUILD_KEY = "emoj-admin-rebuild-started";

function readRebuildStart(): number | null {
  try {
    const raw = Number(sessionStorage.getItem(REBUILD_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  } catch {
    return null;
  }
}

function writeRebuildStart(value: number): void {
  try {
    sessionStorage.setItem(REBUILD_KEY, String(value));
  } catch {
    // Storage unavailable: the indicator lasts while this page is open.
  }
}

function useRebuild() {
  const [startedAt, setStartedAt] = useState(readRebuildStart);
  const [now, setNow] = useState(() => Date.now());
  const state = rebuildState(startedAt, now);

  useEffect(() => {
    if (!state.building) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [state.building]);

  const markRebuild = useCallback(() => {
    const at = Date.now();
    writeRebuildStart(at);
    setStartedAt(at);
    setNow(at);
  }, []);

  return { state, hadRebuild: startedAt !== null, markRebuild };
}

function currentLocation() {
  return { path: window.location.pathname, search: window.location.search };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(currentLocation);
  const guard = useRef<LeaveGuard | null>(null);
  const { state: rebuild, hadRebuild, markRebuild } = useRebuild();
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

  const value = useMemo(
    () => ({
      path: location.path,
      search: location.search,
      navigate,
      setLeaveGuard,
      rebuild,
      hadRebuild,
      markRebuild,
      flash,
      setFlash,
    }),
    [
      location,
      navigate,
      setLeaveGuard,
      rebuild,
      hadRebuild,
      markRebuild,
      flash,
      setFlash,
    ],
  );

  return <AppContext value={value}>{children}</AppContext>;
}
