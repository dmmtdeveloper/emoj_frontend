/**
 * The public site is static: publishing, unpublishing or changing published
 * content makes the API trigger a rebuild on Vercel, which takes about two
 * minutes. The panel has no way to ask Vercel when it is done, so it shows
 * "updating" for that typical time after the last change.
 */

export const REBUILD_MS = 2.5 * 60 * 1000;

export type RebuildState =
  { building: false } | { building: true; remainingMs: number };

export function rebuildState(
  startedAt: number | null,
  now: number,
): RebuildState {
  if (startedAt === null || startedAt > now) return { building: false };
  const remainingMs = startedAt + REBUILD_MS - now;
  return remainingMs > 0
    ? { building: true, remainingMs }
    : { building: false };
}
