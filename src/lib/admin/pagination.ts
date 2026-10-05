/**
 * Page numbers for the panel's pagination: all of them when they fit in
 * seven slots; otherwise the first, the last, the current page and its
 * neighbours, with "…" for the gaps (a gap of one page shows that page).
 */
export type PageItem = number | "…";

const SLOTS = 7;

export function pageItems(current: number, total: number): PageItem[] {
  if (total <= SLOTS) return Array.from({ length: total }, (_, i) => i + 1);
  const page = Math.min(Math.max(current, 1), total);
  // Near an edge, show a run of five pages next to it.
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3) {
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "…", page - 1, page, page + 1, "…", total];
}
