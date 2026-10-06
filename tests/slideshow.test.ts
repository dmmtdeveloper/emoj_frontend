import { describe, expect, it, vi } from "vitest";
import {
  createSlideshow,
  type SlideshowTimer,
} from "../src/lib/motion/slideshow";

/** A manual timer: `tick()` fires whatever is pending. */
function fakeTimer() {
  let pending: { fn: () => void; ms: number } | null = null;
  const timer: SlideshowTimer = {
    set: (fn, ms) => {
      pending = { fn, ms };
      return pending;
    },
    clear: (handle) => {
      if (handle === pending) pending = null;
    },
  };
  return {
    timer,
    get pendingMs() {
      return pending?.ms ?? null;
    },
    tick() {
      const p = pending;
      pending = null;
      p?.fn();
    },
  };
}

function setup(count = 3) {
  const t = fakeTimer();
  const onChange = vi.fn();
  const show = createSlideshow({
    count,
    interval: 6000,
    onChange,
    timer: t.timer,
  });
  return { t, onChange, show };
}

describe("createSlideshow", () => {
  it("starts on the first photo and moves to the next one every interval, wrapping around", () => {
    const { t, onChange, show } = setup();
    show.start();
    expect(show.index).toBe(0);
    expect(t.pendingMs).toBe(6000);
    t.tick();
    t.tick();
    t.tick();
    expect(onChange.mock.calls).toEqual([
      [1, 0],
      [2, 1],
      [0, 2],
    ]);
    expect(show.index).toBe(0);
  });

  it("stops when paused and waits a full interval after playing again", () => {
    const { t, onChange, show } = setup();
    show.start();
    show.pause();
    expect(show.playing).toBe(false);
    expect(t.pendingMs).toBeNull();
    show.play();
    expect(show.playing).toBe(true);
    expect(t.pendingMs).toBe(6000);
    t.tick();
    expect(onChange).toHaveBeenCalledWith(1, 0);
  });

  it("holds while out of view and resumes when it comes back", () => {
    const { t, show } = setup();
    show.start();
    show.setVisible(false);
    expect(t.pendingMs).toBeNull();
    // Still "playing" for the person: only the screen hid it.
    expect(show.playing).toBe(true);
    show.setVisible(true);
    expect(t.pendingMs).toBe(6000);
  });

  it("does not resume on coming back into view if the person paused it", () => {
    const { t, show } = setup();
    show.start();
    show.pause();
    show.setVisible(false);
    show.setVisible(true);
    expect(t.pendingMs).toBeNull();
  });

  it("never schedules anything with a single photo", () => {
    const { t, show } = setup(1);
    show.start();
    expect(t.pendingMs).toBeNull();
  });
});
