/**
 * Timing for an autoplaying photo slideshow (the home hero). It only keeps
 * the index and the timer; the page (src/scripts/hero-slideshow.ts) shows
 * the change. It runs while the person has not paused it and the photos
 * are on screen (`setVisible`), and always waits a full interval after
 * resuming so a photo is never cut short.
 */

export interface SlideshowTimer {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface Slideshow {
  readonly index: number;
  /** The person's choice (the pause button), regardless of visibility. */
  readonly playing: boolean;
  start(): void;
  play(): void;
  pause(): void;
  setVisible(visible: boolean): void;
}

const defaultTimer: SlideshowTimer = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createSlideshow(options: {
  count: number;
  interval: number;
  onChange: (index: number, previous: number) => void;
  timer?: SlideshowTimer;
}): Slideshow {
  const { count, interval, onChange, timer = defaultTimer } = options;
  let index = 0;
  let playing = true;
  let visible = true;
  let started = false;
  let handle: unknown = null;

  const stop = () => {
    if (handle !== null) timer.clear(handle);
    handle = null;
  };

  const schedule = () => {
    stop();
    if (!started || !playing || !visible || count < 2) return;
    handle = timer.set(() => {
      handle = null;
      const previous = index;
      index = (index + 1) % count;
      onChange(index, previous);
      schedule();
    }, interval);
  };

  return {
    get index() {
      return index;
    },
    get playing() {
      return playing;
    },
    start() {
      started = true;
      schedule();
    },
    play() {
      playing = true;
      schedule();
    },
    pause() {
      playing = false;
      stop();
    },
    setVisible(next) {
      visible = next;
      schedule();
    },
  };
}
