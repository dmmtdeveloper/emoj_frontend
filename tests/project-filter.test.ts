import { describe, expect, it } from "vitest";
import {
  matchesFilter,
  readFilter,
  writeFilter,
} from "../src/lib/content/project-filter";

const options = {
  services: ["obras-sanitarias", "geotecnia"],
  regions: ["Región de Coquimbo", "Región de Valparaíso"],
};

describe("matchesFilter", () => {
  const item = {
    services: ["obras-sanitarias", "geotecnia"],
    region: "Región de Coquimbo",
  };

  it.each([
    [{ service: "", region: "" }, true],
    [{ service: "geotecnia", region: "" }, true],
    [{ service: "obras-viales", region: "" }, false],
    [{ service: "", region: "Región de Coquimbo" }, true],
    [{ service: "", region: "Región de Valparaíso" }, false],
    [{ service: "geotecnia", region: "Región de Coquimbo" }, true],
    [{ service: "geotecnia", region: "Región de Valparaíso" }, false],
  ])("%j -> %s", (state, expected) => {
    expect(matchesFilter(item, state)).toBe(expected);
  });
});

describe("readFilter", () => {
  it("reads servicio and region from the query string", () => {
    expect(
      readFilter("?servicio=geotecnia&region=Regi%C3%B3n+de+Coquimbo", options),
    ).toEqual({ service: "geotecnia", region: "Región de Coquimbo" });
  });

  it("ignores values that are not offered", () => {
    expect(readFilter("?servicio=mineria&region=Biob%C3%ADo", options)).toEqual(
      { service: "", region: "" },
    );
  });

  it("defaults to no filter", () => {
    expect(readFilter("", options)).toEqual({ service: "", region: "" });
  });
});

describe("writeFilter", () => {
  it("keeps unrelated parameters and drops empty filters", () => {
    expect(
      writeFilter("?utm_source=x&servicio=geotecnia", {
        service: "",
        region: "Región de Coquimbo",
      }),
    ).toBe("?utm_source=x&region=Regi%C3%B3n+de+Coquimbo");
  });

  it("returns an empty string without parameters", () => {
    expect(
      writeFilter("?servicio=geotecnia", { service: "", region: "" }),
    ).toBe("");
  });
});
