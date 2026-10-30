import { describe, expect, it } from "vitest";
import { chapterNumbers } from "../src/lib/home-chapters";

describe("chapterNumbers", () => {
  it("numbers the rendered chapters from 02 (the hero is 01)", () => {
    expect(chapterNumbers(["services", "work", "plan"])).toEqual({
      services: "02",
      work: "03",
      plan: "04",
    });
  });

  it("closes the gap left by a chapter that is not rendered", () => {
    const numbers = chapterNumbers([
      "services",
      "work",
      "plan",
      "years",
      "reasons",
      "contact",
    ]);
    expect(numbers["plan"]).toBe("04");
    expect(numbers["years"]).toBe("05");
    expect(numbers["contact"]).toBe("07");
  });

  it("pads to two digits and accepts another first number", () => {
    expect(chapterNumbers(["a"], 9)).toEqual({ a: "09" });
    expect(chapterNumbers(["a", "b"], 10)).toEqual({ a: "10", b: "11" });
  });

  it("is empty without chapters", () => {
    expect(chapterNumbers([])).toEqual({});
  });
});
