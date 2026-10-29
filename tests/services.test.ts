import { describe, expect, it } from "vitest";
import { SERVICE_SLUGS, isServiceSlug } from "../src/lib/services";

describe("SERVICE_SLUGS", () => {
  it("lists the seven services once each", () => {
    expect(new Set(SERVICE_SLUGS).size).toBe(7);
  });
});

describe("isServiceSlug", () => {
  it("accepts service slugs and rejects anything else", () => {
    expect(isServiceSlug("geotecnia")).toBe(true);
    expect(isServiceSlug("otro")).toBe(false);
    expect(isServiceSlug("")).toBe(false);
  });
});
