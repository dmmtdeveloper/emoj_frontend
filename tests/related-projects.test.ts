import { describe, expect, it } from "vitest";
import {
  adjacentProjects,
  relatedProjects,
} from "../src/lib/content/related-projects";
import { stepIndex } from "../src/lib/motion/lightbox";

const p = (slug: string, services: string[]) => ({ slug, services });

const a = p("a", ["obras-viales"]);
const b = p("b", ["obras-sanitarias"]);
const all = [
  a,
  b,
  p("c", ["calculo-estructural"]),
  p("d", ["obras-sanitarias", "geotecnia"]),
  p("e", ["geotecnia"]),
];

describe("relatedProjects", () => {
  it("leaves out the current project", () => {
    const slugs = relatedProjects(all, b, 10).map((x) => x.slug);
    expect(slugs).not.toContain("b");
    expect(slugs).toHaveLength(4);
  });

  it("puts projects that share a specialty first, keeping the list order", () => {
    const slugs = relatedProjects(all, p("x", ["geotecnia"]), 10).map(
      (x) => x.slug,
    );
    expect(slugs).toEqual(["d", "e", "a", "b", "c"]);
  });

  it("caps the list", () => {
    expect(relatedProjects(all, a, 2)).toHaveLength(2);
  });
});

describe("adjacentProjects", () => {
  it("returns the previous and next project in list order", () => {
    const { prev, next } = adjacentProjects(all, "c");
    expect(prev?.slug).toBe("b");
    expect(next?.slug).toBe("d");
  });

  it("wraps around at both ends", () => {
    expect(adjacentProjects(all, "a").prev?.slug).toBe("e");
    expect(adjacentProjects(all, "e").next?.slug).toBe("a");
  });

  it("returns nothing when the project is unknown or alone", () => {
    expect(adjacentProjects(all, "zz")).toEqual({ prev: null, next: null });
    expect(adjacentProjects([a], "a")).toEqual({
      prev: null,
      next: null,
    });
  });
});

describe("stepIndex", () => {
  it("moves forward and back, wrapping around", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it("stays at 0 when there is nothing to show", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});
