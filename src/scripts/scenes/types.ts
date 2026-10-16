/** Contract between the scene engine (src/scripts/scenes.ts) and each scene. */

export interface Scene {
  /** Draw the scene for a progress of 0..1 (`now` is the frame time). */
  render(progress: number, now: number): void;
  /** Re-read sizes and positions (after arming, resize and font load). */
  measure?(): void;
  /** True while the scene still animates on its own (a load intro). */
  busy?(now: number): boolean;
}

export interface SceneTools {
  /** Scroll the page so `track` sits at `progress`. */
  scrollTo(track: HTMLElement, progress: number): void;
  /** Ask for a frame (a scene that animates without scrolling). */
  wake(): void;
}

/** Builds a chapter's scene; null leaves the chapter static. */
export type SceneFactory = (
  track: HTMLElement,
  tools: SceneTools,
) => Scene | null;

/** Set a custom property through the CSSOM (allowed by the CSP). */
export function setVar(
  el: HTMLElement | SVGElement,
  name: string,
  value: number,
): void {
  el.style.setProperty(name, String(Math.round(value * 10000) / 10000));
}
