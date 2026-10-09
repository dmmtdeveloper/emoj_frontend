/**
 * The site's /preview page (src/pages/preview.astro): the panel creates a
 * 15-minute token for a project or article, drafts included, and opens
 * /preview?token=… in a new tab. The page shows the item as its public page
 * would, never cached and out of search engines.
 */
import type {
  ApiResult,
  NewsDetail,
  Preview,
  ProjectDetail,
} from "../api/client";

/** Same limit as the API's path parameter. */
const MAX_TOKEN = 512;

export type PreviewResult =
  | { kind: "project"; project: ProjectDetail }
  | { kind: "news"; news: NewsDetail }
  /** Missing, malformed, forged or expired token. */
  | { kind: "expired" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

/**
 * A preview is never cached (each token is a different draft) and never
 * indexed. Set on /preview and again on the page it rewrites to, because a
 * rewrite answers with that page's own headers.
 */
export function setPreviewHeaders(headers: Headers): void {
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
}

export function previewPath(token: string): string {
  return `/preview?token=${encodeURIComponent(token)}`;
}

export async function loadPreview(
  token: string | null,
  getPreview: (token: string) => Promise<ApiResult<Preview>>,
): Promise<PreviewResult> {
  if (!token || token.length > MAX_TOKEN) return { kind: "expired" };
  const result = await getPreview(token);
  if (!result.ok) {
    if (result.kind === "problem" && result.status === 401) {
      return { kind: "expired" };
    }
    if (result.kind === "problem" && result.status === 404) {
      return { kind: "not-found" };
    }
    return { kind: "unavailable" };
  }
  const { type, project, news } = result.data;
  if (type === "project" && project) return { kind: "project", project };
  if (type === "news" && news) return { kind: "news", news };
  return { kind: "unavailable" };
}
