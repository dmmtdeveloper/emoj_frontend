import { describe, expect, it } from "vitest";
import { railProjects } from "../src/lib/content/rail-projects";

const p = (slug: string, featured: boolean) => ({ slug, featured });

describe("railProjects", () => {
  it("puts the featured projects first and keeps the given order in each group", () => {
    const list = [p("a", false), p("b", true), p("c", false), p("d", true)];
    expect(railProjects(list, 10).map((x) => x.slug)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("stops at the limit", () => {
    const list = [p("a", false), p("b", true), p("c", false)];
    expect(railProjects(list, 2).map((x) => x.slug)).toEqual(["b", "a"]);
  });

  it("is empty when there are no projects", () => {
    expect(railProjects([], 12)).toEqual([]);
  });
});
