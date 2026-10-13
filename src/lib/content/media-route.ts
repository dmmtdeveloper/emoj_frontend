/**
 * The `/media/{kind}/{slug}/{key}` route (src/pages/media/...): streams one
 * image of a published project or article, or of the home hero
 * (`/media/portada/inicio/{key}`), from the bucket, found by its stable key
 * (see media.ts). Only images of published content are served, so
 * unpublishing an item (or removing a hero photo) also takes its images off
 * the site.
 */
import type { MediaRef } from "../api/client";
import { contentImages, findImage, HERO_MEDIA_SLUG, isMediaKey } from "./media";
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

/** Every image the item shows; none when it is not published. */
async function imagesOf(
  kind: "proyectos" | "noticias" | "portada",
  slug: string,
  source: ContentSource,
): Promise<MediaRef[]> {
  if (kind === "portada") return (await source.findHomeHero())?.photos ?? [];
  const item =
    kind === "proyectos"
      ? await source.findProject(slug)
      : await source.findArticle(slug);
  return item ? contentImages(item) : [];
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
  const known =
    kind === "proyectos" ||
    kind === "noticias" ||
    (kind === "portada" && slug === HERO_MEDIA_SLUG);
  if (!known || !SLUG.test(slug) || !isMediaKey(key)) {
    return plain(404, "Not found");
  }

  let images: MediaRef[];
  try {
    images = await imagesOf(kind, slug, source);
  } catch (error) {
    if (error instanceof ContentFetchError) return plain(503, "Unavailable");
    throw error;
  }
  const image = findImage(images, key);
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
