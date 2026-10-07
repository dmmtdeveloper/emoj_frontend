import { describe, expect, it, vi } from "vitest";
import { loadMediaImage, mediaParams } from "../src/lib/media-image";

describe("mediaParams", () => {
  it("reads kind, slug and key from a /media address", () => {
    expect(mediaParams("/media/proyectos/canal/0123456789abcdef")).toEqual({
      kind: "proyectos",
      slug: "canal",
      key: "0123456789abcdef",
    });
  });

  it.each(["/media/proyectos/canal", "/_astro/a.jpg", "/media/a/b/c/d"])(
    "is null for %s",
    (src) => {
      expect(mediaParams(src)).toBeNull();
    },
  );
});

describe("loadMediaImage", () => {
  const src = "/media/noticias/hito/0123456789abcdef";

  it("loads the image in-process, without an HTTP round trip", async () => {
    const serve = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const result = await loadMediaImage(src, serve);
    expect(serve).toHaveBeenCalledWith({
      kind: "noticias",
      slug: "hito",
      key: "0123456789abcdef",
    });
    expect(result).toEqual({
      kind: "loaded",
      buffer: Buffer.from([1, 2, 3]),
    });
  });

  it("maps a 404 to not-found and other failures to failed", async () => {
    expect(
      await loadMediaImage(src, async () => new Response("", { status: 404 })),
    ).toEqual({ kind: "not-found" });
    expect(
      await loadMediaImage(src, async () => new Response("", { status: 503 })),
    ).toEqual({ kind: "failed" });
  });

  it("rejects an address that is not a content image", async () => {
    const serve = vi.fn();
    expect(await loadMediaImage("/media/../secret", serve)).toEqual({
      kind: "invalid-path",
    });
    expect(serve).not.toHaveBeenCalled();
  });
});
