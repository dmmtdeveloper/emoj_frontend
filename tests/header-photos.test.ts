import { describe, expect, it } from "vitest";
import { headerPhotos } from "../src/lib/content/header-photos";

const cover = (name: string) => ({
  src: {
    src: `/_astro/${name}.jpg`,
    width: 1800,
    height: 1200,
    format: "jpg" as const,
  },
  alt: name,
  width: 1800,
  height: 1200,
});

const project = (slug: string, featured: boolean, withCover = true) => ({
  slug,
  title: slug,
  featured,
  ...(withCover ? { cover: cover(slug) } : {}),
});

describe("headerPhotos", () => {
  it("puts featured projects first, keeping list order otherwise", () => {
    const photos = headerPhotos(
      [
        project("a", false),
        project("b", true),
        project("c", false),
        project("d", true),
      ],
      10,
    );
    expect(photos.map((p) => p.slug)).toEqual(["b", "d", "a", "c"]);
  });

  it("skips projects without a cover", () => {
    const photos = headerPhotos(
      [project("a", true, false), project("b", false)],
      10,
    );
    expect(photos.map((p) => p.slug)).toEqual(["b"]);
    expect(photos[0]?.cover.alt).toBe("b");
  });

  it("keeps at most `limit` photos", () => {
    const many = Array.from({ length: 12 }, (_, i) => project(`p${i}`, false));
    expect(headerPhotos(many, 8)).toHaveLength(8);
  });

  it("returns nothing for no projects", () => {
    expect(headerPhotos([], 8)).toEqual([]);
  });
});
