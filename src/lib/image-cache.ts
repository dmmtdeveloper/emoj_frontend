/**
 * Disk cache for resized images on the Node server (Railway).
 *
 * On Vercel the CDN keeps each image size (src/lib/cdn-cache.ts). The Node
 * server has no CDN in front, so without this every visitor would make
 * sharp resize the same photo again. `/_image` and `/media/...` answer for
 * good (the address changes when the image does), so an entry never goes
 * stale: it is only dropped, oldest first, to stay under `maxBytes`. The
 * cache starts empty on each deploy and fills as pages are visited.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function isCachedImagePath(pathname: string): boolean {
  return pathname === "/_image" || pathname.startsWith("/media/");
}

export interface CachedImage {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
}

export interface ImageCache {
  get(url: string): Promise<CachedImage | null>;
  put(url: string, body: Uint8Array, contentType: string): Promise<void>;
}

const SEPARATOR = "\n";

export function createImageCache(options: {
  dir: string;
  maxBytes: number;
}): ImageCache {
  const { dir, maxBytes } = options;
  // Insertion order is age order: the first entry is the oldest.
  const sizes = new Map<string, number>();
  let total = 0;

  const fileFor = (url: string) =>
    join(dir, createHash("sha256").update(url).digest("hex"));

  async function drop(file: string) {
    total -= sizes.get(file) ?? 0;
    sizes.delete(file);
    await rm(file, { force: true });
  }

  return {
    async get(url) {
      const file = fileFor(url);
      if (!sizes.has(file)) return null;
      try {
        const raw = await readFile(file);
        const cut = raw.indexOf(SEPARATOR);
        if (cut < 0) throw new Error("corrupt entry");
        return {
          contentType: raw.subarray(0, cut).toString("utf8"),
          body: new Uint8Array(raw.subarray(cut + 1)),
        };
      } catch {
        await drop(file);
        return null;
      }
    },

    async put(url, body, contentType) {
      const header = Buffer.from(contentType + SEPARATOR, "utf8");
      const size = header.length + body.length;
      if (size > maxBytes) return;
      const file = fileFor(url);
      if (sizes.has(file)) await drop(file);
      for (const oldest of sizes.keys()) {
        if (total + size <= maxBytes) break;
        await drop(oldest);
      }
      try {
        await mkdir(dir, { recursive: true });
        await writeFile(file, Buffer.concat([header, body]));
        sizes.set(file, size);
        total += size;
      } catch {
        // A full or read-only disk only means no caching.
      }
    },
  };
}

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * The cached image for `url`, or `load()` it and keep it when it succeeds.
 * Errors are never kept, so a failed resize is tried again next time.
 */
export async function serveCached(
  cache: ImageCache,
  url: string,
  load: () => Promise<Response>,
): Promise<Response> {
  const hit = await cache.get(url);
  if (hit) {
    return new Response(hit.body, {
      status: 200,
      headers: { "Content-Type": hit.contentType, "Cache-Control": IMMUTABLE },
    });
  }
  const response = await load();
  if (response.status !== 200) return response;
  const body = new Uint8Array(await response.arrayBuffer());
  const contentType =
    response.headers.get("Content-Type") ?? "application/octet-stream";
  await cache.put(url, body, contentType);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", IMMUTABLE);
  return new Response(body, { status: 200, headers });
}
