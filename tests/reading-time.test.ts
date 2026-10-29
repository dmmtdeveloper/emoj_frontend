import { describe, expect, it } from "vitest";
import {
  readingMinutes,
  readingTimeLabel,
} from "../src/lib/content/reading-time";

const words = (n: number) =>
  Array.from({ length: n }, () => "palabra").join(" ");

describe("readingMinutes", () => {
  it("counts the words of the Markdown body, lists and quotes included", () => {
    const body = [
      words(100),
      `## ${words(50)}`,
      `- ${words(125)}`,
      `- ${words(125)}`,
    ].join("\n\n");
    // 400 words at 200 per minute.
    expect(readingMinutes(body)).toBe(2);
  });

  it("does not count Markdown syntax as words", () => {
    const body = [
      "## Título",
      "- **Uno**",
      "1. Dos",
      "> “Tres”",
      "---",
      "* _cuatro_",
    ].join("\n\n");
    expect(readingMinutes(body, "", 5)).toBe(1);
    expect(readingMinutes(body, "", 4)).toBe(2);
  });

  it("rounds up and never says less than one minute", () => {
    expect(readingMinutes(words(201))).toBe(2);
    expect(readingMinutes("Hola")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("adds the words of extra text, such as the excerpt", () => {
    expect(readingMinutes(words(190), words(20))).toBe(2);
  });
});

describe("readingTimeLabel", () => {
  it("says the minutes in Spanish", () => {
    expect(readingTimeLabel(1)).toBe("1 min de lectura");
    expect(readingTimeLabel(4)).toBe("4 min de lectura");
  });
});
