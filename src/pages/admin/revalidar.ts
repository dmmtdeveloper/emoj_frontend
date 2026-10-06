/**
 * POST /admin/revalidar — the panel reports a content change and the pages
 * that show it are rendered again and cached (src/lib/content/revalidation.ts).
 *
 * Only a signed-in editor may ask: the session cookie is checked against the
 * API (/v1/auth/me), and the request must come from this site. Answers:
 * 200 {refreshed, failed}, 401, 403, 400, or 503 {reason: "not-configured"}
 * while REVALIDATE_TOKEN is missing (the panel then says the change shows in
 * a few minutes, when the rebuild started by the API finishes).
 */
import type { APIRoute } from "astro";
import { contentSource } from "../../lib/content";
import { NEWS_PER_PAGE } from "../../lib/content/format";
import {
  parseChange,
  pathsToRefresh,
  refreshPaths,
} from "../../lib/content/revalidation";
import { API_URL } from "../../lib/env";

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function signedIn(cookie: string | null): Promise<boolean> {
  if (!cookie) return false;
  try {
    const res = await fetch(new URL("/v1/auth/me", API_URL), {
      headers: { Cookie: cookie, Accept: "application/json" },
    });
    await res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get("Origin") !== url.origin) {
    return json(403, { reason: "origin" });
  }
  const change = parseChange(await request.json().catch(() => null));
  if (!change) return json(400, { reason: "invalid" });
  if (!(await signedIn(request.headers.get("Cookie")))) {
    return json(401, { reason: "session" });
  }

  const token = process.env["REVALIDATE_TOKEN"];
  if (!token) {
    // Without a cache (astro dev) every request is already fresh.
    return import.meta.env.DEV
      ? json(200, { refreshed: [], failed: [] })
      : json(503, { reason: "not-configured" });
  }

  const newsPages =
    change.kind === "news"
      ? Math.ceil((await contentSource().getNews()).length / NEWS_PER_PAGE)
      : 0;
  const result = await refreshPaths(
    pathsToRefresh(change, newsPages),
    url.origin,
    token,
  );
  return json(200, result);
};
