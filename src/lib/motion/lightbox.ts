/**
 * The photo viewer of a project gallery (src/scripts/lightbox.ts): moving
 * one photo forward or back, wrapping around at both ends.
 */
export function stepIndex(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}
