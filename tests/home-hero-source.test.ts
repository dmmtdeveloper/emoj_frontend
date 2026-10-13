import { describe, expect, it, vi } from "vitest";
import { createApiClient, type HomeHero } from "../src/lib/api/client";
import { mediaKey } from "../src/lib/content/media";
import { serveMedia } from "../src/lib/content/media-route";
import {
  ContentFetchError,
  createContentSource,
  type ContentSource,
} from "../src/lib/content/source";

const BASE = "https://api.example.com";

const hero: HomeHero = {
  title: "Más de 30 años innovando en consultoría",
  highlight: "innovando",
  lead: "Diseñamos soluciones.",
  primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
  photos: [
    {
      url: "https://bucket.test/media/a.webp?X-Amz-Signature=1",
      alt: "Planta",
      width: 1800,
      height: 1200,
      focusX: 30,
      focusY: 70,
    },
  ],
  updatedAt: "2026-10-12T18:00:00Z",
};

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sourceWith(response: () => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async () => response());
  const client = createApiClient({ baseUrl: BASE, fetch: fetchMock });
  return { source: createContentSource(client, BASE), fetchMock };
}

describe("findHomeHero", () => {
  it("reads GET /v1/home/hero once per source", async () => {
    const { source, fetchMock } = sourceWith(() => json(200, hero));
    expect(await source.findHomeHero()).toEqual(hero);
    await source.findHomeHero();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${BASE}/v1/home/hero`);
  });

  it("is null when the API has no hero (or predates it)", async () => {
    const { source } = sourceWith(() =>
      json(404, { type: "about:blank", title: "Not Found", status: 404 }),
    );
    expect(await source.findHomeHero()).toBeNull();
  });

  it("throws on other failures, like the rest of the content", async () => {
    const { source } = sourceWith(() =>
      json(500, { type: "about:blank", title: "Error", status: 500 }),
    );
    await expect(source.findHomeHero()).rejects.toBeInstanceOf(
      ContentFetchError,
    );
  });
});

describe("serveMedia for the home hero", () => {
  const image = () =>
    new Response(new Uint8Array([1, 2, 3]), {
      headers: { "Content-Type": "image/webp" },
    });
  const source = (found: HomeHero | null | Error) =>
    ({
      findHomeHero: vi.fn(async () => {
        if (found instanceof Error) throw found;
        return found;
      }),
    }) as unknown as ContentSource;
  const [photo] = hero.photos;
  if (!photo) throw new Error("fixture needs a photo");

  it("streams a hero photo from /media/portada/inicio/{key}", async () => {
    const fetchImage = vi.fn(async () => image());
    const res = await serveMedia(
      { kind: "portada", slug: "inicio", key: mediaKey(photo.url) },
      source(hero),
      fetchImage,
    );
    expect(res.status).toBe(200);
    expect(fetchImage).toHaveBeenCalledWith(photo.url);
  });

  it("answers 404 for another slug, an unknown key or no hero", async () => {
    const key = mediaKey(photo.url);
    for (const [params, found] of [
      [{ kind: "portada", slug: "otra", key }, hero],
      [{ kind: "portada", slug: "inicio", key: "0123456789abcdef" }, hero],
      [{ kind: "portada", slug: "inicio", key }, null],
    ] as const) {
      const res = await serveMedia(params, source(found), vi.fn());
      expect(res.status).toBe(404);
    }
  });

  it("answers 503 when the API fails", async () => {
    const res = await serveMedia(
      { kind: "portada", slug: "inicio", key: mediaKey(photo.url) },
      source(new ContentFetchError("down")),
      vi.fn(),
    );
    expect(res.status).toBe(503);
  });
});
