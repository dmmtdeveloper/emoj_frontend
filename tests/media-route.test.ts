import { describe, expect, it, vi } from "vitest";
import type { MediaRef, ProjectDetail } from "../src/lib/api/client";
import { mediaKey } from "../src/lib/content/media";
import { serveMedia } from "../src/lib/content/media-route";
import {
  ContentFetchError,
  type ContentSource,
} from "../src/lib/content/source";

const cover: MediaRef = {
  url: "https://bucket.t3.storageapi.dev/media/cover.jpg?X-Amz-Signature=a",
  alt: "Portada",
  width: 1600,
  height: 900,
};

function source(found: Partial<ProjectDetail> | null | Error): ContentSource {
  const find = vi.fn(async () => {
    if (found instanceof Error) throw found;
    return found === null
      ? null
      : ({
          seo: { title: "T", description: "D" },
          gallery: [],
          ...found,
        } as ProjectDetail);
  });
  return { findProject: find, findArticle: find } as unknown as ContentSource;
}

const image = () =>
  new Response(new Uint8Array([1, 2, 3]), {
    headers: { "Content-Type": "image/jpeg" },
  });

describe("serveMedia", () => {
  it("streams the image of a published item with long-lived cache headers", async () => {
    const fetchImage = vi.fn(async () => image());
    const res = await serveMedia(
      { kind: "proyectos", slug: "planta", key: mediaKey(cover.url) },
      source({ cover }),
      fetchImage,
    );
    expect(res.status).toBe(200);
    expect(fetchImage).toHaveBeenCalledWith(cover.url);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it.each([
    [{ kind: "otros", slug: "planta", key: "0".repeat(16) }],
    [{ kind: "proyectos", slug: "../x", key: "0".repeat(16) }],
    [{ kind: "proyectos", slug: "planta", key: "nope" }],
  ])("answers 404 to a malformed address %j", async (params) => {
    const res = await serveMedia(params, source({ cover }), vi.fn());
    expect(res.status).toBe(404);
  });

  it("answers 404 when the item is not published or has no such image", async () => {
    const key = mediaKey(cover.url);
    const gone = await serveMedia(
      { kind: "noticias", slug: "x", key },
      source(null),
      vi.fn(),
    );
    const other = await serveMedia(
      { kind: "noticias", slug: "x", key: "f".repeat(16) },
      source({ cover }),
      vi.fn(),
    );
    expect(gone.status).toBe(404);
    expect(other.status).toBe(404);
    expect(gone.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers 503 without caching when the API or the bucket fails", async () => {
    const key = mediaKey(cover.url);
    const api = await serveMedia(
      { kind: "proyectos", slug: "planta", key },
      source(new ContentFetchError("down")),
      vi.fn(),
    );
    const bucket = await serveMedia(
      { kind: "proyectos", slug: "planta", key },
      source({ cover }),
      async () => new Response(null, { status: 403 }),
    );
    expect(api.status).toBe(503);
    expect(bucket.status).toBe(503);
    expect(bucket.headers.get("Cache-Control")).toBe("no-store");
  });
});
