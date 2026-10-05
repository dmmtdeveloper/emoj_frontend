import { describe, expect, it } from "vitest";
import { isAllowedLink, normalizeLink } from "../src/lib/admin/links";

describe("normalizeLink", () => {
  it("keeps http, https and mailto links", () => {
    expect(normalizeLink(" https://emoj.cl/servicios ")).toBe(
      "https://emoj.cl/servicios",
    );
    expect(normalizeLink("http://example.com")).toBe("http://example.com");
    expect(normalizeLink("mailto:coordinacion@emoj.cl")).toBe(
      "mailto:coordinacion@emoj.cl",
    );
  });

  it("completes addresses typed without a scheme", () => {
    expect(normalizeLink("www.mop.gob.cl")).toBe("https://www.mop.gob.cl");
    expect(normalizeLink("esval.cl/obras")).toBe("https://esval.cl/obras");
    expect(normalizeLink("coordinacion@emoj.cl")).toBe(
      "mailto:coordinacion@emoj.cl",
    );
  });

  it("rejects other schemes, spaces and empty input", () => {
    expect(normalizeLink("javascript:alert(1)")).toBeNull();
    expect(normalizeLink("ftp://archivos.cl")).toBeNull();
    expect(normalizeLink("no es un enlace")).toBeNull();
    expect(normalizeLink("   ")).toBeNull();
    expect(normalizeLink("https://")).toBeNull();
  });
});

describe("isAllowedLink", () => {
  it("accepts only absolute http, https and mailto URLs", () => {
    expect(isAllowedLink("https://emoj.cl")).toBe(true);
    expect(isAllowedLink("mailto:a@b.cl")).toBe(true);
    expect(isAllowedLink("/contacto")).toBe(false);
    expect(isAllowedLink("data:text/html,hola")).toBe(false);
  });
});
