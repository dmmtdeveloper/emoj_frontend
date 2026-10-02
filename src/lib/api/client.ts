/**
 * Small typed client for the EMOJ API (emoj_backend).
 *
 * Types come from `schema.d.ts`, generated from the backend `openapi.yaml`
 * with `pnpm api:types`. Requests never throw: every call resolves to an
 * `ApiResult`, so callers handle success, RFC 9457 problems and network
 * failures explicitly.
 */
import type { components, operations } from "./schema";

type Schemas = components["schemas"];

export type ServiceSlug = Schemas["ServiceSlug"];
export type ContactRequest = Schemas["ContactRequest"];
export type ContactCreated = Schemas["ContactCreated"];
export type Problem = Schemas["Problem"];
export type FieldError = Schemas["FieldError"];
export type ValidationProblem = Schemas["ValidationProblem"];
export type MediaRef = Schemas["MediaRef"];
export type Seo = Schemas["Seo"];
export type ProjectSummary = Schemas["ProjectSummary"];
export type ProjectDetail = Schemas["ProjectDetail"];
export type ProjectPage = Schemas["ProjectPage"];
export type NewsSummary = Schemas["NewsSummary"];
export type NewsDetail = Schemas["NewsDetail"];
export type NewsPage = Schemas["NewsPage"];
export type TipTapDocument = Schemas["TipTapDocument"];

export type ProjectQuery = NonNullable<
  operations["listProjects"]["parameters"]["query"]
>;
export type NewsQuery = NonNullable<
  operations["listNews"]["parameters"]["query"]
>;

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

/** The API answered with an error status (body parsed as problem details). */
export interface ApiProblem {
  ok: false;
  kind: "problem";
  status: number;
  problem: Problem & { errors?: FieldError[] };
  /** Seconds to wait before retrying, from the `Retry-After` header (429). */
  retryAfter?: number;
}

/** The request never got an HTTP answer (offline, DNS, CORS, aborted). */
export interface ApiNetworkError {
  ok: false;
  kind: "network";
  error: unknown;
}

export type ApiResult<T> = ApiSuccess<T> | ApiProblem | ApiNetworkError;

export interface ApiClientOptions {
  /** API origin, e.g. `https://api.emoj.cl`. A trailing slash is ignored. */
  baseUrl: string;
  /** Injected for tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export interface ApiClient {
  submitContact(body: ContactRequest): Promise<ApiResult<ContactCreated>>;
  listProjects(query?: ProjectQuery): Promise<ApiResult<ProjectPage>>;
  getProject(slug: string): Promise<ApiResult<ProjectDetail>>;
  listNews(query?: NewsQuery): Promise<ApiResult<NewsPage>>;
  getNews(slug: string): Promise<ApiResult<NewsDetail>>;
}

/** Serialize defined query parameters, in the given order. */
function queryString(
  query: Record<string, string | number | boolean | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function isProblem(value: unknown): value is Problem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number" &&
    typeof (value as { title?: unknown }).title === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json, application/problem+json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      return { ok: false, kind: "network", error };
    }

    const payload = await readJson(response);

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

  return {
    submitContact: (body) =>
      request<ContactCreated>("POST", "/v1/contact", body),
    listProjects: (query) =>
      request<ProjectPage>("GET", `/v1/projects${queryString(query)}`),
    getProject: (slug) =>
      request<ProjectDetail>("GET", `/v1/projects/${encodeURIComponent(slug)}`),
    listNews: (query) =>
      request<NewsPage>("GET", `/v1/news${queryString(query)}`),
    getNews: (slug) =>
      request<NewsDetail>("GET", `/v1/news/${encodeURIComponent(slug)}`),
  };
}
