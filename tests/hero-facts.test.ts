import { describe, expect, it } from "vitest";
import { heroFacts } from "../src/lib/hero-facts";

describe("heroFacts", () => {
  it("lists the four facts of the hero data strip, in order", () => {
    expect(heroFacts(7)).toEqual([
      { label: "Experiencia", value: "30+ años" },
      { label: "Especialidades", value: "7 coordinadas" },
      { label: "Base", value: "Quilpué, Valparaíso" },
      { label: "Zona", value: "Valparaíso y Coquimbo" },
    ]);
  });

  it("counts the specialties from the services, so it never goes stale", () => {
    expect(heroFacts(8)[1]).toEqual({
      label: "Especialidades",
      value: "8 coordinadas",
    });
  });
});
