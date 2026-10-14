/**
 * Pure helpers for the panel's Resumen (src/admin/pages.tsx): how long ago
 * something happened, and one "recent activity" list out of projects and
 * news.
 */

const TIME_ZONE = "America/Santiago";

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const shortDate = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** Calendar days between two instants, counted in Santiago. */
function daysApart(from: Date, to: Date): number {
  const a = Date.parse(dayKey.format(from));
  const b = Date.parse(dayKey.format(to));
  return Math.round((b - a) / 86_400_000);
}

/**
 * "recién", "hace 5 min", "hace 3 h", "ayer", "hace 4 días", then the date
 * ("20 sept 2026") after a week.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const days = daysApart(then, now);
  if (days === 0) return `hace ${Math.floor(minutes / 60)} h`;
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return shortDate.format(then);
}

/** Projects and news together, last updated first, at most `limit`. */
export function mergeRecent<
  P extends { updatedAt: string },
  N extends { updatedAt: string },
>(projects: readonly P[], news: readonly N[], limit: number) {
  const all: ({ kind: "project"; item: P } | { kind: "news"; item: N })[] = [
    ...projects.map((item) => ({ kind: "project" as const, item })),
    ...news.map((item) => ({ kind: "news" as const, item })),
  ];
  return all
    .sort((a, b) => Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt))
    .slice(0, limit);
}
