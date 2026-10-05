/**
 * Root of the panel. Each /admin page mounts it with its `page` (see
 * mount.tsx): the auth screens render on their own, everything
 * else goes through the session guard and the shell.
 *
 * Inside the shell, clicks on links to other sections are handled here
 * (src/lib/admin/router.ts): the URL changes with the History API and only
 * the content is swapped, so the sidebar, navbar and session stay loaded.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
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
import { EditorSkeleton } from "./skeletons";
import { Button, Notice } from "./ui";
import { Shell } from "./Shell";

// The news editor brings TipTap (the largest part of the panel): it loads
// only when a news item is opened.
const NewsEditor = lazy(() =>
  import("./NewsEditor").then((m) => ({ default: m.NewsEditor })),
);

/**
 * If a section fails to render or load (for instance a new version of the
 * site was published while the panel was open, so an old file is gone),
 * show what happened and a way out instead of a blank page.
 */
class SectionBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin section failed", error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
        <Notice tone="error">
          Esta sección no se pudo cargar. Puede pasar si se publicó una versión
          nueva del panel mientras lo tenías abierto.
        </Notice>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    );
  }
}

function Loading() {
  return <EditorSkeleton label="Cargando el editor…" />;
}

export const ADMIN_PAGES = [
  "login",
  "forgot",
  "reset",
  "dashboard",
  "projects",
  "project-new",
  "project-edit",
  "news",
  "news-new",
  "news-edit",
  "media",
  "messages",
  "account",
] as const;

export type AdminPage = (typeof ADMIN_PAGES)[number];

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
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            // Coming back to a section shows what was loaded a moment ago
            // at once (and refreshes it quietly after 30 s).
            staleTime: 30_000,
          },
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
      {/* Re-keyed per section, so each one rises in (admin-enter). */}
      <div key={`${path}${search}`} className="admin-enter">
        <SectionBoundary>
          <Content
            page={pageForPath(path)}
            search={search}
            serviceTitles={serviceTitles}
          />
        </SectionBoundary>
      </div>
    </Shell>
  );
}
