import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  organizationJsonLd,
  projectJsonLd,
} from "../src/lib/structured-data";

describe("organizationJsonLd", () => {
  it("describes EMOJ as a ProfessionalService with real contact data", () => {
    const data = organizationJsonLd(new URL("https://emoj.cl"));

    expect(data["@type"]).toBe("ProfessionalService");
    expect(data.url).toBe("https://emoj.cl/");
    expect(data.email).toBe("coordinacion@emoj.cl");
    expect(data.telephone).toEqual(["+56322927790", "+56322920784"]);
    expect(data.address).toMatchObject({
      addressLocality: "Quilpué",
      addressRegion: "Región de Valparaíso",
      addressCountry: "CL",
    });
    expect(data.areaServed.map((area) => area.name)).toEqual([
      "Región de Valparaíso",
      "Región de Coquimbo",
    ]);
  });

  it("builds absolute URLs from the given site origin", () => {
    const data = organizationJsonLd(new URL("https://preview.example.com"));
    expect(data.logo).toBe("https://preview.example.com/icon-512.png");
  });
});

describe("projectJsonLd", () => {
  const base = {
    url: "https://emoj.cl/proyectos/puente",
    title: "Diseño estructural de puente Llollito",
    summary: "Diseño estructural del puente Llollito.",
    location: "San Antonio",
    region: "Región de Valparaíso",
    client: "",
    serviceNames: ["Cálculo estructural"],
  };

  it("describes a project as a CreativeWork created by EMOJ", () => {
    const data = projectJsonLd(
      { ...base, image: "https://emoj.cl/_astro/a.jpg" },
      new URL("https://emoj.cl"),
    );
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: base.title,
      description: base.summary,
      url: base.url,
      image: "https://emoj.cl/_astro/a.jpg",
      creator: { "@id": "https://emoj.cl/#organizacion" },
      about: ["Cálculo estructural"],
      locationCreated: {
        "@type": "Place",
        name: "San Antonio",
        address: {
          "@type": "PostalAddress",
          addressLocality: "San Antonio",
          addressRegion: "Región de Valparaíso",
          addressCountry: "CL",
        },
      },
    });
  });

  it("omits unknown facts instead of inventing them", () => {
    const data = projectJsonLd(base, new URL("https://emoj.cl"));
    expect(data).not.toHaveProperty("dateCreated");
    expect(data).not.toHaveProperty("funder");
    expect(data).not.toHaveProperty("image");
  });

  it("includes the year and client when present", () => {
    const data = projectJsonLd(
      { ...base, year: 2023, client: "SAAM" },
      new URL("https://emoj.cl"),
    );
    expect(data).toMatchObject({
      dateCreated: "2023",
      funder: { "@type": "Organization", name: "SAAM" },
    });
  });
});

describe("articleJsonLd", () => {
  it("describes a news article published by EMOJ", () => {
    const data = articleJsonLd(
      {
        url: "https://emoj.cl/noticias/x",
        title: "Visita técnica",
        description: "Resumen",
        publishedAt: "2025-12-18T13:28:52Z",
        category: "Proyectos",
        image: "https://emoj.cl/_astro/c.jpg",
      },
      new URL("https://emoj.cl"),
    );
    expect(data).toMatchObject({
      "@type": "Article",
      headline: "Visita técnica",
      description: "Resumen",
      datePublished: "2025-12-18T13:28:52Z",
      mainEntityOfPage: "https://emoj.cl/noticias/x",
      articleSection: "Proyectos",
      image: ["https://emoj.cl/_astro/c.jpg"],
      author: { "@id": "https://emoj.cl/#organizacion" },
      publisher: {
        "@type": "Organization",
        name: "EMOJ Consultora",
        logo: { "@type": "ImageObject", url: "https://emoj.cl/icon-512.png" },
      },
    });
  });

  it("omits an empty category and a missing image", () => {
    const data = articleJsonLd(
      {
        url: "https://emoj.cl/noticias/x",
        title: "T",
        description: "D",
        publishedAt: "2025-01-01T00:00:00Z",
        category: "",
      },
      new URL("https://emoj.cl"),
    );
    expect(data).not.toHaveProperty("articleSection");
    expect(data).not.toHaveProperty("image");
  });
});
