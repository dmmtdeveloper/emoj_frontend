/**
 * Entry point of the admin island. Each /admin page mounts it with its
 * `page` (client:only): the auth screens render on their own, everything
 * else goes through the session guard and the shell.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
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

function Content({ page, serviceTitles = {} }: Props) {
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
        <Shell>
          <Content {...props} />
        </Shell>
      </RequireSession>
    </QueryClientProvider>
  );
}
