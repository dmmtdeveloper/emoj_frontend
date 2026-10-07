/**
 * - Image responses get the CDN cache header on Vercel (src/lib/cdn-cache.ts)
 *   and are kept on disk by the Node server elsewhere (src/lib/image-cache.ts).
 * - A page rendered on demand that cannot reach the API answers 503 with a
 *   short notice and is never cached, so the cache keeps the last good
 *   version instead of an error (src/lib/content/source.ts).
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineMiddleware } from "astro:middleware";
import { edgeCacheHeader } from "./lib/cdn-cache";
import {
  createImageCache,
  isCachedImagePath,
  serveCached,
} from "./lib/image-cache";
import { ContentFetchError } from "./lib/content/source";
import { unavailablePage } from "./lib/unavailable";

const MEGABYTE = 1024 * 1024;

/** Only the Node server needs it: Vercel's CDN keeps the images there. */
const imageCache =
  import.meta.env.DEV || process.env["VERCEL"] === "1"
    ? null
    : createImageCache({
        dir: process.env["IMAGE_CACHE_DIR"] || join(tmpdir(), "emoj-images"),
        maxBytes: (Number(process.env["IMAGE_CACHE_MAX_MB"]) || 512) * MEGABYTE,
      });

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  if (
    imageCache &&
    context.request.method === "GET" &&
    isCachedImagePath(pathname)
  ) {
    return serveCached(imageCache, pathname + search, () => next());
  }

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    if (!(error instanceof ContentFetchError)) throw error;
    console.error(error.message);
    return new Response(unavailablePage(), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }
  const value = edgeCacheHeader(pathname, response.status);
  if (value) response.headers.set("Vercel-CDN-Cache-Control", value);
  return response;
});
