import { describe, expect, it } from "vitest";
import {
  readingMinutes,
  readingTimeLabel,
} from "../src/lib/content/reading-time";

const words = (n: number) =>
  Array.from({ length: n }, () => "palabra").join(" ");
const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("readingMinutes", () => {
  it("counts the words of every text node, nested lists included", () => {
    const doc = {
      type: "doc",
      content: [
        paragraph(words(150)),
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [paragraph(words(250))] }],
        },
      ],
    };
    // 400 words at 200 per minute.
    expect(readingMinutes(doc)).toBe(2);
  });

  it("rounds up and never says less than one minute", () => {
    expect(
      readingMinutes({ type: "doc", content: [paragraph(words(201))] }),
    ).toBe(2);
    expect(readingMinutes({ type: "doc", content: [paragraph("Hola")] })).toBe(
      1,
    );
    expect(readingMinutes({ type: "doc" })).toBe(1);
  });

  it("adds the words of extra text, such as the excerpt", () => {
    const doc = { type: "doc", content: [paragraph(words(190))] };
    expect(readingMinutes(doc, words(20))).toBe(2);
  });

  it("ignores malformed nodes", () => {
    expect(
      readingMinutes({ type: "doc", content: [null, 3, { text: 5 }] }),
    ).toBe(1);
  });
});

describe("readingTimeLabel", () => {
  it("says the minutes in Spanish", () => {
    expect(readingTimeLabel(1)).toBe("1 min de lectura");
    expect(readingTimeLabel(4)).toBe("4 min de lectura");
  });
});
