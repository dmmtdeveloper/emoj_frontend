import { describe, expect, it } from "vitest";
import { mergeRecent, relativeTime } from "../src/lib/admin/dashboard";

const NOW = new Date("2026-10-13T18:00:00-03:00");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("says 'recién' under a minute", () => {
    expect(relativeTime(ago(20_000), NOW)).toBe("recién");
  });

  it("counts minutes and hours", () => {
    expect(relativeTime(ago(5 * MIN), NOW)).toBe("hace 5 min");
    expect(relativeTime(ago(3 * HOUR), NOW)).toBe("hace 3 h");
  });

  it("says 'ayer' for the previous calendar day in Santiago", () => {
    expect(relativeTime("2026-10-12T22:30:00-03:00", NOW)).toBe("ayer");
  });

  it("counts days within a week", () => {
    expect(relativeTime(ago(4 * DAY), NOW)).toBe("hace 4 días");
  });

  it("falls back to the date after a week", () => {
    expect(relativeTime("2026-09-20T10:00:00-03:00", NOW)).toBe("20 sept 2026");
  });

  it("treats a future timestamp (clock skew) as 'recién'", () => {
    expect(relativeTime(ago(-2 * MIN), NOW)).toBe("recién");
  });
});

describe("mergeRecent", () => {
  const project = (id: string, updatedAt: string) => ({ id, updatedAt });

  it("interleaves projects and news, last updated first, up to the limit", () => {
    const merged = mergeRecent(
      [project("p1", ago(1 * HOUR)), project("p2", ago(5 * HOUR))],
      [project("n1", ago(2 * HOUR)), project("n2", ago(9 * HOUR))],
      3,
    );
    expect(merged.map((r) => [r.kind, r.item.id])).toEqual([
      ["project", "p1"],
      ["news", "n1"],
      ["project", "p2"],
    ]);
  });

  it("works when one list is empty", () => {
    expect(mergeRecent([], [project("n1", ago(HOUR))], 5)).toHaveLength(1);
  });
});
