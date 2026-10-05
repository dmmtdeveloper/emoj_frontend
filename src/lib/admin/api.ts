/**
 * Typed client for the admin side of the EMOJ API, used by the React island
 * under /admin.
 *
 * Requests go to the same-origin `/api` prefix: Vercel rewrites `/api/*` to
 * the API (vercel.ts) and the Astro dev server proxies it (astro.config.mjs),
 * so the session cookie is first-party and never readable by JavaScript
 * (HttpOnly). The CSRF token returned by login and `/v1/auth/me` is kept in
 * memory only and sent in `X-CSRF-Token` on every state-changing request.
 * Like the public client, calls never throw: they resolve to an `ApiResult`.
 */
import {
  type ApiProblem,
  type ApiResult,
  isProblem,
  parseRetryAfter,
  readJson,
} from "../api/client";
import type { components, operations } from "../api/schema";

type Schemas = components["schemas"];

export type AdminUser = Schemas["User"];
export type AdminSession = Schemas["Session"];
export type LoginRequest = Schemas["LoginRequest"];
export type AdminProjectPage = Schemas["AdminProjectPage"];
export type AdminNewsPage = Schemas["AdminNewsPage"];
export type ContactMessage = Schemas["ContactMessage"];
export type ContactMessagePage = Schemas["ContactMessagePage"];

export type AdminListQuery = NonNullable<
  operations["adminListProjects"]["parameters"]["query"]
>;
export type MessagesQuery = NonNullable<
  operations["adminListContactMessages"]["parameters"]["query"]
>;

export const ADMIN_API_BASE = "/api";
export const CSRF_HEADER = "X-CSRF-Token";

export interface AdminClientOptions {
  /** Same-origin prefix that reaches the API (`/api`). */
  baseUrl: string;
  /** Injected for tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export interface AdminClient {
  me(): Promise<ApiResult<AdminSession>>;
  login(body: LoginRequest): Promise<ApiResult<AdminSession>>;
  logout(): Promise<ApiResult<null>>;
  /** Ends every session of the user (all devices). */
  logoutAll(): Promise<ApiResult<null>>;
  forgotPassword(email: string): Promise<ApiResult<null>>;
  resetPassword(token: string, password: string): Promise<ApiResult<null>>;
  listProjects(query?: AdminListQuery): Promise<ApiResult<AdminProjectPage>>;
  listNews(query?: AdminListQuery): Promise<ApiResult<AdminNewsPage>>;
  listMessages(query?: MessagesQuery): Promise<ApiResult<ContactMessagePage>>;
  /** Current CSRF token, or null when signed out. */
  csrfToken(): string | null;
  setCsrfToken(token: string | null): void;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** Query string from defined, non-empty values, in the given order. */
function queryString(
  query: Record<string, string | number | boolean | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createAdminClient(options: AdminClientOptions): AdminClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let csrf: string | null = null;

  async function request<T>(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    const headers = new Headers({
      Accept: "application/json, application/problem+json",
    });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (method !== "GET" && csrf) headers.set(CSRF_HEADER, csrf);

    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      return { ok: false, kind: "network", error };
    }

    const payload = response.status === 204 ? null : await readJson(response);
    if (response.ok) {
      return { ok: true, status: response.status, data: payload as T };
    }
    const problem: ApiProblem["problem"] = isProblem(payload)
      ? payload
      : {
          type: "about:blank",
          title: response.statusText || "Error",
          status: response.status,
        };
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    return {
      ok: false,
      kind: "problem",
      status: response.status,
      problem,
      ...(retryAfter === undefined ? {} : { retryAfter }),
    };
  }

  /** Keeps the CSRF token of a fresh session. */
  async function session(
    pending: Promise<ApiResult<AdminSession>>,
  ): Promise<ApiResult<AdminSession>> {
    const result = await pending;
    if (result.ok) csrf = result.data.csrfToken;
    else if (result.kind === "problem" && result.status === 401) csrf = null;
    return result;
  }

  return {
    me: () => session(request<AdminSession>("GET", "/v1/auth/me")),
    login: (body) =>
      session(request<AdminSession>("POST", "/v1/auth/login", body)),
    logout: async () => {
      const result = await request<null>("POST", "/v1/auth/logout");
      csrf = null;
      return result;
    },
    logoutAll: async () => {
      const result = await request<null>("POST", "/v1/auth/logout-all");
      csrf = null;
      return result;
    },
    forgotPassword: (email) =>
      request<null>("POST", "/v1/auth/password/forgot", { email }),
    resetPassword: (token, password) =>
      request<null>("POST", "/v1/auth/password/reset", { token, password }),
    listProjects: (query) =>
      request<AdminProjectPage>(
        "GET",
        `/v1/admin/projects${queryString(query)}`,
      ),
    listNews: (query) =>
      request<AdminNewsPage>("GET", `/v1/admin/news${queryString(query)}`),
    listMessages: (query) =>
      request<ContactMessagePage>(
        "GET",
        `/v1/admin/contact-messages${queryString(query)}`,
      ),
    csrfToken: () => csrf,
    setCsrfToken: (token) => {
      csrf = token;
    },
  };
}
