/**
 * The outline drawn around a photo in the EMOJ signature shape (rounded on
 * the left, open on the right, like a bracket). The path depends on the
 * photo's rendered size, so it is built in the browser (src/scripts/motion.ts)
 * and redrawn on resize; the stroke itself is animated in CSS (motion.css).
 */

export interface FrameBox {
  width: number;
  height: number;
  /** Corner radius on the left side, in px. */
  radius: number;
  /** Space between each line end and its dot (the isotype's gap), in px. */
  dotGap?: number;
}

export interface FramePoint {
  x: number;
  y: number;
}

export interface SignatureFrame {
  /** Starts top-right, runs left, down the rounded side, ends bottom-right. */
  d: string;
  /** Dot centres, on the right edge beyond each line end. */
  start: FramePoint;
  end: FramePoint;
}

const round = (n: number): number => Math.round(n * 100) / 100;

export function signatureFramePath(box: FrameBox): SignatureFrame | null {
  const w = round(box.width);
  const h = round(box.height);
  if (w <= 0 || h <= 0) return null;
  const r = round(Math.max(0, Math.min(box.radius, h / 2, w)));
  const x = round(Math.max(r, w - (box.dotGap ?? 0)));
  const arc = `A${r} ${r} 0 0 0`;
  return {
    d: `M${x} 0H${r}${arc} 0 ${r}V${round(h - r)}${arc} ${r} ${h}H${x}`,
    start: { x: w, y: 0 },
    end: { x: w, y: h },
  };
}
