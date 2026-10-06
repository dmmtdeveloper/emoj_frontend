/** Content images at stable addresses (see src/lib/content/media.ts). */
import type { APIRoute } from "astro";
import { contentSource } from "../../../../lib/content";
import { serveMedia } from "../../../../lib/content/media-route";

export const prerender = false;

export const GET: APIRoute = ({ params }) =>
  serveMedia(params, contentSource());
