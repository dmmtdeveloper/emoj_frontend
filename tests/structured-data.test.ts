import { describe, expect, it } from "vitest";
import { organizationJsonLd } from "../src/lib/structured-data";

describe("organizationJsonLd", () => {
  it("describes EMOJ as a ProfessionalService with real contact data", () => {
    const data = organizationJsonLd(new URL("https://emoj.cl"));

    expect(data["@type"]).toBe("ProfessionalService");
    expect(data.url).toBe("https://emoj.cl/");
    expect(data.email).toBe("coordinacion@emoj.cl");
    expect(data.telephone).toEqual(["+56322927790", "+56322920784"]);
    expect(data.address).toMatchObject({
      addressLocality: "Quilpué",
      addressRegion: "Región de Valparaíso",
      addressCountry: "CL",
    });
    expect(data.areaServed.map((area) => area.name)).toEqual([
      "Región de Valparaíso",
      "Región de Coquimbo",
    ]);
  });

  it("builds absolute URLs from the given site origin", () => {
    const data = organizationJsonLd(new URL("https://preview.example.com"));
    expect(data.logo).toBe("https://preview.example.com/icon-512.png");
  });
});
