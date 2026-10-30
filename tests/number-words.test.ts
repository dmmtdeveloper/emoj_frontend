import { describe, expect, it } from "vitest";
import { spanishNumberWord } from "../src/lib/number-words";

describe("spanishNumberWord", () => {
  it("spells the small counts the copy uses", () => {
    expect(spanishNumberWord(1)).toBe("una");
    expect(spanishNumberWord(2)).toBe("dos");
    expect(spanishNumberWord(6)).toBe("seis");
    expect(spanishNumberWord(7)).toBe("siete");
    expect(spanishNumberWord(10)).toBe("diez");
    expect(spanishNumberWord(12)).toBe("doce");
  });

  it("uses the masculine form for one when asked", () => {
    expect(spanishNumberWord(1, { gender: "masculine" })).toBe("uno");
    expect(spanishNumberWord(7, { gender: "masculine" })).toBe("siete");
  });

  it("capitalizes the first letter for the start of a sentence", () => {
    expect(spanishNumberWord(7, { capitalize: true })).toBe("Siete");
    expect(spanishNumberWord(6, { capitalize: true })).toBe("Seis");
  });

  it("falls back to digits outside the spelled range", () => {
    expect(spanishNumberWord(0)).toBe("0");
    expect(spanishNumberWord(13)).toBe("13");
    expect(spanishNumberWord(-2)).toBe("-2");
    expect(spanishNumberWord(2.5)).toBe("2.5");
  });
});
