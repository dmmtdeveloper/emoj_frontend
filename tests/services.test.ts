import { describe, expect, expectTypeOf, it } from "vitest";
import type { ServiceSlug } from "../src/lib/api/client";
import { SERVICE_SLUGS, isServiceSlug } from "../src/lib/services";

describe("SERVICE_SLUGS", () => {
  it("covers every ServiceSlug from the API contract", () => {
    expectTypeOf<(typeof SERVICE_SLUGS)[number]>().toEqualTypeOf<ServiceSlug>();
    expect(new Set(SERVICE_SLUGS).size).toBe(7);
  });
});

describe("isServiceSlug", () => {
  it("accepts API slugs and rejects anything else", () => {
    expect(isServiceSlug("geotecnia")).toBe(true);
    expect(isServiceSlug("otro")).toBe(false);
    expect(isServiceSlug("")).toBe(false);
  });
});
