/**
 * The EMOJ isotype geometry, from the official `isotipo-recorte.svg`
 * (design/brand/oficial): the hand-drawn stroke and its two dots. The path
 * starts on the right (next to the end dot) and finishes on the left, next
 * to the start dot, so it is drawn "backwards" (stroke-dashoffset from -1).
 */
export const ISOTYPE = {
  viewBox: "96 40 660 258",
  stroke:
    "M704.94,135.39c-68.63,24.41-86.21-35.68-122.4,25.65-33.54,56.83-43.33,109.37-86.06,102.96-84.6-12.69,29.25-202.14-37.01-222.01-92.89-27.87-156.27,247.23-255.95,220.47-82.92-22.26,40.5-246.03,82.15-209.9,31.04,26.93-59.38,100.11-137.89,122.95",
  /** Left dot, where the pen starts. */
  start: { x: 121.46, y: 182.11 },
  /** Right dot, where the stroke ends (the hero lens opens from it). */
  end: { x: 731.23, y: 125.35 },
  dot: 7.93,
  strokeWidth: 10.19,
} as const;
