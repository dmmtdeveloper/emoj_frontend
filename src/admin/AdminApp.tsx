/**
 * Entry point of the admin island. Each /admin page mounts it with its
 * `page` (client:only): the auth screens render on their own, everything
 * else goes through the session guard and the shell.
 *
 * Inside the shell, clicks on links to other sections are handled here
 * (src/lib/admin/router.ts): the URL changes with the History API and only
 * the content is swapped, so the sidebar, navbar and session stay loaded.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { isInAppClick, pageForPath, type ShellPage } from "../lib/admin/router";
import { ForgotScreen, LoginScreen, ResetScreen } from "./AuthScreens";
import {
  AccountPage,
  ComingSoonPage,
  DashboardPage,
  MessagesPage,
} from "./pages";
import { RequireSession } from "./session";
import { Shell } from "./Shell";

export type AdminPage =
  | "login"
  | "forgot"
  | "reset"
  | "dashboard"
  | "projects"
  | "news"
  | "media"
  | "messages"
  | "account";

interface Props {
  page: AdminPage;
  /** Service titles by slug (from the content collection). */
  serviceTitles?: Record<string, string>;
}

function Content({
  page,
  serviceTitles = {},
}: {
  page: ShellPage | null;
  serviceTitles?: Record<string, string>;
}) {
  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "messages":
      return <MessagesPage serviceTitles={serviceTitles} />;
    case "account":
      return <AccountPage />;
    case "projects":
      return <ComingSoonPage what="los proyectos" />;
    case "news":
      return <ComingSoonPage what="las noticias" />;
    case "media":
      return <ComingSoonPage what="las fotos e imágenes" />;
    default:
      return null;
  }
}

export default function AdminApp(props: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  if (props.page === "login") return <LoginScreen />;
  if (props.page === "forgot") return <ForgotScreen />;
  if (props.page === "reset") return <ResetScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <RequireSession>
        <ShellRouter serviceTitles={props.serviceTitles ?? {}} />
      </RequireSession>
    </QueryClientProvider>
  );
}

function ShellRouter({
  serviceTitles,
}: {
  serviceTitles: Record<string, string>;
}) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (!isInAppClick(event, anchor, window.location.origin)) return;
      event.preventDefault();
      const url = new URL(anchor.href);
      const next = `${url.pathname}${url.search}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.pushState(null, "", next);
      }
      setPath(url.pathname);
      window.scrollTo(0, 0);
      // Move focus to the new content so screen readers announce it.
      document.getElementById("contenido")?.focus({ preventScroll: true });
    }
    function onPopState() {
      setPath(window.location.pathname);
    }
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <Shell path={path}>
      <Content
        key={path}
        page={pageForPath(path)}
        serviceTitles={serviceTitles}
      />
    </Shell>
  );
}
