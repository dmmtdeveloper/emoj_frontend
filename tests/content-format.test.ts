import { describe, expect, it } from "vitest";
import type { ProjectSummary } from "../src/lib/api/client";
import {
  formatDate,
  initials,
  paginate,
  projectFacets,
  shareLinks,
} from "../src/lib/content/format";

describe("formatDate", () => {
  it("formats an ISO date in Spanish (Chile), in Santiago time", () => {
    expect(formatDate("2025-12-18T13:28:52Z")).toBe("18 de diciembre de 2025");
  });

  it("uses the Santiago calendar day near midnight UTC", () => {
    // 02:00 UTC on May 8 is still May 7 in Santiago (UTC-4).
    expect(formatDate("2025-05-08T02:00:00Z")).toBe("7 de mayo de 2025");
  });
});

describe("paginate", () => {
  it("splits items into pages of the given size", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single empty page for no items", () => {
    expect(paginate([], 12)).toEqual([[]]);
  });

  it("returns one page when items fit", () => {
    expect(paginate([1, 2], 12)).toEqual([[1, 2]]);
  });
});

describe("shareLinks", () => {
  const links = shareLinks(
    "https://emoj.cl/noticias/visita-tecnica",
    "Visita técnica & más",
  );

  it("builds a LinkedIn share URL", () => {
    expect(links.linkedin).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Femoj.cl%2Fnoticias%2Fvisita-tecnica",
    );
  });

  it("builds a WhatsApp share URL with the title and the URL", () => {
    expect(links.whatsapp).toBe(
      "https://wa.me/?text=Visita%20t%C3%A9cnica%20%26%20m%C3%A1s%20https%3A%2F%2Femoj.cl%2Fnoticias%2Fvisita-tecnica",
    );
  });
});

function project(
  slug: string,
  services: ProjectSummary["services"],
  region: string,
): ProjectSummary {
  return {
    id: slug,
    slug,
    title: slug,
    client: "",
    location: "",
    region,
    services,
    summary: "",
    featured: false,
    publishedAt: "2026-01-01T00:00:00Z",
  };
}

describe("projectFacets", () => {
  it("lists services in catalog order and regions alphabetically, with counts", () => {
    const facets = projectFacets([
      project("a", ["geotecnia"], "Región de Valparaíso"),
      project("b", ["obras-sanitarias", "geotecnia"], "Región de Coquimbo"),
      project("c", ["obras-sanitarias"], " Región de Valparaíso "),
      project("d", ["obras-viales"], ""),
    ]);
    expect(facets.services).toEqual([
      { value: "obras-sanitarias", count: 2 },
      { value: "obras-viales", count: 1 },
      { value: "geotecnia", count: 2 },
    ]);
    expect(facets.regions).toEqual([
      { value: "Región de Coquimbo", count: 1 },
      { value: "Región de Valparaíso", count: 2 },
    ]);
  });

  it("is empty for no projects", () => {
    expect(projectFacets([])).toEqual({ services: [], regions: [] });
  });
});

describe("initials", () => {
  it.each([
    ["Cristóbal Cea", "CC"],
    ["Patricio Astorga", "PA"],
    ["Maxell Cayupe", "MC"],
    ["eduardo olguín pérez", "EO"],
    ["Ana", "A"],
    ["  ", ""],
  ])("%s -> %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
