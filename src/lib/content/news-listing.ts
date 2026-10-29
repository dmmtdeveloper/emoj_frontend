import type { NewsSummary } from "./types";

/**
 * How one page of the news index is laid out: the first page leads with the
 * newest article as a large tile and lists the rest in the grid; later
 * pages are grid only. Articles arrive newest first (src/lib/content).
 */
export function newsListing(
  articles: readonly NewsSummary[],
  page: number,
): { featured: NewsSummary | undefined; rest: NewsSummary[] } {
  if (page !== 1) return { featured: undefined, rest: [...articles] };
  const [featured, ...rest] = articles;
  return { featured, rest };
}

/**
 * Other articles to read at the foot of an article page: the newest ones,
 * without the article being read.
 */
export function moreNews<T extends { slug: string }>(
  articles: readonly T[],
  slug: string,
  limit: number,
): T[] {
  return articles.filter((a) => a.slug !== slug).slice(0, limit);
}
