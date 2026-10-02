/**
 * Count-up numbers for the facts band. Pure helpers; the DOM wiring lives in
 * `src/scripts/motion.ts`. The HTML always ships the final value, so the
 * animation is purely an enhancement.
 */

export interface CountSpec {
  /** Text before the number, e.g. "+". */
  prefix: string;
  /** Final integer value. */
  value: number;
  /** Text after the number, e.g. "+" in "30+". */
  suffix: string;
}

// Integers, optionally grouped with es-CL thousands dots ("1.200").
const COUNT_PATTERN = /^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(\D*)$/;

const numberFormat = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/** Split a fact like "30+" into prefix, integer value and suffix. */
export function parseCount(text: string): CountSpec | null {
  const match = COUNT_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, prefix = "", digits = "", suffix = ""] = match;
  return { prefix, value: Number(digits.replaceAll(".", "")), suffix };
}

/** Render `n` with the spec's prefix and suffix, grouped like es-CL. */
export function formatCount(spec: CountSpec, n: number): string {
  return `${spec.prefix}${numberFormat.format(n)}${spec.suffix}`;
}

/** Cubic ease-out, clamped to [0, 1]. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** Integer to display at `progress` (0..1) of the animation. */
export function countValueAt(spec: CountSpec, progress: number): number {
  return Math.round(spec.value * easeOutCubic(progress));
}
