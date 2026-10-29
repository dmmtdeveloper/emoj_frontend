import { describe, expect, it } from "vitest";
import type { ProjectSummary } from "../src/lib/content/types";
import { coversByService } from "../src/lib/content/service-covers";

function project(
  slug: string,
  services: ProjectSummary["services"],
  cover?: string,
): ProjectSummary {
  return {
    id: slug,
    slug,
    title: slug,
    client: "",
    location: "",
    region: "",
    services,
    summary: "",
    featured: false,
    publishedAt: "2026-01-01T00:00:00Z",
    ...(cover
      ? {
          cover: {
            src: { src: cover, width: 2048, height: 1365, format: "jpg" },
            alt: `Foto de ${slug}`,
            width: 2048,
            height: 1365,
          },
        }
      : {}),
  };
}

describe("coversByService", () => {
  it("takes the cover of the newest project of each service", () => {
    const covers = coversByService(
      ["obras-sanitarias", "geotecnia"],
      [
        project("nuevo", ["obras-sanitarias"], "/_astro/nuevo.jpg"),
        project("viejo", ["obras-sanitarias"], "/_astro/viejo.jpg"),
        project("saam", ["geotecnia"], "/_astro/saam.jpg"),
      ],
    );
    expect(covers.get("obras-sanitarias")?.cover.src.src).toBe(
      "/_astro/nuevo.jpg",
    );
    expect(covers.get("geotecnia")?.cover.src.src).toBe("/_astro/saam.jpg");
    expect(covers.get("geotecnia")?.slug).toBe("saam");
  });

  it("skips projects without a cover and leaves services without one out", () => {
    const covers = coversByService(
      ["obras-viales", "aguas-lluvias"],
      [
        project("sin-foto", ["obras-viales"]),
        project("con-foto", ["obras-viales"], "/_astro/via.jpg"),
      ],
    );
    expect(covers.get("obras-viales")?.cover.src.src).toBe("/_astro/via.jpg");
    expect(covers.has("aguas-lluvias")).toBe(false);
  });

  it("prefers a photo no other service shows, but reuses one if it is the only option", () => {
    const covers = coversByService(
      ["obras-viales", "estudios-de-transito", "calculo-estructural"],
      [
        project(
          "pedro-montt",
          ["obras-viales", "estudios-de-transito"],
          "/_astro/pm.jpg",
        ),
        project("rotonda", ["estudios-de-transito"], "/_astro/rotonda.jpg"),
        project(
          "puente",
          ["calculo-estructural", "obras-viales"],
          "/_astro/puente.jpg",
        ),
      ],
    );
    expect(covers.get("obras-viales")?.cover.src.src).toBe("/_astro/pm.jpg");
    expect(covers.get("estudios-de-transito")?.cover.src.src).toBe(
      "/_astro/rotonda.jpg",
    );
    expect(covers.get("calculo-estructural")?.cover.src.src).toBe(
      "/_astro/puente.jpg",
    );

    const only = coversByService(
      ["obras-viales", "estudios-de-transito"],
      [
        project(
          "pedro-montt",
          ["obras-viales", "estudios-de-transito"],
          "/_astro/pm.jpg",
        ),
      ],
    );
    expect(only.get("estudios-de-transito")?.cover.src.src).toBe(
      "/_astro/pm.jpg",
    );
  });
});
