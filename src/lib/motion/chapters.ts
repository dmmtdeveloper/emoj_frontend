/**
 * Pure logic for the home chapters (src/scripts/chapters/scrub.ts and the
 * scenes in src/components/home/chapters). Each chapter's scene is one
 * anime.js timeline authored against SCENE_LENGTH and scrubbed by the
 * scroll; nothing here touches the DOM.
 */

const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

/** Timeline length every scene is authored against: positions read as ‱. */
export const SCENE_LENGTH = 10000;

export interface FocusInput {
  /** The pinned stage's size and its side gutter. */
  width: number;
  height: number;
  gutter: number;
  /** The chapter label's offset from the stage top, and its height. */
  label: { top: number; height: number };
  /** The scene's box inside the stage, untransformed. */
  scene: { left: number; top: number; width: number; height: number };
}

/**
 * Desktop focus: where the scene goes when it takes the centre of the
 * stage (translate `dx`/`dy`, `scale` about its centre, between 1 and 2)
 * and how far the label rises to the top (`labelDy`). The room left for
 * the scene is the stage minus the risen label and a padding.
 */
export function focusFit(input: FocusInput): {
  dx: number;
  dy: number;
  scale: number;
  labelDy: number;
} {
  const { width, height, gutter, label, scene } = input;
  const pad = Math.max(24, height * 0.05);
  const top = pad + label.height + 16;
  const room = { width: width - gutter * 2, height: height - top - pad };
  const fit = Math.min(room.width / scene.width, room.height / scene.height);
  const scale = Math.min(Math.max(fit, 1), 2);
  return {
    dx: width / 2 - (scene.left + scene.width / 2),
    dy: top + room.height / 2 - (scene.top + scene.height / 2),
    scale,
    labelDy: pad - label.top,
  };
}

/** A deck after `step` shuffles: the slot of card `index` (0 is the front). */
export function deckSlot(index: number, step: number, count: number): number {
  return (((index - step) % count) + count) % count;
}

/** Start times of `count` stages spread evenly over [from, to] (shares). */
export function stageTimes(count: number, from: number, to: number): number[] {
  const span = (to - from) / count;
  return Array.from({ length: count }, (_, i) =>
    Math.round((from + i * span) * SCENE_LENGTH),
  );
}

/** Deterministic jitter in 0..1, so a "random" layout is the same every visit. */
export function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/** The part of `text` typed so far (a typed command, address…). */
export function typedText(text: string, share: number): string {
  return text.slice(0, Math.floor(text.length * clamp01(share) + 1e-9));
}

/** A point on a circle, `angle` in degrees clockwise from the top. */
export function orbitPoint(
  angle: number,
  radius: number,
  center: { x: number; y: number },
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: center.x + radius * Math.sin(rad),
    y: center.y - radius * Math.cos(rad),
  };
}
