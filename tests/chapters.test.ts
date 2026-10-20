import { describe, expect, it } from "vitest";
import {
  cardTilt,
  countShown,
  deckFront,
  deckPose,
  deckSchedule,
  deckSlot,
  diveTarget,
  diveTransform,
  enterShare,
  focusFit,
  inkSpan,
  reelCard,
  reelCurrent,
  reelDrift,
  SCENE_LENGTH,
  scrollForProgress,
  showingAt,
  stageTimes,
  typedText,
  zoomScale,
} from "../src/lib/motion/chapters";

describe("focusFit", () => {
  const stage = { width: 1400, height: 800, gutter: 100 };
  const label = { top: 200, height: 16 };

  it("moves the scene to the centre of the room under the label", () => {
    const fit = focusFit({
      ...stage,
      label,
      scene: { left: 760, top: 200, width: 500, height: 400 },
    });
    // pad = max(24, 40) = 40; room top = 40 + 16 + 16 = 72.
    // room = 1200 x 688 → scale min(2.4, 1.72) = 1.72.
    expect(fit.scale).toBeCloseTo(1.72);
    expect(fit.dx).toBeCloseTo(700 - 1010);
    expect(fit.dy).toBeCloseTo(72 + 344 - 400);
    expect(fit.labelDy).toBeCloseTo(40 - 200);
  });

  it("never shrinks the scene nor grows it more than twice", () => {
    const small = focusFit({
      ...stage,
      label,
      scene: { left: 760, top: 200, width: 100, height: 80 },
    });
    expect(small.scale).toBe(2);
    const big = focusFit({
      ...stage,
      label,
      scene: { left: 0, top: 0, width: 1300, height: 900 },
    });
    expect(big.scale).toBe(1);
  });
});

describe("deckSlot", () => {
  it("puts card `step` in front and the rest behind in order", () => {
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 0, 4))).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 1, 4))).toEqual([3, 0, 1, 2]);
    expect([0, 1, 2, 3].map((i) => deckSlot(i, 3, 4))).toEqual([1, 2, 3, 0]);
  });
});

describe("showingAt", () => {
  const swaps = [2000, 4000, 6000];

  it("shows the first item until the first swap", () => {
    expect(showingAt(0, swaps)).toBe(0);
    expect(showingAt(1999, swaps)).toBe(0);
  });

  it("counts the swaps already passed", () => {
    expect(showingAt(2000, swaps)).toBe(1);
    expect(showingAt(5000, swaps)).toBe(2);
    expect(showingAt(10000, swaps)).toBe(3);
  });

  it("shows the only item when nothing swaps", () => {
    expect(showingAt(5000, [])).toBe(0);
  });
});

describe("stageTimes", () => {
  it("spreads the stages evenly over a stretch of the timeline", () => {
    expect(stageTimes(4, 0.2, 0.6)).toEqual([2000, 3000, 4000, 5000]);
    expect(SCENE_LENGTH).toBe(10000);
  });
});

describe("typedText", () => {
  it("shows the text as it is typed", () => {
    expect(typedText("LINEA", 0)).toBe("");
    expect(typedText("LINEA", 0.4)).toBe("LI");
    expect(typedText("LINEA", 1)).toBe("LINEA");
    expect(typedText("LINEA", 7)).toBe("LINEA");
  });
});

describe("enterShare", () => {
  it("is 0 while a card is beyond the right edge and 1 once fully in", () => {
    const card = { width: 400, viewport: 1440 };
    expect(enterShare({ ...card, left: 1500 })).toBe(0);
    expect(enterShare({ ...card, left: 1440 })).toBe(0);
    expect(enterShare({ ...card, left: 1240 })).toBeCloseTo(0.5);
    expect(enterShare({ ...card, left: 1040 })).toBe(1);
    expect(enterShare({ ...card, left: 100 })).toBe(1);
  });
});

