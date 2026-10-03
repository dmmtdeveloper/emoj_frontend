import { describe, expect, it, vi } from "vitest";
import {
  drawOnViewMode,
  drawStateFor,
  initDrawOnView,
  type DrawTarget,
} from "../src/lib/motion/draw-on-view";

describe("drawOnViewMode", () => {
  it("plays when motion is allowed and IntersectionObserver exists", () => {
    expect(
      drawOnViewMode({
        prefersReducedMotion: false,
        hasIntersectionObserver: true,
      }),
    ).toBe("observer");
  });

  it("does nothing with reduced motion (the logo stays complete)", () => {
    expect(
      drawOnViewMode({
        prefersReducedMotion: true,
        hasIntersectionObserver: true,
      }),
    ).toBe("none");
  });

  it("does nothing without IntersectionObserver", () => {
    expect(
      drawOnViewMode({
        prefersReducedMotion: false,
        hasIntersectionObserver: false,
      }),
    ).toBe("none");
  });
});

describe("drawStateFor", () => {
  it("plays once the element is in view", () => {
    expect(
      drawStateFor({
        isIntersecting: true,
        boundingClientRect: { bottom: 300 },
      }),
    ).toBe("play");
  });

  it("stays complete when it was already scrolled past (reload mid-page)", () => {
    expect(
      drawStateFor({
        isIntersecting: false,
        boundingClientRect: { bottom: -20 },
      }),
    ).toBe("done");
  });

  it("waits hidden while it is still below the viewport", () => {
    expect(
      drawStateFor({
        isIntersecting: false,
        boundingClientRect: { bottom: 1400 },
      }),
    ).toBe("armed");
  });
});

function fakeTarget(): DrawTarget & { state: string | undefined } {
  return {
    state: undefined,
    setAttribute(_name: string, value: string) {
      this.state = value;
    },
  };
}

type Fake = ReturnType<typeof fakeTarget>;
type Emit = (
  entries: {
    target: Fake;
    isIntersecting: boolean;
    boundingClientRect: { bottom: number };
  }[],
) => void;

describe("initDrawOnView", () => {
  it("arms each element, plays it when it enters and stops observing it", () => {
    const element = fakeTarget();
    let emit: Emit = () => undefined;
    const unobserve = vi.fn();
    initDrawOnView<Fake>({
      elements: [element],
      factory: (callback) => {
        emit = callback;
        return { observe: vi.fn(), unobserve };
      },
    });
    expect(element.state).toBe("armed");

    emit([
      {
        target: element,
        isIntersecting: false,
        boundingClientRect: { bottom: 1200 },
      },
    ]);
    expect(element.state).toBe("armed");
    expect(unobserve).not.toHaveBeenCalled();

    emit([
      {
        target: element,
        isIntersecting: true,
        boundingClientRect: { bottom: 500 },
      },
    ]);
    expect(element.state).toBe("play");
    expect(unobserve).toHaveBeenCalledWith(element);
  });

  it("leaves an element already scrolled past complete", () => {
    const element = fakeTarget();
    let emit: Emit = () => undefined;
    const unobserve = vi.fn();
    initDrawOnView<Fake>({
      elements: [element],
      factory: (callback) => {
        emit = callback;
        return { observe: vi.fn(), unobserve };
      },
    });
    emit([
      {
        target: element,
        isIntersecting: false,
        boundingClientRect: { bottom: -40 },
      },
    ]);
    expect(element.state).toBe("done");
    expect(unobserve).toHaveBeenCalledWith(element);
  });

  it("does nothing without elements", () => {
    const factory = vi.fn();
    initDrawOnView({ elements: [], factory });
    expect(factory).not.toHaveBeenCalled();
  });
});
