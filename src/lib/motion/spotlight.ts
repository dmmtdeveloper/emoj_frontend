/**
 * Gate for pointer-driven hero effects (the interactive dot grid,
 * src/scripts/dot-grid.ts). Mouse only; touch screens have no hover to
 * follow, and reduced motion keeps the grid still.
 */

export interface SpotlightEnv {
  prefersReducedMotion: boolean;
  /** `(hover: hover) and (pointer: fine)` matches (a mouse or trackpad). */
  finePointer: boolean;
}

export function spotlightEnabled(env: SpotlightEnv): boolean {
  return env.finePointer && !env.prefersReducedMotion;
}
