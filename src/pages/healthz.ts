/**
 * Liveness check for the Node server (Railway healthcheck and the image's
 * HEALTHCHECK). Answers without calling the API, so a deploy of the site
 * does not fail while the API restarts.
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () =>
  new Response("ok", {
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
