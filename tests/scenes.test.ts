import { describe, expect, it } from "vitest";
import {
  approach,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  enterShare,
  heroLens,
  heroPhases,
  layerDraw,
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

describe("heroLens", () => {
  it("is closed (the size of the dot) until the stroke is drawn", () => {
    expect(heroLens(0, { dot: 8, cover: 1500 })).toBe(8);
    expect(heroLens(0.3, { dot: 8, cover: 1500 })).toBe(8);
  });

  it("grows to cover the whole screen", () => {
    const sizes = [0.4, 0.5, 0.6, 0.7, 0.8].map((p) =>
      heroLens(p, { dot: 8, cover: 1500 }),
    );
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1] ?? 0);
    }
    expect(heroLens(0.9, { dot: 8, cover: 1500 })).toBe(1500);
    expect(heroLens(1, { dot: 8, cover: 1500 })).toBe(1500);
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

describe("heroPhases", () => {
  it("gives the stroke and lens the first part and each extra photo a stretch", () => {
    const one = heroPhases(0.5, 1);
    expect(one.lens).toBeCloseTo(0.5);
    expect(one.photo).toBe(0);

    // 3 photos: the lens runs over 1.9 of 3.7 screens, then 0.9 each.
    const end = heroPhases(1, 3);
    expect(end.lens).toBe(1);
    expect(end.photo).toBe(2);
    expect(end.slide).toBe(1);
  });

  it("wipes the photos in order as the scroll goes on", () => {
    const share = 1.9 / 3.7;
    const midSecond = share + (1 - share) * 0.25;
    const phase = heroPhases(midSecond, 3);
    // The second photo is half way in (none of the extra ones is complete).
    expect(phase.lens).toBe(1);
    expect(phase.photo).toBe(0);
    expect(phase.slide).toBeCloseTo(0.5);
  });

  it("is monotonic, so scrolling back rewinds the photos", () => {
    let last = -1;
    for (let p = 0; p <= 1; p += 0.01) {
      const { lens, photo, slide } = heroPhases(p, 4);
      const position = lens + photo + slide;
      expect(position).toBeGreaterThanOrEqual(last - 1e-9);
      last = position;
    }
  });
});

describe("layerDraw", () => {
  it("draws the layers one after another, each in the first part of its stretch", () => {
    // 4 layers: stretch of 0.25 each, drawn over its first 60%.
    expect(layerDraw(0, 0, 4)).toBe(0);
    expect(layerDraw(0.075, 0, 4)).toBeCloseTo(0.5);
    expect(layerDraw(0.15, 0, 4)).toBe(1);
    expect(layerDraw(0.2, 0, 4)).toBe(1);
    expect(layerDraw(0.2, 1, 4)).toBe(0);
    expect(layerDraw(0.325, 1, 4)).toBeCloseTo(0.5);
  });

  it("keeps earlier layers drawn and later ones blank", () => {
    expect(layerDraw(0.9, 0, 4)).toBe(1);
    expect(layerDraw(0.1, 3, 4)).toBe(0);
    expect(layerDraw(1, 3, 4)).toBe(1);
  });
});
