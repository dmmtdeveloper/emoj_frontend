import type { NewsSummary } from "../api/client";

/**
 * How one page of the news index is laid out: the first page leads with the
 * newest article as a large tile and lists the rest in the grid; later
 * pages are grid only. Articles arrive newest first from the API.
 */
export function newsListing(
  articles: readonly NewsSummary[],
  page: number,
): { featured: NewsSummary | undefined; rest: NewsSummary[] } {
  if (page !== 1) return { featured: undefined, rest: [...articles] };
  const [featured, ...rest] = articles;
  return { featured, rest };
}
