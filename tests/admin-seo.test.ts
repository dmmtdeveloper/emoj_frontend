import { describe, expect, it } from "vitest";
import { searchPreview, seoLength } from "../src/lib/admin/seo";

describe("seoLength", () => {
  it("rates the SEO title length", () => {
    expect(seoLength("", "title")).toBe("empty");
    expect(seoLength("Canal", "title")).toBe("short");
    expect(seoLength("x".repeat(45), "title")).toBe("good");
    expect(seoLength("x".repeat(61), "title")).toBe("long");
  });

  it("rates the description length", () => {
    expect(seoLength("x".repeat(40), "description")).toBe("short");
    expect(seoLength("x".repeat(120), "description")).toBe("good");
    expect(seoLength("x".repeat(170), "description")).toBe("long");
  });
});

describe("searchPreview", () => {
  it("falls back to the title and summary like the public page", () => {
    const preview = searchPreview({
      section: "proyectos",
      slug: "canal-la-petaca",
      title: "Canal La Petaca",
      seoTitle: "",
      seoDescription: "",
      fallbackDescription: "Revestimiento del canal.",
    });
    expect(preview).toEqual({
      title: "Canal La Petaca | EMOJ Consultora",
      url: "emoj.cl › proyectos › canal-la-petaca",
      description: "Revestimiento del canal.",
    });
  });

  it("prefers the SEO overrides and cuts long text like a search result", () => {
    const preview = searchPreview({
      section: "noticias",
      slug: "",
      title: "Visita técnica",
      seoTitle: "Visita técnica al canal La Petaca en Limache con el equipo",
      seoDescription: "d".repeat(170),
      fallbackDescription: "",
    });
    expect(preview.title.endsWith("…")).toBe(true);
    expect([...preview.title].length).toBeLessThanOrEqual(61);
    expect(preview.url).toBe("emoj.cl › noticias › …");
    expect([...preview.description].length).toBe(161);
  });
});
