import { describe, expect, it } from "vitest";
import type { ProjectSummary } from "../src/lib/api/client";
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
            url: cover,
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
        project("nuevo", ["obras-sanitarias"], "https://cdn/nuevo.jpg"),
        project("viejo", ["obras-sanitarias"], "https://cdn/viejo.jpg"),
        project("saam", ["geotecnia"], "https://cdn/saam.jpg"),
      ],
    );
    expect(covers.get("obras-sanitarias")?.url).toBe("https://cdn/nuevo.jpg");
    expect(covers.get("geotecnia")?.url).toBe("https://cdn/saam.jpg");
  });

  it("skips projects without a cover and leaves services without one out", () => {
    const covers = coversByService(
      ["obras-viales", "aguas-lluvias"],
      [
        project("sin-foto", ["obras-viales"]),
        project("con-foto", ["obras-viales"], "https://cdn/via.jpg"),
      ],
    );
    expect(covers.get("obras-viales")?.url).toBe("https://cdn/via.jpg");
    expect(covers.has("aguas-lluvias")).toBe(false);
  });

  it("prefers a photo no other service shows, but reuses one if it is the only option", () => {
    const covers = coversByService(
      ["obras-viales", "estudios-de-transito", "calculo-estructural"],
      [
        project(
          "pedro-montt",
          ["obras-viales", "estudios-de-transito"],
          "https://cdn/pm.jpg",
        ),
        project("rotonda", ["estudios-de-transito"], "https://cdn/rotonda.jpg"),
        project(
          "puente",
          ["calculo-estructural", "obras-viales"],
          "https://cdn/puente.jpg",
        ),
      ],
    );
    expect(covers.get("obras-viales")?.url).toBe("https://cdn/pm.jpg");
    expect(covers.get("estudios-de-transito")?.url).toBe(
      "https://cdn/rotonda.jpg",
    );
    expect(covers.get("calculo-estructural")?.url).toBe(
      "https://cdn/puente.jpg",
    );

    const only = coversByService(
      ["obras-viales", "estudios-de-transito"],
      [
        project(
          "pedro-montt",
          ["obras-viales", "estudios-de-transito"],
          "https://cdn/pm.jpg",
        ),
      ],
    );
    expect(only.get("estudios-de-transito")?.url).toBe("https://cdn/pm.jpg");
  });
});
