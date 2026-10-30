/**
 * Pure helpers behind the project and news collections
 * (src/content/proyectos, src/content/noticias; read in ./index.ts).
 */
import type { ImageMetadata } from "astro";
import type { ContentImage } from "./types";

/** An image of the collection, with its size taken from the file. */
export function contentImage(
  image: { src: ImageMetadata; alt: string } | undefined,
): ContentImage | undefined {
  if (!image) return undefined;
  const { src, alt } = image;
  return { src, alt, width: src.width, height: src.height };
}

/** A copy of the list ordered by publication date, newest first. */
export function newestFirst<T extends { publishedAt: string }>(
  items: readonly T[],
): T[] {
  const time = (item: T) => Date.parse(item.publishedAt);
  return [...items].sort((a, b) => time(b) - time(a));
}

/**
 * Fails the build when a content file is not named after its slug: the
 * file name is what an editor looks for, and the slug is the page address.
 */
export function assertNamedBySlug(
  collection: string,
  entries: readonly { filePath?: string | undefined; data: { slug: string } }[],
): void {
  for (const { filePath = "", data } of entries) {
    const name = filePath.split(/[\\/]/).pop()?.replace(/\.md$/, "");
    if (name !== data.slug) {
      throw new Error(
        `src/content/${collection}/${name}.md must be named after its slug "${data.slug}".`,
      );
    }
  }
}
