/**
 * Stable addresses for content images.
 *
 * The API returns presigned image URLs that expire (6 hours by default), so
 * pages rendered on demand and kept in cache must not point at them. Pages
 * use `/media/{kind}/{slug}/{key}` instead (src/pages/media/...): the route
 * looks the image up in that published item and streams it, and `<Image>`
 * resizes it through Astro's image endpoint. The key is a hash of the
 * object's path, which stays the same across presigned URLs and changes
 * when the image changes, so responses can be cached for good.
 */
import { createHash } from "node:crypto";
import type { MediaRef } from "../api/client";

export type MediaKind = "proyectos" | "noticias";

const KEY_LENGTH = 16;

export function mediaKey(url: string): string {
  const { pathname } = new URL(url);
  return createHash("sha256")
    .update(pathname)
    .digest("hex")
    .slice(0, KEY_LENGTH);
}

export function isMediaKey(value: string): boolean {
  return new RegExp(`^[0-9a-f]{${KEY_LENGTH}}$`).test(value);
}

export function mediaPath(kind: MediaKind, slug: string, image: MediaRef) {
  return `/media/${kind}/${slug}/${mediaKey(image.url)}`;
}

interface WithImages {
  cover?: MediaRef | undefined;
  gallery?: readonly MediaRef[] | undefined;
  seo: { title?: string; description?: string; ogImage?: MediaRef | undefined };
}

/** Every image a published project or article shows. */
export function contentImages(item: WithImages): MediaRef[] {
  return [
    ...(item.cover ? [item.cover] : []),
    ...(item.gallery ?? []),
    ...(item.seo.ogImage ? [item.seo.ogImage] : []),
  ];
}

export function findImage(
  images: readonly MediaRef[],
  key: string,
): MediaRef | undefined {
  return images.find((image) => mediaKey(image.url) === key);
}