describe("reelCard", () => {
  const viewport = 1440;
  const overflow = 1800;

  it("enters over the stretch of travel that brings it in from the right", () => {
    const card = reelCard({ left: 1640, width: 450, viewport, overflow });
    // e = (t - at) / span: 0 when its left meets the right edge (t = 200 /
    // 1800), 1 once its right side is in (450 more pixels of travel).
    expect(card.at).toBeCloseTo(200 / 1800);
    expect(card.span).toBeCloseTo(450 / 1800);
  });

  it("drifts with its centre's offset from the middle of the screen", () => {
    const card = reelCard({ left: 1640, width: 450, viewport, overflow });
    // At t = 0 the centre is (1865 - 720) / 1440 screens right; the whole
    // travel moves it 1800 / 1440 screens left.
    expect(card.center).toBeCloseTo((1640 + 225 - 720) / 1440);
    expect(reelDrift(overflow, viewport)).toBeCloseTo(1800 / 1440);
  });

  it("is fully in at any travel when the reel fits the screen", () => {
    const card = reelCard({ left: 600, width: 400, viewport, overflow: 0 });
    expect(card.at).toBe(-1);
    expect(card.span).toBe(1);
  });
});

describe("reelCurrent", () => {
  const lefts = [100, 560, 1020, 1480, 1940];

  it("numbers the last card that has passed a third of the screen", () => {
    expect(reelCurrent(lefts, 0, 1440)).toBe(1);
    expect(reelCurrent(lefts, -300, 1440)).toBe(2);
    expect(reelCurrent(lefts, -1000, 1440)).toBe(3);
    expect(reelCurrent(lefts, -1100, 1440)).toBe(4);
  });

  it("never counts the closing tile", () => {
    expect(reelCurrent(lefts, -5000, 1440)).toBe(4);
  });
});

describe("scrollForProgress", () => {
  it("is the page position that puts a pinned track at a progress", () => {
    const track = { pageTop: 2000, height: 3000, viewport: 900 };
    expect(scrollForProgress(track, 0)).toBe(2000);
    expect(scrollForProgress(track, 0.5)).toBe(3050);
    expect(scrollForProgress(track, 1)).toBe(4100);
    expect(scrollForProgress(track, 2)).toBe(4100);
  });
});

describe("zoomScale", () => {
  it("goes from 1 to the maximum, evenly in perceived speed", () => {
    expect(zoomScale(0, 64)).toBe(1);
    expect(zoomScale(1, 64)).toBe(64);
    expect(zoomScale(0.5, 64)).toBeCloseTo(8);
    expect(zoomScale(2, 64)).toBe(64);
  });
});

/** One row of RGBA pixels with ink (alpha 255) where `inked` says so. */
const row = (inked: boolean[]) =>
  inked.flatMap((ink) => [0, 0, 0, ink ? 255 : 0]);

describe("inkSpan", () => {
  it("finds the first run of ink across the row", () => {
    const pixels = row([false, false, true, true, true, false, true, false]);
    expect(inkSpan(pixels, 8)).toEqual({ start: 2, end: 5 });
  });

  it("runs to the end of the row when the ink does", () => {
    expect(inkSpan(row([false, true, true]), 3)).toEqual({ start: 1, end: 3 });
  });

  it("guesses the left stroke of the zero when the row has no ink", () => {
    expect(inkSpan(row(Array(100).fill(false)), 100)).toEqual({
      start: 8,
      end: 20,
    });
  });
});

describe("diveTarget", () => {
  it("dives into the middle of the stroke, deep enough to cover the screen", () => {
    const dive = diveTarget({
      width: 1440,
      height: 900,
      left: 700,
      row: 420,
      ink: { start: 10, end: 50 },
    });
    expect(dive.origin).toEqual({ x: 730, y: 420 });
    expect(dive.maxScale).toBeCloseTo(
      ((2.4 * Math.hypot(1440, 900)) / 40) * 1.05,
    );
  });

  it("never takes a hairline stroke as thinner than 4px", () => {
    const dive = diveTarget({
      width: 400,
      height: 800,
      left: 0,
      row: 0,
      ink: { start: 10, end: 11 },
    });
    expect(dive.maxScale).toBeCloseTo(
      ((2.4 * Math.hypot(400, 800)) / 4) * 1.05,
    );
  });
});

describe("diveTransform", () => {
  it("scales the sheet about the dive's origin", () => {
    expect(diveTransform({ x: 730, y: 420 }, 12)).toBe(
      "translate(730 420) scale(12) translate(-730 -420)",
    );
  });
});

