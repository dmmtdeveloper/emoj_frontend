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
import { lazy, Suspense, useEffect, useState } from "react";
import { isInAppClick, pageForPath, type ShellPage } from "../lib/admin/router";
import { AppProvider, useApp } from "./app-context";
import { ForgotScreen, LoginScreen, ResetScreen } from "./AuthScreens";
import {
  AccountPage,
  ComingSoonPage,
  DashboardPage,
  MessagesPage,
} from "./pages";
import { NewsListPage } from "./news";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectsPage } from "./projects";
import { RequireSession } from "./session";
import { Shell } from "./Shell";

// The news editor brings TipTap (the largest part of the panel): it loads
// only when a news item is opened.
const NewsEditor = lazy(() =>
  import("./NewsEditor").then((m) => ({ default: m.NewsEditor })),
);

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      Cargando el editor…
    </p>
  );
}

export type AdminPage =
  | "login"
  | "forgot"
  | "reset"
  | "dashboard"
  | "projects"
  | "project-new"
  | "project-edit"
  | "news"
  | "news-new"
  | "news-edit"
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
  search,
  serviceTitles = {},
}: {
  page: ShellPage | null;
  search: string;
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
      return <ProjectsPage />;
    case "project-new":
      return <ProjectEditor id={null} serviceTitles={serviceTitles} />;
    case "project-edit":
      return (
        <ProjectEditor
          id={new URLSearchParams(search).get("id") ?? ""}
          serviceTitles={serviceTitles}
        />
      );
    case "news":
      return <NewsListPage />;
    case "news-new":
      return (
        <Suspense fallback={<Loading />}>
          <NewsEditor id={null} />
        </Suspense>
      );
    case "news-edit":
      return <NewsEditor id={new URLSearchParams(search).get("id") ?? ""} />;
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
        <AppProvider>
          <ShellRouter serviceTitles={props.serviceTitles ?? {}} />
        </AppProvider>
      </RequireSession>
    </QueryClientProvider>
  );
}

function ShellRouter({
  serviceTitles,
}: {
  serviceTitles: Record<string, string>;
}) {
  const { path, search, navigate } = useApp();

  // Links to other sections switch the content instead of loading a page.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (!isInAppClick(event, anchor, window.location.origin)) return;
      event.preventDefault();
      navigate(anchor.href);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  return (
    <Shell path={path}>
      <Content
        key={`${path}${search}`}
        page={pageForPath(path)}
        search={search}
        serviceTitles={serviceTitles}
      />
    </Shell>
  );
}
