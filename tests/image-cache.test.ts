import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createImageCache,
  isCachedImagePath,
  serveCached,
} from "../src/lib/image-cache";

describe("isCachedImagePath", () => {
  it.each([
    ["/_image", true],
    ["/media/proyectos/canal/0123456789abcdef", true],
    ["/", false],
    ["/proyectos/canal", false],
    ["/_astro/app.js", false],
  ])("%s -> %s", (path, expected) => {
    expect(isCachedImagePath(path)).toBe(expected);
  });
});

describe("createImageCache", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "image-cache-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const bytes = (n: number, fill = 1) => new Uint8Array(n).fill(fill);

  it("returns what was stored under the same URL, with its type", async () => {
    const cache = createImageCache({ dir, maxBytes: 1000 });
    expect(await cache.get("/_image?href=a&w=400")).toBeNull();
    await cache.put("/_image?href=a&w=400", bytes(10), "image/webp");
    const hit = await cache.get("/_image?href=a&w=400");
    expect(hit?.contentType).toBe("image/webp");
    expect(hit?.body).toEqual(bytes(10));
    expect(await cache.get("/_image?href=a&w=800")).toBeNull();
  });

  it("drops the oldest entries to stay under its size limit", async () => {
    // Each entry is its 10 bytes plus the stored type ("image/webp\n").
    const cache = createImageCache({ dir, maxBytes: 50 });
    await cache.put("/a", bytes(10, 1), "image/webp");
    await cache.put("/b", bytes(10, 2), "image/webp");
    await cache.put("/c", bytes(10, 3), "image/webp");
    expect(await cache.get("/a")).toBeNull();
    expect((await cache.get("/b"))?.body).toEqual(bytes(10, 2));
    expect((await cache.get("/c"))?.body).toEqual(bytes(10, 3));
    expect((await readdir(dir)).length).toBe(2);
  });

  it("never stores an entry larger than the whole cache", async () => {
    const cache = createImageCache({ dir, maxBytes: 5 });
    await cache.put("/big", bytes(10), "image/webp");
    expect(await cache.get("/big")).toBeNull();
  });

  it("treats an unreadable entry as a miss", async () => {
    const cache = createImageCache({ dir, maxBytes: 100 });
    await cache.put("/a", bytes(4), "image/webp");
    await rm(dir, { recursive: true, force: true });
    expect(await cache.get("/a")).toBeNull();
  });
});

describe("serveCached", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "image-cache-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const image = (status = 200) =>
    new Response(new Uint8Array([7, 7, 7]), {
      status,
      headers: { "Content-Type": "image/avif" },
    });

  it("resizes once: later requests for the same address come from disk", async () => {
    const cache = createImageCache({ dir, maxBytes: 1000 });
    const load = vi.fn(async () => image());

    const first = await serveCached(cache, "/_image?href=x&w=400", load);
    expect(first.status).toBe(200);
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(
      new Uint8Array([7, 7, 7]),
    );

    const second = await serveCached(cache, "/_image?href=x&w=400", load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(second.headers.get("Content-Type")).toBe("image/avif");
    expect(second.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(
      new Uint8Array([7, 7, 7]),
    );
  });

  it("never keeps an error", async () => {
    const cache = createImageCache({ dir, maxBytes: 1000 });
    const load = vi.fn(async () => image(503));
    expect((await serveCached(cache, "/media/a", load)).status).toBe(503);
    await serveCached(cache, "/media/a", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
