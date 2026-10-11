import { describe, expect, it, vi } from "vitest";
import {
  parseChange,
  refreshPolicy,
  pathsToRefresh,
  refreshPaths,
} from "../src/lib/content/revalidation";

describe("parseChange", () => {
  it("accepts a news or project change with its slugs", () => {
    expect(parseChange({ kind: "news", slug: "hito" })).toEqual({
      kind: "news",
      slug: "hito",
      previousSlug: null,
    });
    expect(
      parseChange({ kind: "project", slug: "nuevo", previousSlug: "viejo" }),
    ).toEqual({ kind: "project", slug: "nuevo", previousSlug: "viejo" });
  });

  it.each([
    null,
    "news",
    { kind: "page", slug: "x" },
    { kind: "news", slug: "../admin" },
    { kind: "news", slug: "ok", previousSlug: "Mal Slug" },
  ])("rejects %j", (body) => {
    expect(parseChange(body)).toBeNull();
  });
});

describe("pathsToRefresh", () => {
  it("refreshes an article, the news listing pages and the sitemap", () => {
    expect(
      pathsToRefresh(
        { kind: "news", slug: "hito", previousSlug: "hito-v1" },
        2,
      ),
    ).toEqual([
      "/noticias",
      "/noticias/pagina/2",
      "/noticias/pagina/3",
      "/noticias/hito",
      "/noticias/hito-v1",
      "/sitemap-content.xml",
    ]);
  });

  it("refreshes a project, the home (featured and service photos), the listing and the services page (counts and photos)", () => {
    expect(
      pathsToRefresh(
        { kind: "project", slug: "planta", previousSlug: null },
        1,
      ),
    ).toEqual([
      "/",
      "/proyectos",
      "/servicios",
      "/proyectos/planta",
      "/sitemap-content.xml",
    ]);
  });
});

describe("refreshPaths", () => {
  it("asks for each page with the revalidation token and reports failures", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith("/b")
        ? new Response(null, { status: 500 })
        : new Response("ok"),
    );
    const result = await refreshPaths(
      ["/a", "/b"],
      "https://emoj.cl",
      "secret",
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toEqual({ refreshed: ["/a"], failed: ["/b"] });
    expect(fetchMock).toHaveBeenCalledWith(new URL("/a", "https://emoj.cl"), {
      headers: { "x-prerender-revalidate": "secret" },
    });
  });

  it("treats a 404 as refreshed (a deleted or unpublished item)", async () => {
    const result = await refreshPaths(
      ["/noticias/borrada"],
      "https://emoj.cl",
      "secret",
      (async () => new Response(null, { status: 404 })) as typeof fetch,
    );
    expect(result.failed).toEqual([]);
  });
});

describe("refreshPolicy", () => {
  it("has nothing to refresh where pages are rendered on every request", () => {
    // astro dev, and the Node server on Railway: no page cache.
    expect(refreshPolicy({ dev: true, onVercel: false, token: "" })).toBe(
      "fresh",
    );
    expect(refreshPolicy({ dev: false, onVercel: false, token: "" })).toBe(
      "fresh",
    );
    expect(refreshPolicy({ dev: false, onVercel: false, token: "t" })).toBe(
      "fresh",
    );
  });

  it("refreshes Vercel's cache with the token, and says so when it is missing", () => {
    expect(refreshPolicy({ dev: false, onVercel: true, token: "t" })).toBe(
      "refresh",
    );
    expect(refreshPolicy({ dev: false, onVercel: true, token: "" })).toBe(
      "not-configured",
    );
  });
});
