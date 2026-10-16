/**
 * The "closer look" move shared by the home chapters that rest beside
 * their text and grow to the centre (deivid.space's rhythm): the visual is
 * laid out in its large, centred box, and at rest it is moved and scaled
 * into a slot beside the text. This measures the transform between both
 * boxes and writes it on `target` as `--focus-dx`, `--focus-dy` (px) and
 * `--focus-s` (relative to the large box as drawn, any base scale
 * included); the CSS applies it times (1 − `--focus`).
 */
import { setVar } from "./types";

export function measureFocus(
  target: HTMLElement,
  visual: HTMLElement,
  slot: HTMLElement,
): void {
  // Read the large box without the rest transform.
  setVar(target, "--focus", 1);
  const big = visual.getBoundingClientRect();
  const rest = slot.getBoundingClientRect();
  if (big.width === 0 || rest.width === 0) return;
  const scale = Math.min(rest.width / big.width, rest.height / big.height);
  setVar(target, "--focus-s", scale);
  setVar(
    target,
    "--focus-dx",
    rest.left + rest.width / 2 - (big.left + big.width / 2),
  );
  setVar(
    target,
    "--focus-dy",
    rest.top + rest.height / 2 - (big.top + big.height / 2),
  );
}