describe("countShown", () => {
  it("counts a figure up with the share, in whole numbers", () => {
    expect(countShown(7, 0)).toBe("0");
    expect(countShown(7, 0.5)).toBe("4");
    expect(countShown(6, 1)).toBe("6");
    expect(countShown(6, 3)).toBe("6");
    expect(countShown(6, -1)).toBe("0");
  });
});

describe("deckSchedule", () => {
  const schedule = deckSchedule(4, 0.04, 0.84, 0.75);

  it("spreads the cards evenly and lands each within its share", () => {
    expect(schedule).toEqual([
      { start: 400, land: 1900 },
      { start: 2400, land: 3900 },
      { start: 4400, land: 5900 },
      { start: 6400, land: 7900 },
    ]);
  });

  it("lands every card before the next one starts", () => {
    schedule.slice(1).forEach((next, i) => {
      expect(schedule[i]?.land).toBeLessThan(next.start);
    });
  });

  it("keeps the cards already in place at the start", () => {
    const placed = deckSchedule(4, 0.06, 0.9, 0.8, 1);
    expect(placed[0]).toEqual({ start: 0, land: 0 });
    expect(placed.slice(1)).toEqual([
      { start: 600, land: 2840 },
      { start: 3400, land: 5640 },
      { start: 6200, land: 8440 },
    ]);
  });

  it("lands the last card inside the window", () => {
    expect(schedule.at(-1)?.land).toBeLessThanOrEqual(0.84 * SCENE_LENGTH);
  });
});

describe("deckPose", () => {
  it("leaves the front card as it is", () => {
    expect(deckPose(0)).toEqual({ scale: 1, y: 0, shade: 0, fold: 0 });
  });

  it("tucks a card back, up and darker per card in front of it", () => {
    const pose = deckPose(1);
    expect(pose.scale).toBeCloseTo(0.94);
    expect(pose.y).toBeCloseTo(-5);
    expect(pose.shade).toBeCloseTo(0.16);
    expect(pose.fold).toBeLessThan(0);
    expect(deckPose(2).scale).toBeLessThan(pose.scale);
    expect(deckPose(2).y).toBeLessThan(pose.y);
    expect(deckPose(2).shade).toBeGreaterThan(pose.shade);
  });

  it("stops tucking three cards deep and never goes past the front", () => {
    expect(deckPose(7)).toEqual(deckPose(3));
    expect(deckPose(-2)).toEqual(deckPose(0));
  });
});

describe("deckFront", () => {
  const schedule = deckSchedule(4, 0.04, 0.84, 0.75);

  it("has no front card until the first one lands", () => {
    expect(deckFront(0, schedule)).toBe(-1);
    expect(deckFront(1899, schedule)).toBe(-1);
  });

  it("is the last card that has landed", () => {
    expect(deckFront(1900, schedule)).toBe(0);
    expect(deckFront(4000, schedule)).toBe(1);
    expect(deckFront(SCENE_LENGTH, schedule)).toBe(3);
  });
});

describe("cardTilt", () => {
  const box = { left: 100, top: 50, width: 400, height: 200 };

  it("is flat with the pointer at the centre", () => {
    const tilt = cardTilt({ x: 300, y: 150 }, box, 6);
    expect(tilt.rotateX).toBeCloseTo(0);
    expect(tilt.rotateY).toBeCloseTo(0);
  });

  it("presses the side under the pointer away", () => {
    expect(cardTilt({ x: 500, y: 150 }, box, 6).rotateY).toBeCloseTo(6);
    expect(cardTilt({ x: 100, y: 150 }, box, 6).rotateY).toBeCloseTo(-6);
    expect(cardTilt({ x: 300, y: 50 }, box, 6).rotateX).toBeCloseTo(6);
    expect(cardTilt({ x: 300, y: 250 }, box, 6).rotateX).toBeCloseTo(-6);
  });

  it("never tilts past the maximum", () => {
    const tilt = cardTilt({ x: 2000, y: -900 }, box, 6);
    expect(tilt.rotateY).toBeCloseTo(6);
    expect(tilt.rotateX).toBeCloseTo(6);
  });

  it("stays flat on an empty box", () => {
    const tilt = cardTilt({ x: 10, y: 10 }, { ...box, width: 0 }, 6);
    expect(tilt.rotateX).toBeCloseTo(0);
    expect(tilt.rotateY).toBeCloseTo(0);
  });
});
