/**
 * Estimated reading time of an article, from the words of its Markdown body
 * (src/content/noticias/*.md) plus any extra text shown with it, such as
 * the excerpt. Markdown syntax on its own (heading marks, list bullets,
 * quote marks, rules) is not a word. 200 words per minute, rounded up, one
 * minute at least.
 */

const WORDS_PER_MINUTE = 200;

/** A token with at least one letter or digit is a word. */
const WORD = /[\p{L}\p{N}]/u;

/** Block marks at the start of a line: `## `, `- `, `1. `, `> `. */
const LINE_MARKS = /^(?:\s*(?:#{1,6}|[-*+]|\d+[.)]|>))+\s+/gm;

function countWords(text: string): number {
  return text
    .replace(LINE_MARKS, "")
    .split(/\s+/)
    .filter((token) => WORD.test(token)).length;
}

export function readingMinutes(
  markdown: string,
  extra = "",
  wordsPerMinute = WORDS_PER_MINUTE,
): number {
  const words = countWords(markdown) + countWords(extra);
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function readingTimeLabel(minutes: number): string {
  return `${minutes} min de lectura`;
}
