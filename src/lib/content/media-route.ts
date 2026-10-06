/**
 * The `/media/{kind}/{slug}/{key}` route (src/pages/media/...): streams one
 * image of a published project or article from the bucket, found by its
 * stable key (see media.ts). Only images of published content are served,
 * so unpublishing an item also takes its images off the site.
 */
import { contentImages, findImage, isMediaKey } from "./media";
import { ContentFetchError, type ContentSource } from "./source";

/** The key changes with the image, so a response never goes stale. */
export const IMMUTABLE = "public, max-age=31536000, immutable";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function plain(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function serveMedia(
  params: {
    kind?: string | undefined;
    slug?: string | undefined;
    key?: string | undefined;
  },
  source: ContentSource,
  fetchImage: (url: string) => Promise<Response> = (url) => fetch(url),
): Promise<Response> {
  const { kind, slug = "", key = "" } = params;
  if (
    (kind !== "proyectos" && kind !== "noticias") ||
    !SLUG.test(slug) ||
    !isMediaKey(key)
  ) {
    return plain(404, "Not found");
  }

  let item;
  try {
    item =
      kind === "proyectos"
        ? await source.findProject(slug)
        : await source.findArticle(slug);
  } catch (error) {
    if (error instanceof ContentFetchError) return plain(503, "Unavailable");
    throw error;
  }
  const image = item ? findImage(contentImages(item), key) : undefined;
  if (!image) return plain(404, "Not found");

  let upstream: Response;
  try {
    upstream = await fetchImage(image.url);
  } catch {
    return plain(503, "Unavailable");
  }
  if (!upstream.ok || !upstream.body) return plain(503, "Unavailable");

  const headers = new Headers({
    "Content-Type":
      upstream.headers.get("Content-Type") ?? "application/octet-stream",
    "Cache-Control": IMMUTABLE,
  });
  const length = upstream.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
