import { describe, expect, it } from "vitest";
import { sectionAt } from "../src/lib/motion/nav-spy";

const sections = [
  { href: "/servicios", top: 900, bottom: 2000 },
  { href: "/proyectos", top: 2000, bottom: 3000 },
  { href: "/nosotros", top: 3000, bottom: 5000 },
];

describe("sectionAt", () => {
  it("returns the section that crosses the reading line", () => {
    expect(sectionAt(sections, 1500)).toBe("/servicios");
    expect(sectionAt(sections, 2000)).toBe("/proyectos");
    expect(sectionAt(sections, 4999)).toBe("/nosotros");
  });

  it("returns null above the first section", () => {
    expect(sectionAt(sections, 300)).toBeNull();
  });

  it("keeps the last section past the end (the footer belongs to it)", () => {
    expect(sectionAt(sections, 5000)).toBe("/nosotros");
    expect(sectionAt(sections, 9000)).toBe("/nosotros");
  });

  it("returns null in a gap between sections that are not annotated", () => {
    const gappy = [
      { href: "/servicios", top: 0, bottom: 100 },
      { href: "/contacto", top: 300, bottom: 400 },
    ];
    expect(sectionAt(gappy, 200)).toBeNull();
  });

  it("works with an empty list", () => {
    expect(sectionAt([], 10)).toBeNull();
  });
});
