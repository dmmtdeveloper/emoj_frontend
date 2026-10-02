import { describe, expect, it } from "vitest";
import { splitEmphasis } from "../src/lib/emphasis";

describe("splitEmphasis", () => {
  it("splits the title around the first occurrence of the emphasis", () => {
    expect(
      splitEmphasis("¿Tienes un proyecto? Conversemos.", "Conversemos"),
    ).toEqual({
      before: "¿Tienes un proyecto? ",
      word: "Conversemos",
      after: ".",
    });
  });

  it("returns null when the title does not contain the emphasis", () => {
    expect(
      splitEmphasis("¿Tienes un proyecto similar?", "Conversemos"),
    ).toBeNull();
  });

  it("returns null for an empty emphasis", () => {
    expect(splitEmphasis("Conversemos", "")).toBeNull();
  });
});
