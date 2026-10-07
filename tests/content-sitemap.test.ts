import { describe, expect, it } from "vitest";
import { contentSitemap } from "../src/lib/content/sitemap";

const site = new URL("https://emoj.cl");

describe("contentSitemap", () => {
  it("lists the pages rendered on demand: home, listings, pages and items", () => {
    const xml = contentSitemap(site, {
      projects: [
        { slug: "planta-elevadora", publishedAt: "2026-09-01T12:00:00Z" },
      ],
      news: Array.from({ length: 13 }, (_, i) => ({
        slug: `nota-${i + 1}`,
        publishedAt: "2026-10-01T12:00:00Z",
      })),
      perPage: 12,
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const path of [
      "/",
      "/proyectos",
      "/noticias",
      "/noticias/pagina/2",
      "/proyectos/planta-elevadora",
      "/noticias/nota-13",
    ]) {
      expect(xml).toContain(`<loc>https://emoj.cl${path}</loc>`);
    }
    expect(xml).not.toContain("/noticias/pagina/3");
    expect(xml).toContain("<lastmod>2026-09-01</lastmod>");
  });

  it("escapes characters that would break the XML", () => {
    const xml = contentSitemap(site, {
      projects: [{ slug: "a&b", publishedAt: "2026-09-01T12:00:00Z" }],
      news: [],
      perPage: 12,
    });
    expect(xml).toContain("/proyectos/a&amp;b");
  });
});
