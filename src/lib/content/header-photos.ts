import type { ContentImage } from "./types";

interface WithCover {
  slug: string;
  title: string;
  featured: boolean;
  cover?: ContentImage | undefined;
}

/**
 * The project photos a page header plays through (HeaderSlideshow): every
 * project with a cover, featured ones first, otherwise in list order, at
 * most `limit` of them.
 */
export function headerPhotos<T extends WithCover>(
  projects: readonly T[],
  limit: number,
): (T & { cover: ContentImage })[] {
  const withCover = projects.filter(
    (p): p is T & { cover: ContentImage } => p.cover !== undefined,
  );
  return [
    ...withCover.filter((p) => p.featured),
    ...withCover.filter((p) => !p.featured),
  ].slice(0, limit);
}
