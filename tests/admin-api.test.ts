import { describe, expect, it, vi } from "vitest";
import { createAdminClient } from "../src/lib/admin/api";

function jsonResponse(status: number, body: unknown, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("createAdminClient", () => {
  it("calls the same-origin /api prefix with the session cookie", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(200, {
        user: { id: "u", email: "a@b.cl", name: "A" },
        csrfToken: "t1",
      }),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    const result = await client.me();
    expect(result.ok).toBe(true);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/me");
    expect(init.credentials).toBe("same-origin");
    expect(init.method).toBe("GET");
  });

  it("remembers the CSRF token from login and sends it on writes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          user: { id: "u", email: "a@b.cl", name: "A" },
          csrfToken: "tok",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    await client.login({ email: "a@b.cl", password: "x".repeat(12) });
    await client.logout();
    const [, init] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("tok");
  });

  it("does not send a CSRF header on reads", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(200, { items: [], page: 1, pageSize: 20, total: 0 }),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.listMessages({ page: 1 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/admin/contact-messages?page=1");
    expect(new Headers(init.headers).has("X-CSRF-Token")).toBe(false);
  });

  it("forgets the CSRF token after logout", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.logout();
    expect(client.csrfToken()).toBeNull();
  });

  it("ends every session with logout-all and forgets the token", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.logoutAll();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/logout-all");
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("tok");
    expect(client.csrfToken()).toBeNull();
  });

  it("maps error statuses to problems with Retry-After", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(
        429,
        { type: "about:blank", title: "Too Many Requests", status: 429 },
        { "Retry-After": "120" },
      ),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    const result = await client.login({ email: "a@b.cl", password: "p" });
    expect(result).toMatchObject({
      ok: false,
      kind: "problem",
      status: 429,
      retryAfter: 120,
    });
  });

  it("reports network failures without throwing", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const client = createAdminClient({ baseUrl: "/api", fetch });
    const result = await client.me();
    expect(result).toMatchObject({ ok: false, kind: "network" });
  });

  it("serializes list filters and skips empty ones", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(200, { items: [], page: 1, pageSize: 1, total: 3 }),
    );
    const client = createAdminClient({ baseUrl: "/api/", fetch });
    await client.listProjects({ status: "draft", pageSize: 1 });
    await client.listNews({ q: "" });
    const urls = (fetch.mock.calls as unknown as [string][]).map(([u]) => u);
    expect(urls).toEqual([
      "/api/v1/admin/projects?status=draft&pageSize=1",
      "/api/v1/admin/news",
    ]);
  });

  it("reads, creates, updates and deletes projects with the CSRF token", async () => {
    const project = { id: "p1", title: "Canal", status: "draft" };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, project))
      .mockResolvedValueOnce(jsonResponse(201, project))
      .mockResolvedValueOnce(jsonResponse(200, project))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.getProject("p1");
    await client.createProject({ title: "Canal" });
    await client.updateProject("p1", { featured: true });
    const removed = await client.deleteProject("p1");
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
      "GET /api/v1/admin/projects/p1",
      "POST /api/v1/admin/projects",
      "PATCH /api/v1/admin/projects/p1",
      "DELETE /api/v1/admin/projects/p1",
    ]);
    expect(JSON.parse(String(calls[2]?.[1].body))).toEqual({ featured: true });
    expect(new Headers(calls[3]?.[1].headers).get("X-CSRF-Token")).toBe("tok");
    expect(removed).toMatchObject({ ok: true, data: null });
  });

  it("publishes and unpublishes a project", async () => {
    const fetch = vi.fn(async () => jsonResponse(200, { id: "p1" }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    await client.publishProject("p1");
    await client.unpublishProject("p1");
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
      "POST /api/v1/admin/projects/p1/publish",
      "POST /api/v1/admin/projects/p1/unpublish",
    ]);
  });

  it("escapes ids in paths", async () => {
    const fetch = vi.fn(async () => jsonResponse(404, { status: 404 }));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    await client.getProject("../auth/me");
    const [url] = fetch.mock.calls[0] as unknown as [string];
    expect(url).toBe("/api/v1/admin/projects/..%2Fauth%2Fme");
  });

  it("keeps the field errors of a validation problem", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(422, {
        type: "about:blank",
        title: "Unprocessable Entity",
        status: 422,
        errors: [{ field: "seo.description", message: "is required" }],
      }),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    const result = await client.publishProject("p1");
    expect(result).toMatchObject({
      ok: false,
      status: 422,
      problem: { errors: [{ field: "seo.description" }] },
    });
  });

  it("lists media and changes an image's alt text", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(200, { items: [], page: 2, pageSize: 24, total: 0 }),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    await client.listMedia({ page: 2, pageSize: 24 });
    await client.updateMedia("m1", "Planta elevadora");
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
      "GET /api/v1/admin/media?page=2&pageSize=24",
      "PATCH /api/v1/admin/media/m1",
    ]);
    expect(JSON.parse(String(calls[1]?.[1].body))).toEqual({
      alt: "Planta elevadora",
    });
  });

  it("uploads an image as multipart with its alt text and reports progress", async () => {
    const sent: {
      url?: string;
      headers: Record<string, string>;
      body?: FormData;
    } = { headers: {} };
    class FakeXhr {
      status = 0;
      responseText = "";
      upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      withCredentials = false;
      open(_method: string, url: string) {
        sent.url = url;
      }
      setRequestHeader(name: string, value: string) {
        sent.headers[name] = value;
      }
      getResponseHeader() {
        return null;
      }
      send(body: FormData) {
        sent.body = body;
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 50,
          total: 100,
        } as ProgressEvent);
        this.status = 201;
        this.responseText = JSON.stringify({ id: "m9", alt: "Obra" });
        this.onload?.();
      }
    }
    const client = createAdminClient({
      baseUrl: "/api",
      fetch: vi.fn(),
      xhr: () => new FakeXhr() as unknown as XMLHttpRequest,
    });
    client.setCsrfToken("tok");
    const progress: number[] = [];
    const file = new File(["x"], "obra.jpg", { type: "image/jpeg" });
    const result = await client.uploadMedia(file, "Obra", (p) =>
      progress.push(p),
    );
    expect(result).toMatchObject({ ok: true, data: { id: "m9" } });
    expect(sent.url).toBe("/api/v1/admin/media");
    expect(sent.headers["X-CSRF-Token"]).toBe("tok");
    expect(sent.body?.get("alt")).toBe("Obra");
    expect(sent.body?.get("file")).toBeInstanceOf(File);
    expect(progress).toEqual([0.5]);
  });

  it("maps a rejected upload to a problem and a dropped one to a network error", async () => {
    function fake(status: number, body: string, fail = false) {
      return () =>
        ({
          upload: {},
          open() {
            // Nothing to record.
          },
          setRequestHeader() {
            // Nothing to record.
          },
          getResponseHeader() {
            return null;
          },
          send() {
            const self = this as unknown as {
              status: number;
              responseText: string;
              onload?: () => void;
              onerror?: () => void;
            };
            self.status = status;
            self.responseText = body;
            if (fail) self.onerror?.();
            else self.onload?.();
          },
        }) as unknown as XMLHttpRequest;
    }
    const file = new File(["x"], "a.svg", { type: "image/svg+xml" });
    const rejected = await createAdminClient({
      baseUrl: "/api",
      xhr: fake(415, JSON.stringify({ title: "Unsupported", status: 415 })),
    }).uploadMedia(file, "a");
    expect(rejected).toMatchObject({ ok: false, kind: "problem", status: 415 });
    const dropped = await createAdminClient({
      baseUrl: "/api",
      xhr: fake(0, "", true),
    }).uploadMedia(file, "a");
    expect(dropped).toMatchObject({ ok: false, kind: "network" });
  });

  it("reads, writes, publishes and deletes news with the CSRF token", async () => {
    const article = { id: "n1", title: "Visita", status: "draft" };
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 204 })
        : jsonResponse(200, article),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.getNews("n1");
    await client.createNews({ title: "Visita" });
    await client.updateNews("n1", { body: null });
    await client.publishNews("n1");
    await client.unpublishNews("n1");
    await client.deleteNews("n1");
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
      "GET /api/v1/admin/news/n1",
      "POST /api/v1/admin/news",
      "PATCH /api/v1/admin/news/n1",
      "POST /api/v1/admin/news/n1/publish",
      "POST /api/v1/admin/news/n1/unpublish",
      "DELETE /api/v1/admin/news/n1",
    ]);
    expect(JSON.parse(String(calls[2]?.[1].body))).toEqual({ body: null });
    expect(
      calls
        .slice(1)
        .every(([, i]) => new Headers(i.headers).get("X-CSRF-Token") === "tok"),
    ).toBe(true);
  });

  it("handles data subject requests: export, erase and the audit list", async () => {
    const fetch = vi.fn(async () => jsonResponse(200, {}));
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("tok");
    await client.exportPersonData("Ana@Empresa.cl");
    await client.erasePersonData("ana@empresa.cl");
    await client.listDataRequests({ page: 2 });
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
      "POST /api/v1/admin/data-requests/export",
      "POST /api/v1/admin/data-requests/erase",
      "GET /api/v1/admin/data-requests?page=2",
    ]);
    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual({
      email: "Ana@Empresa.cl",
    });
    expect(
      calls
        .slice(0, 2)
        .every(([, i]) => new Headers(i.headers).get("X-CSRF-Token") === "tok"),
    ).toBe(true);
  });
});

describe("createAdminClient().createPreviewToken", () => {
  it("POSTs the item's type and id with the CSRF token", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(201, { token: "tk", expiresAt: "2026-10-08T23:00:00Z" }),
    );
    const client = createAdminClient({ baseUrl: "/api", fetch });
    client.setCsrfToken("csrf");
    const result = await client.createPreviewToken("news", "n-1");
    expect(result).toMatchObject({ ok: true, data: { token: "tk" } });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/admin/preview-tokens");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ type: "news", id: "n-1" });
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("csrf");
  });
});
