/**
 * Session guard for the panel: asks the API who is signed in (`/v1/auth/me`,
 * which also returns the CSRF token) and sends anonymous visitors to the
 * login page, remembering where they wanted to go.
 */
import { useQuery } from "@tanstack/react-query";
import { createContext, use, type ReactNode } from "react";
import type { AdminUser } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import { loginUrl } from "../lib/admin/redirect";
import { adminApi } from "./api";
import { ShellSkeleton } from "./skeletons";
import { Notice } from "./ui";

const SessionContext = createContext<AdminUser | null>(null);

/** The signed-in user (only inside <RequireSession>). */
export function useUser(): AdminUser {
  const user = use(SessionContext);
  if (!user) throw new Error("useUser must be used inside <RequireSession>");
  return user;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["session"],
    queryFn: () => adminApi.me(),
    staleTime: 5 * 60_000,
  });

  const result = query.data;
  if (!result) return <ShellSkeleton />;

  if (!result.ok) {
    if (result.kind === "problem" && result.status === 401) {
      window.location.replace(
        loginUrl(window.location.pathname, window.location.search),
      );
      return null;
    }
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <Notice tone="error">
          {problemMessage(result)}{" "}
          <button
            type="button"
            className="font-semibold text-brand underline underline-offset-4"
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </Notice>
      </div>
    );
  }

  return <SessionContext value={result.data.user}>{children}</SessionContext>;
}
