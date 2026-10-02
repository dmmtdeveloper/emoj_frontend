import { describe, expect, it } from "vitest";
import { projectTransitionName } from "../src/lib/content/transition";

describe("projectTransitionName", () => {
  it("prefixes the slug so the name never starts with a digit", () => {
    expect(projectTransitionName("diseno-estructural-puente-llollito")).toBe(
      "project-diseno-estructural-puente-llollito",
    );
    expect(projectTransitionName("2025-planta")).toBe("project-2025-planta");
  });

  it("replaces characters that are not valid in a CSS identifier", () => {
    expect(projectTransitionName("Planta de Agua/Ñuñoa")).toBe(
      "project-planta-de-agua-u-oa",
    );
  });

  it("gives the same name for the same slug (card and detail page match)", () => {
    expect(projectTransitionName("a-b")).toBe(projectTransitionName("a-b"));
  });
});
