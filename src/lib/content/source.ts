/**
 * Build-time content from the EMOJ API (projects and news).
 *
 * Policy: an API error or an unreachable API throws a `ContentFetchError`,
 * which fails `astro build`, so a broken API never publishes a silently
 * empty site. A valid empty list is fine: pages render their empty states.
 */
import type {
  ApiClient,
  ApiResult,
  NewsDetail,
  NewsSummary,
  ProjectDetail,
  ProjectSummary,
} from "../api/client";

/** Items per request when collecting a full listing (the API maximum). */
export const PAGE_SIZE = 50;

/** Hard stop for pagination, far above any realistic catalog. */
const MAX_PAGES = 100;

export class ContentFetchError extends Error {
  override name = "ContentFetchError";
}

export interface ContentSource {
  /** Every published project, newest first. */
  getProjects(): Promise<ProjectSummary[]>;
  /** Up to `limit` featured projects, newest first. */
  getFeaturedProjects(limit?: number): Promise<ProjectSummary[]>;
  getProject(slug: string): Promise<ProjectDetail>;
  /** Every published article, newest first. */
  getNews(): Promise<NewsSummary[]>;
  getArticle(slug: string): Promise<NewsDetail>;
}

interface Page<T> {
  items: T[];
  total: number;
}

function describeFailure(result: Exclude<ApiResult<unknown>, { ok: true }>) {
  if (result.kind === "network") {
    const reason =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    return `the API is unreachable (${reason})`;
  }
  const { problem, status } = result;
  const requestId =
    typeof problem.request_id === "string" && problem.request_id
      ? ` (request_id ${problem.request_id})`
      : "";
  return `HTTP ${status} ${problem.title}${requestId}`;
}

function fail(what: string, baseUrl: string, detail: string): never {
  throw new ContentFetchError(
    `Could not load ${what} from the EMOJ API at ${baseUrl}: ${detail}. ` +
      "The build stops so the site is never published with missing content; " +
      "check PUBLIC_API_URL and that the API is up.",
  );
}

function unwrap<T>(result: ApiResult<T>, what: string, baseUrl: string): T {
  if (!result.ok) fail(what, baseUrl, describeFailure(result));
  return result.data;
}

function isPage<T>(value: unknown): value is Page<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Page<T>).items) &&
    typeof (value as Page<T>).total === "number"
  );
}

/** Request pages until `total` items are collected (or a page is empty). */
async function collectAll<T>(
  load: (page: number) => Promise<ApiResult<Page<T>>>,
  what: string,
  baseUrl: string,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = unwrap(await load(page), what, baseUrl);
    if (!isPage<T>(data)) fail(what, baseUrl, "unexpected response shape");
    items.push(...data.items);
    if (data.items.length === 0 || items.length >= data.total) break;
  }
  return items;
}

/** Memoize an async thunk so concurrent and later calls share one request. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => (promise ??= load());
}

export function createContentSource(
  client: ApiClient,
  baseUrl: string,
): ContentSource {
  const getProjects = once(() =>
    collectAll(
      (page) => client.listProjects({ page, pageSize: PAGE_SIZE }),
      "projects",
      baseUrl,
    ),
  );
  const getNews = once(() =>
    collectAll(
      (page) => client.listNews({ page, pageSize: PAGE_SIZE }),
      "news",
      baseUrl,
    ),
  );
  const projects = new Map<string, Promise<ProjectDetail>>();
  const articles = new Map<string, Promise<NewsDetail>>();

  return {
    getProjects,
    getNews,
    async getFeaturedProjects(limit = 3) {
      const data = unwrap(
        await client.listProjects({ featured: true, page: 1, pageSize: limit }),
        "featured projects",
        baseUrl,
      );
      if (!isPage<ProjectSummary>(data)) {
        fail("featured projects", baseUrl, "unexpected response shape");
      }
      return data.items;
    },
    getProject(slug) {
      let promise = projects.get(slug);
      if (!promise) {
        promise = client
          .getProject(slug)
          .then((r) => unwrap(r, `project "${slug}"`, baseUrl));
        projects.set(slug, promise);
      }
      return promise;
    },
    getArticle(slug) {
      let promise = articles.get(slug);
      if (!promise) {
        promise = client
          .getNews(slug)
          .then((r) => unwrap(r, `article "${slug}"`, baseUrl));
        articles.set(slug, promise);
      }
      return promise;
    },
  };
}
