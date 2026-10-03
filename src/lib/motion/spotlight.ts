/**
 * Pointer spotlight for the hero's blueprint grid: the dots and lines near
 * the mouse light up (Hero.astro). Mouse only; touch screens have no hover
 * to follow, and reduced motion keeps the grid still.
 */

export interface SpotlightEnv {
  prefersReducedMotion: boolean;
  /** `(hover: hover) and (pointer: fine)` matches (a mouse or trackpad). */
  finePointer: boolean;
}

export function spotlightEnabled(env: SpotlightEnv): boolean {
  return env.finePointer && !env.prefersReducedMotion;
}

/** Pointer position in the element's own box, as CSS lengths. */
export function spotlightPoint(
  rect: { left: number; top: number },
  pointer: { clientX: number; clientY: number },
): { x: string; y: string } {
  return {
    x: `${Math.round(pointer.clientX - rect.left)}px`,
    y: `${Math.round(pointer.clientY - rect.top)}px`,
  };
}
