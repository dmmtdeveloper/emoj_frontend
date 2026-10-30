import type { ImageMetadata } from "astro";
import { describe, expect, it } from "vitest";
import {
  assertNamedBySlug,
  contentImage,
  newestFirst,
} from "../src/lib/content/collections";

const metadata: ImageMetadata = {
  src: "/_astro/portada.abc123.jpg",
  width: 1920,
  height: 2560,
  format: "jpg",
};

describe("contentImage", () => {
  it("takes the size from the image file itself", () => {
    expect(contentImage({ src: metadata, alt: "Canal La Petaca." })).toEqual({
      src: metadata,
      alt: "Canal La Petaca.",
      width: 1920,
      height: 2560,
    });
  });

  it("keeps a missing image missing", () => {
    expect(contentImage(undefined)).toBeUndefined();
  });
});

describe("newestFirst", () => {
  const items = [
    { slug: "b", publishedAt: "2025-05-08T18:19:04Z" },
    { slug: "a", publishedAt: "2025-12-18T13:28:52Z" },
    { slug: "c", publishedAt: "2026-10-06T20:46:22.733413Z" },
  ];

  it("orders by publication date, newest first", () => {
    expect(newestFirst(items).map((i) => i.slug)).toEqual(["c", "a", "b"]);
  });

  it("compares instants, not strings", () => {
    const sameDay = [
      { slug: "early", publishedAt: "2026-10-06T20:46:20.700035Z" },
      { slug: "late", publishedAt: "2026-10-06T20:46:21Z" },
    ];
    expect(newestFirst(sameDay).map((i) => i.slug)).toEqual(["late", "early"]);
  });

  it("does not change the list it is given", () => {
    newestFirst(items);
    expect(items.map((i) => i.slug)).toEqual(["b", "a", "c"]);
  });
});

describe("assertNamedBySlug", () => {
  it("accepts files named after their slug", () => {
    expect(() =>
      assertNamedBySlug("proyectos", [
        { filePath: "src/content/proyectos/a-b.md", data: { slug: "a-b" } },
      ]),
    ).not.toThrow();
  });

  it("fails when a file name and its slug differ", () => {
    expect(() =>
      assertNamedBySlug("noticias", [
        { filePath: "src/content/noticias/otro.md", data: { slug: "a-b" } },
      ]),
    ).toThrow(
      'src/content/noticias/otro.md must be named after its slug "a-b"',
    );
  });
});
