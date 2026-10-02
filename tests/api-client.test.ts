import { describe, expect, it, vi } from "vitest";
import { createApiClient, type ContactRequest } from "../src/lib/api/client";

const body: ContactRequest = {
  name: "Ana Pérez",
  email: "ana@example.com",
  message: "Necesito cotizar un estudio de suelos.",
  service: "geotecnia",
  turnstileToken: "token",
};

function jsonResponse(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("createApiClient().submitContact", () => {
  it("POSTs the JSON body to /v1/contact on the configured origin", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(201, { id: "0b6f6f0e-1111-4c1e-8f2a-1b2c3d4e5f60" }),
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com/",
      fetch: fetchMock,
    });

    const result = await client.submitContact(body);

    expect(result).toEqual({
      ok: true,
      status: 201,
      data: { id: "0b6f6f0e-1111-4c1e-8f2a-1b2c3d4e5f60" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/v1/contact");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it("returns 422 field errors as a typed problem", async () => {
    const problem = {
      type: "about:blank",
      title: "Unprocessable Entity",
      status: 422,
      errors: [{ field: "email", message: "must be a valid email address" }],
    };
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async () => jsonResponse(422, problem),
    });

    const result = await client.submitContact(body);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== "problem")
      throw new Error("expected problem");
    expect(result.status).toBe(422);
    expect(result.problem.errors).toEqual(problem.errors);
  });

  it("exposes Retry-After on 429", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        jsonResponse(
          429,
          { type: "about:blank", title: "Too Many Requests", status: 429 },
          { "Retry-After": "120" },
        ),
    });

    const result = await client.submitContact(body);

    expect(result).toMatchObject({
      ok: false,
      kind: "problem",
      status: 429,
      retryAfter: 120,
    });
  });

  it("builds a fallback problem when the error body is not problem+json", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        new Response("<html>Bad gateway</html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
    });

    const result = await client.submitContact(body);

    expect(result).toEqual({
      ok: false,
      kind: "problem",
      status: 502,
      problem: { type: "about:blank", title: "Bad Gateway", status: 502 },
    });
  });

  it("returns a network error instead of throwing when fetch rejects", async () => {
    const failure = new TypeError("Failed to fetch");
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: async () => {
        throw failure;
      },
    });

    const result = await client.submitContact(body);

    expect(result).toEqual({ ok: false, kind: "network", error: failure });
  });
});
