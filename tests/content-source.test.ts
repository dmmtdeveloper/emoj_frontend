import { describe, expect, it, vi } from "vitest";
import {
  createApiClient,
  type ProjectDetail,
  type ProjectSummary,
} from "../src/lib/api/client";
import {
  ContentFetchError,
  createContentSource,
  PAGE_SIZE,
} from "../src/lib/content/source";

const BASE = "https://api.example.com";

function project(n: number): ProjectSummary {
  return {
    id: `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`,
    slug: `proyecto-${n}`,
    title: `Proyecto ${n}`,
    client: "",
    location: "Quilpué",
    region: "Región de Valparaíso",
    services: ["obras-sanitarias"],
    summary: "Resumen",
    featured: n === 1,
    publishedAt: "2026-09-15T13:30:00Z",
  };
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fake API serving `total` projects, paginated like the real one. */
function fakeApi(total: number) {
  const all = Array.from({ length: total }, (_, i) => project(i + 1));
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/projects") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const size = Number(url.searchParams.get("pageSize") ?? "12");
      let items = all;
      if (url.searchParams.get("featured") === "true") {
        items = items.filter((p) => p.featured);
      }
      return json(200, {
        items: items.slice((page - 1) * size, page * size),
        page,
        pageSize: size,
        total: items.length,
      });
    }
    if (url.pathname === "/v1/news") {
      return json(200, { items: [], page: 1, pageSize: 50, total: 0 });
    }
    const slug = url.pathname.split("/").pop();
    const found = all.find((p) => p.slug === slug);
    if (!found) {
      return json(404, {
        type: "about:blank",
        title: "Not Found",
        status: 404,
      });
    }
    const detail: ProjectDetail = {
      ...found,
      challenge: "",
      solution: "",
      result: "",
      gallery: [],
      seo: { title: found.title, description: "Desc" },
    };
    return json(200, detail);
  });
  const source = createContentSource(
    createApiClient({ baseUrl: BASE, fetch: fetchMock }),
    BASE,
  );
  return { fetchMock, source };
}

describe("createContentSource", () => {
  it("collects every page of published projects", async () => {
    const { source, fetchMock } = fakeApi(PAGE_SIZE * 2 + 3);

    const projects = await source.getProjects();

    expect(projects).toHaveLength(PAGE_SIZE * 2 + 3);
    expect(projects.at(-1)?.slug).toBe(`proyecto-${PAGE_SIZE * 2 + 3}`);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `page=1&pageSize=${PAGE_SIZE}`,
    );
  });

  it("returns an empty list for an empty API (valid empty state)", async () => {
    const { source, fetchMock } = fakeApi(0);
    await expect(source.getProjects()).resolves.toEqual([]);
    await expect(source.getNews()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("memoizes listings so a build fetches each one once", async () => {
    const { source, fetchMock } = fakeApi(3);
    await Promise.all([source.getProjects(), source.getProjects()]);
    await source.getProjects();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks the API for featured projects only", async () => {
    const { source, fetchMock } = fakeApi(5);
    const featured = await source.getFeaturedProjects(3);
    expect(featured.map((p) => p.slug)).toEqual(["proyecto-1"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${BASE}/v1/projects?featured=true&page=1&pageSize=3`,
    );
  });

  it("loads a project by slug", async () => {
    const { source } = fakeApi(2);
    const detail = await source.getProject("proyecto-2");
    expect(detail.title).toBe("Proyecto 2");
  });

  it("finds a project by slug, or null when the API has no such project", async () => {
    const { source } = fakeApi(2);
    await expect(source.findProject("proyecto-1")).resolves.toMatchObject({
      title: "Proyecto 1",
    });
    await expect(source.findProject("missing")).resolves.toBeNull();
  });

  it("finds an article by slug, or null when it does not exist", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/v1/news/hito")
        ? json(200, { slug: "hito", title: "Hito" })
        : json(404, { type: "about:blank", title: "Not Found", status: 404 }),
    );
    const source = createContentSource(
      createApiClient({ baseUrl: BASE, fetch: fetchMock }),
      BASE,
    );
    await expect(source.findArticle("hito")).resolves.toMatchObject({
      title: "Hito",
    });
    await expect(source.findArticle("otro")).resolves.toBeNull();
  });

  it("stops at an inconsistent API instead of looping forever", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(200, { items: [], page: 1, pageSize: PAGE_SIZE, total: 999 }),
    );
    const source = createContentSource(
      createApiClient({ baseUrl: BASE, fetch: fetchMock }),
      BASE,
    );
    await expect(source.getProjects()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("createContentSource failures fail the build", () => {
  it("throws a ContentFetchError with the status and request id on an API error", async () => {
    const source = createContentSource(
      createApiClient({
        baseUrl: BASE,
        fetch: async () =>
          json(500, {
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            request_id: "req-123",
          }),
      }),
      BASE,
    );

    const error = await source.getProjects().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentFetchError);
    const message = (error as Error).message;
    expect(message).toContain("projects");
    expect(message).toContain(BASE);
    expect(message).toContain("HTTP 500 Internal Server Error");
    expect(message).toContain("req-123");
    expect(message).toContain("PUBLIC_API_URL");
  });

  it("throws when the API is unreachable", async () => {
    const source = createContentSource(
      createApiClient({
        baseUrl: BASE,
        fetch: async () => {
          throw new TypeError("fetch failed");
        },
      }),
      BASE,
    );
    await expect(source.getNews()).rejects.toThrow(
      /news.*unreachable.*fetch failed/s,
    );
  });

  it("throws when a project listed by the API cannot be loaded", async () => {
    const { source } = fakeApi(1);
    await expect(source.getProject("missing")).rejects.toThrow(
      /project "missing".*HTTP 404/s,
    );
  });

  it("still throws on API errors other than 404 when finding by slug", async () => {
    const source = createContentSource(
      createApiClient({
        baseUrl: BASE,
        fetch: async () =>
          json(503, { type: "about:blank", title: "Unavailable", status: 503 }),
      }),
      BASE,
    );
    await expect(source.findProject("x")).rejects.toBeInstanceOf(
      ContentFetchError,
    );
  });

  it("throws when the API answers 200 with a malformed page", async () => {
    const source = createContentSource(
      createApiClient({
        baseUrl: BASE,
        fetch: async () => json(200, { unexpected: true }),
      }),
      BASE,
    );
    await expect(source.getProjects()).rejects.toThrow(/unexpected response/);
  });
});
