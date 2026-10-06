/**
 * - Image responses get the CDN cache header (src/lib/cdn-cache.ts).
 * - A page rendered on demand that cannot reach the API answers 503 with a
 *   short notice and is never cached, so the cache keeps the last good
 *   version instead of an error (src/lib/content/source.ts).
 */
import { defineMiddleware } from "astro:middleware";
import { edgeCacheHeader } from "./lib/cdn-cache";
import { ContentFetchError } from "./lib/content/source";
import { unavailablePage } from "./lib/unavailable";

export const onRequest = defineMiddleware(async (context, next) => {
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
  const value = edgeCacheHeader(context.url.pathname, response.status);
  if (value) response.headers.set("Vercel-CDN-Cache-Control", value);
  return response;
});
