/**
 * Astro's image endpoint (`/_image`) on the Node server (Railway; set in
 * astro.config.mjs only off Vercel).
 *
 * Images built into the site are read from disk by Astro's own Node
 * endpoint. Content photos (`/media/...`) are a route, not files, so they
 * are loaded in-process (src/lib/media-image.ts) and resized by the same
 * sharp service. The middleware keeps every size on disk
 * (src/lib/image-cache.ts), so each one is resized once per deploy.
 *
 * Under `astro dev` the Node disk loader must not run: it looks for the
 * built `server` folder above its own module and loops forever when there
 * is none, which freezes the dev server on the first photo. Dev uses
 * Astro's own dev loader instead (imported lazily, so the build drops it).
 */
import type { APIRoute } from "astro";
import { GET as diskImage } from "astro/assets/endpoint/node";
import { handleImageRequest } from "astro/assets/endpoint/shared";
import { contentSource } from "./content";
import { serveMedia } from "./content/media-route";
import { loadMediaImage } from "./media-image";

export const GET: APIRoute = async (context) => {
  const href = new URL(context.request.url).searchParams.get("href") ?? "";
  if (!href.startsWith("/media/")) {
    if (import.meta.env.DEV) {
      const { GET: devImage } = await import("astro/assets/endpoint/dev");
      return devImage(context);
    }
    return diskImage(context);
  }
  try {
    return await handleImageRequest({
      request: context.request,
      logger: context.logger,
      loadLocalImage: (src) =>
        loadMediaImage(src, (params) => serveMedia(params, contentSource())),
    });
  } catch (error) {
    context.logger.error(`Could not process image request: ${String(error)}`);
    return new Response("Internal Server Error", { status: 500 });
  }
};
