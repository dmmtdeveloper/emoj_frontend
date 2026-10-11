import { describe, expect, it } from "vitest";
import {
  projectCountByService,
  projectCountLabel,
  projectsOfService,
} from "../src/lib/content/service-stats";

const p = (services: string[]) => ({ services });

describe("projectCountByService", () => {
  it("counts every published project under each of its services", () => {
    const counts = projectCountByService([
      p(["obras-sanitarias"]),
      p(["obras-sanitarias", "geotecnia"]),
      p(["obras-viales"]),
    ]);
    expect(counts.get("obras-sanitarias")).toBe(2);
    expect(counts.get("geotecnia")).toBe(1);
    expect(counts.get("obras-viales")).toBe(1);
  });

  it("leaves services without projects out", () => {
    expect(projectCountByService([]).has("aguas-lluvias")).toBe(false);
  });

  it("counts a project once even if it lists a service twice", () => {
    expect(
      projectCountByService([p(["geotecnia", "geotecnia"])]).get("geotecnia"),
    ).toBe(1);
  });
});

describe("projectCountLabel", () => {
  it("says nothing when there are no projects yet", () => {
    expect(projectCountLabel(0)).toBe("");
  });

  it("uses the singular for one project and the plural otherwise", () => {
    expect(projectCountLabel(1)).toBe("1 proyecto");
    expect(projectCountLabel(12)).toBe("12 proyectos");
  });
});

describe("projectsOfService", () => {
  const list = [
    { slug: "a", services: ["obras-viales"] },
    { slug: "b", services: ["geotecnia"] },
    { slug: "c", services: ["geotecnia", "obras-viales"] },
  ];

  it("keeps the projects that list the service, in the given order", () => {
    expect(projectsOfService(list, "obras-viales").map((x) => x.slug)).toEqual([
      "a",
      "c",
    ]);
  });

  it("returns nothing for a service without projects", () => {
    expect(projectsOfService(list, "aguas-lluvias")).toEqual([]);
  });
});
