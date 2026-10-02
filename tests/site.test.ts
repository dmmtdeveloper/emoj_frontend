import { describe, expect, it } from "vitest";
import { isCurrent } from "../src/lib/site";

describe("isCurrent", () => {
  it("matches home only on the root path", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/", "/servicios")).toBe(false);
  });

  it("matches a section and its children, with or without trailing slash", () => {
    expect(isCurrent("/servicios", "/servicios")).toBe(true);
    expect(isCurrent("/servicios", "/servicios/")).toBe(true);
    expect(isCurrent("/servicios", "/servicios/geotecnia")).toBe(true);
  });

  it("does not match sections that only share a prefix", () => {
    expect(isCurrent("/servicios", "/servicios-extra")).toBe(false);
    expect(isCurrent("/contacto", "/servicios")).toBe(false);
  });
});
