import { describe, expect, it } from "vitest";
import { isCurrent, RUT } from "../src/lib/site";

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

describe("RUT", () => {
  it("is EMOJ Consultora SpA's tax ID with a valid check digit", () => {
    expect(RUT).toBe("76.956.190-0");
    const [body = "", dv] = RUT.replaceAll(".", "").split("-");
    let sum = 0;
    let factor = 2;
    for (const digit of [...body].reverse()) {
      sum += Number(digit) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const expected = 11 - (sum % 11);
    expect(dv).toBe(
      expected === 11 ? "0" : expected === 10 ? "K" : String(expected),
    );
  });
});
