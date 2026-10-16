import { describe, expect, it } from "vitest";
import {
  approach,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  enterShare,
  cadReadout,
  cadStepPhases,
  typedText,
  weightedSlice,
  zoomWindow,
  focusCurve,
  itemShare,
  deckPlace,
  mix,
  popIn,
  reelShift,
  sceneMode,
  scrollForProgress,
  segment,
  sliceOf,
  stackPress,
  trackProgress,
  zoomScale,
} from "../src/lib/motion/scenes";

describe("clamp01 and mix", () => {
  it("keeps values in 0..1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("interpolates between two values", () => {
    expect(mix(10, 20, 0)).toBe(10);
    expect(mix(10, 20, 0.5)).toBe(15);
    expect(mix(10, 20, 1)).toBe(20);
  });
});

describe("easings", () => {
  it("start at 0, end at 1 and never leave the range", () => {
    for (const ease of [easeOutCubic, easeInOutCubic]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      for (let x = 0; x <= 1; x += 0.05) {
        expect(ease(x)).toBeGreaterThanOrEqual(0);
        expect(ease(x)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("segment", () => {
  it("maps a stretch of the progress to 0..1", () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
  });

  it("treats an empty stretch as a step", () => {
    expect(segment(0.49, 0.5, 0.5)).toBe(0);
    expect(segment(0.5, 0.5, 0.5)).toBe(1);
  });
});

describe("trackProgress", () => {
  it("is 0 until the track's top reaches the viewport top", () => {
    expect(trackProgress({ top: 300, height: 3000, viewport: 900 })).toBe(0);
    expect(trackProgress({ top: 0, height: 3000, viewport: 900 })).toBe(0);
  });

  it("runs to 1 while the stage is pinned", () => {
    expect(
      trackProgress({ top: -1050, height: 3000, viewport: 900 }),
    ).toBeCloseTo(0.5);
    expect(trackProgress({ top: -2100, height: 3000, viewport: 900 })).toBe(1);
    expect(trackProgress({ top: -5000, height: 3000, viewport: 900 })).toBe(1);
  });

  it("jumps from 0 to 1 when the track has no scroll to give", () => {
    expect(trackProgress({ top: 10, height: 800, viewport: 900 })).toBe(0);
    expect(trackProgress({ top: -10, height: 800, viewport: 900 })).toBe(1);
  });
});

describe("scrollForProgress", () => {
  it("is the page position that gives a progress (inverse of trackProgress)", () => {
    const track = { pageTop: 2000, height: 3000, viewport: 900 };
    const y = scrollForProgress(track, 0.25);
    expect(y).toBe(2000 + 0.25 * 2100);
    expect(
      trackProgress({
        top: track.pageTop - y,
        height: track.height,
        viewport: track.viewport,
      }),
    ).toBeCloseTo(0.25);
  });
});

describe("approach", () => {
  it("moves toward the target without overshooting", () => {
    const next = approach(0, 1, 16, 120);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("gets there faster with more elapsed time", () => {
    expect(approach(0, 1, 64, 120)).toBeGreaterThan(approach(0, 1, 16, 120));
  });

  it("snaps when it is close enough to be invisible", () => {
    expect(approach(0.99995, 1, 16, 120)).toBe(1);
  });

  it("jumps straight there with no smoothing", () => {
    expect(approach(0.2, 0.8, 16, 0)).toBe(0.8);
  });
});

describe("sliceOf", () => {
  it("splits the progress into equal slices", () => {
    expect(sliceOf(0, 7)).toEqual({ index: 0, local: 0 });
    expect(sliceOf(0.5, 4)).toEqual({ index: 2, local: 0 });
    const mid = sliceOf(0.3, 4);
    expect(mid.index).toBe(1);
    expect(mid.local).toBeCloseTo(0.2);
  });

  it("keeps the end inside the last slice", () => {
    expect(sliceOf(1, 7)).toEqual({ index: 6, local: 1 });
  });
});

describe("zoomScale", () => {
  it("goes from 1 to the maximum, evenly in perceived speed", () => {
    expect(zoomScale(0, 64)).toBe(1);
    expect(zoomScale(1, 64)).toBe(64);
    expect(zoomScale(0.5, 64)).toBeCloseTo(8);
  });
});

describe("reelShift", () => {
  it("slides the reel by its overflow", () => {
    expect(reelShift(0, 1800)).toBe(0);
    expect(reelShift(0.5, 1800)).toBe(-900);
    expect(reelShift(1, 1800)).toBe(-1800);
  });

  it("never slides a reel that fits", () => {
    expect(reelShift(0.5, -200)).toBe(0);
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

describe("stackPress", () => {
  it("is 0 until the next card starts to cover this one", () => {
    expect(stackPress({ nextTop: 900, pinTop: 120, span: 600 })).toBe(0);
    expect(stackPress({ nextTop: 720, pinTop: 120, span: 600 })).toBe(0);
  });

  it("reaches 1 when the next card is pinned on top", () => {
    expect(stackPress({ nextTop: 420, pinTop: 120, span: 600 })).toBeCloseTo(
      0.5,
    );
    expect(stackPress({ nextTop: 120, pinTop: 120, span: 600 })).toBe(1);
    expect(stackPress({ nextTop: 40, pinTop: 120, span: 600 })).toBe(1);
  });
});

describe("sceneMode", () => {
  it("plays the scenes only with motion and the APIs they need", () => {
    expect(
      sceneMode({ prefersReducedMotion: false, hasIntersectionObserver: true }),
    ).toBe("scroll");
    expect(
      sceneMode({ prefersReducedMotion: true, hasIntersectionObserver: true }),
    ).toBe("static");
    expect(
      sceneMode({
        prefersReducedMotion: false,
        hasIntersectionObserver: false,
      }),
    ).toBe("static");
  });
});

describe("popIn", () => {
  it("is hidden at 0, overshoots on the way and settles at 1", () => {
    expect(popIn(0)).toBe(0);
    expect(popIn(1)).toBeCloseTo(1);
    const peak = Math.max(...[0.5, 0.6, 0.7, 0.8].map(popIn));
    expect(peak).toBeGreaterThan(1);
  });
});

describe("weightedSlice", () => {
  const weights = [1, 2, 1];

  it("splits the share by weight", () => {
    expect(weightedSlice(0, weights)).toEqual({ index: 0, local: 0 });
    expect(weightedSlice(0.125, weights)).toEqual({ index: 0, local: 0.5 });
    expect(weightedSlice(0.5, weights)).toEqual({ index: 1, local: 0.5 });
    expect(weightedSlice(0.875, weights)).toEqual({ index: 2, local: 0.5 });
  });

  it("keeps the ends inside the first and last steps", () => {
    expect(weightedSlice(-1, weights)).toEqual({ index: 0, local: 0 });
    expect(weightedSlice(1, weights)).toEqual({ index: 2, local: 1 });
    expect(weightedSlice(3, weights)).toEqual({ index: 2, local: 1 });
  });
});

describe("cadStepPhases", () => {
  it("types the command first, then draws", () => {
    expect(cadStepPhases(0)).toEqual({ typed: 0, drawn: 0 });
    const typing = cadStepPhases(0.15);
    expect(typing.typed).toBeGreaterThan(0);
    expect(typing.drawn).toBe(0);
    const drawing = cadStepPhases(0.65);
    expect(drawing.typed).toBe(1);
    expect(drawing.drawn).toBeGreaterThan(0);
    expect(drawing.drawn).toBeLessThan(1);
    expect(cadStepPhases(1)).toEqual({ typed: 1, drawn: 1 });
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

describe("cadReadout", () => {
  it("prints coordinates like the CAD status bar", () => {
    expect(cadReadout({ x: 4210.548, y: 6150.2 })).toBe("X 4210.55  Y 6150.20");
    expect(cadReadout({ x: -0.001, y: 0 })).toBe("X 0.00  Y 0.00");
  });
});

describe("zoomWindow", () => {
  const stage = { width: 1000, height: 800 };
  const win = { left: 600, top: 300, width: 200, height: 100 };

  it("starts on the window as drawn", () => {
    const z = zoomWindow(win, stage, 0);
    expect(z.scale).toBe(1);
    expect(z.x).toBe(0);
    expect(z.y).toBe(0);
    expect(z.clip).toEqual({ top: 300, right: 200, bottom: 400, left: 600 });
  });

  it("ends with the window covering the stage, centred", () => {
    const z = zoomWindow(win, stage, 1);
    // The window must cover 1000x800: 8 times its height.
    expect(z.scale).toBeCloseTo(8);
    expect(z.x).toBeCloseTo(500 - 700);
    expect(z.y).toBeCloseTo(400 - 350);
    expect(z.clip.top).toBeCloseTo(0);
    expect(z.clip.right).toBeCloseTo(0);
    expect(z.clip.bottom).toBeCloseTo(0);
    expect(z.clip.left).toBeCloseTo(0);
  });

  it("opens the window steadily", () => {
    let last = zoomWindow(win, stage, 0);
    for (let t = 0.05; t <= 1; t += 0.05) {
      const z = zoomWindow(win, stage, t);
      expect(z.scale).toBeGreaterThan(last.scale);
      expect(z.clip.left).toBeLessThanOrEqual(last.clip.left + 1e-9);
      expect(z.clip.top).toBeLessThanOrEqual(last.clip.top + 1e-9);
      last = z;
    }
  });

  it("does nothing for an empty window", () => {
    const z = zoomWindow({ left: 0, top: 0, width: 0, height: 0 }, stage, 0.5);
    expect(z.scale).toBe(1);
  });
});

describe("focusCurve", () => {
  it("rises, holds and falls back", () => {
    const beats = [0.1, 0.2, 0.8, 0.9] as const;
    expect(focusCurve(0, beats)).toBe(0);
    expect(focusCurve(0.1, beats)).toBe(0);
    expect(focusCurve(0.15, beats)).toBeCloseTo(0.5);
    expect(focusCurve(0.5, beats)).toBe(1);
    expect(focusCurve(0.85, beats)).toBeCloseTo(0.5);
    expect(focusCurve(1, beats)).toBe(0);
  });
});

describe("itemShare", () => {
  it("splits a range of the progress into one stretch per item", () => {
    // Range 0.2..0.6, 4 items: 0.1 each.
    expect(itemShare(0.2, 0, 4, 0.2, 0.6)).toBe(0);
    expect(itemShare(0.25, 0, 4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(itemShare(0.3, 0, 4, 0.2, 0.6)).toBe(1);
    expect(itemShare(0.3, 1, 4, 0.2, 0.6)).toBe(0);
    expect(itemShare(0.6, 3, 4, 0.2, 0.6)).toBe(1);
  });
});

describe("deckPlace", () => {
  it("leaves the top card square and in place", () => {
    const top = deckPlace(0, 1);
    expect(top.x).toBe(0);
    expect(top.y).toBe(0);
    expect(top.rotate).toBe(0);
    expect(top.scale).toBe(1);
    expect(top.opacity).toBe(1);
  });

  it("fans the next cards out behind, smaller, to their side", () => {
    const right = deckPlace(1, 1);
    const left = deckPlace(1, -1);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
    expect(right.rotate).toBeGreaterThan(0);
    expect(right.scale).toBeLessThan(1);
    expect(right.z).toBeLessThan(deckPlace(0, 1).z);
    expect(deckPlace(4, 1).opacity).toBe(0);
  });

  it("throws a passed card off to the left and fades it", () => {
    const going = deckPlace(-0.5, 1);
    expect(going.x).toBeLessThan(0);
    expect(going.rotate).toBeLessThan(0);
    expect(deckPlace(-1, 1).opacity).toBe(0);
  });

  it("moves continuously through the top spot", () => {
    const before = deckPlace(0.001, 1);
    const after = deckPlace(-0.001, 1);
    expect(Math.abs(before.x - after.x)).toBeLessThan(0.01);
    expect(Math.abs(before.rotate - after.rotate)).toBeLessThan(0.1);
  });
});
