/**
 * Loading content images (`/media/...`, see src/lib/content/media.ts) for
 * Astro's image endpoint on the Node server.
 *
 * Astro's Node endpoint only reads local images from disk, and `/media/...`
 * is a route, not a file. On Vercel the generic endpoint fetches it over
 * HTTP from the same site; here it is served in-process instead
 * (src/lib/image-endpoint.ts), with no round trip through the network.
 */
export type LoadResult =
  | { kind: "loaded"; buffer: Buffer }
  | { kind: "not-found" }
  | { kind: "invalid-path" }
  | { kind: "failed" };

export interface MediaParams {
  kind: string;
  slug: string;
  key: string;
}

const MEDIA = /^\/media\/([a-z]+)\/([a-z0-9-]+)\/([0-9a-f]+)$/;

export function mediaParams(src: string): MediaParams | null {
  const match = MEDIA.exec(src);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return { kind: match[1], slug: match[2], key: match[3] };
}

export async function loadMediaImage(
  src: string,
  serve: (params: MediaParams) => Promise<Response>,
): Promise<LoadResult> {
  const params = mediaParams(src);
  if (!params) return { kind: "invalid-path" };
  try {
    const res = await serve(params);
    if (res.status === 404) return { kind: "not-found" };
    if (!res.ok) return { kind: "failed" };
    return { kind: "loaded", buffer: Buffer.from(await res.arrayBuffer()) };
  } catch {
    return { kind: "failed" };
  }
}
