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
});
