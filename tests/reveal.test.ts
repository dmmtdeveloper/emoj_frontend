import { describe, expect, it } from "vitest";
import {
  initRevealFallback,
  revealMode,
  shouldReveal,
  type RevealObserverFactory,
} from "../src/lib/motion/reveal";

describe("revealMode", () => {
  const base = {
    prefersReducedMotion: false,
    supportsScrollTimeline: false,
    hasIntersectionObserver: true,
  };

  it("does nothing when the user prefers reduced motion", () => {
    expect(
      revealMode({
        ...base,
        prefersReducedMotion: true,
        supportsScrollTimeline: true,
      }),
    ).toBe("none");
  });

  it("leaves it to CSS when scroll-driven animations are supported", () => {
    expect(revealMode({ ...base, supportsScrollTimeline: true })).toBe("css");
  });

  it("falls back to IntersectionObserver otherwise", () => {
    expect(revealMode(base)).toBe("observer");
  });

  it("keeps content static without IntersectionObserver", () => {
    expect(revealMode({ ...base, hasIntersectionObserver: false })).toBe(
      "none",
    );
  });
});

describe("shouldReveal", () => {
  it("reveals intersecting elements", () => {
    expect(
      shouldReveal({
        isIntersecting: true,
        boundingClientRect: { bottom: 10 },
      }),
    ).toBe(true);
  });

  it("reveals elements already scrolled past (above the viewport)", () => {
    expect(
      shouldReveal({
        isIntersecting: false,
        boundingClientRect: { bottom: -40 },
      }),
    ).toBe(true);
  });

  it("keeps elements below the viewport hidden", () => {
    expect(
      shouldReveal({
        isIntersecting: false,
        boundingClientRect: { bottom: 2000 },
      }),
    ).toBe(false);
  });
});

function fakeElement() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  };
}

describe("initRevealFallback", () => {
  it("arms the page only after observing, then reveals and unobserves", () => {
    const root = { classes: new Set<string>() };
    const rootApi = { add: (c: string) => root.classes.add(c) };
    const a = fakeElement();
    const b = fakeElement();
    const observed: unknown[] = [];
    const unobserved: unknown[] = [];
    let callback: Parameters<RevealObserverFactory>[0] = () => undefined;

    const factory: RevealObserverFactory = (cb) => {
      callback = cb;
      return {
        observe: (el) => {
          // The page must not hide anything before observers exist.
          expect(root.classes.size).toBe(0);
          observed.push(el);
        },
        unobserve: (el) => unobserved.push(el),
      };
    };

    initRevealFallback({ elements: [a, b], rootClassList: rootApi, factory });
    expect(observed).toEqual([a, b]);
    expect(root.classes.has("reveal-js")).toBe(true);

    callback([
      {
        target: a,
        isIntersecting: true,
        boundingClientRect: { bottom: 100 },
      },
      {
        target: b,
        isIntersecting: false,
        boundingClientRect: { bottom: 3000 },
      },
    ]);

    expect(a.attributes.get("data-revealed")).toBe("");
    expect(b.attributes.has("data-revealed")).toBe(false);
    expect(unobserved).toEqual([a]);
  });

  it("does nothing without elements", () => {
    const classes = new Set<string>();
    initRevealFallback({
      elements: [],
      rootClassList: { add: (c) => classes.add(c) },
      factory: () => {
        throw new Error("should not observe");
      },
    });
    expect(classes.size).toBe(0);
  });
});
