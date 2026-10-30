import { describe, expect, it } from "vitest";
import { canonicalPath } from "../src/lib/canonical";

describe("canonicalPath", () => {
  it("drops the trailing slash the static build adds", () => {
    expect(canonicalPath("/proyectos/puente-llollito/")).toBe(
      "/proyectos/puente-llollito",
    );
    expect(canonicalPath("/nosotros/")).toBe("/nosotros");
  });

  it("keeps paths without a trailing slash", () => {
    expect(canonicalPath("/noticias")).toBe("/noticias");
  });

  it("keeps the home as /", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("")).toBe("/");
  });
});
