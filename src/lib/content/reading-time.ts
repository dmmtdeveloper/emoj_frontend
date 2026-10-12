/**
 * Estimated reading time of an article, from the words of its TipTap body
 * (src/lib/content/tiptap.ts) plus any extra text shown with it, such as
 * the excerpt. 200 words per minute, rounded up, one minute at least.
 */

const WORDS_PER_MINUTE = 200;
const MAX_DEPTH = 64;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function nodeWords(node: unknown, depth: number): number {
  if (depth > MAX_DEPTH || typeof node !== "object" || node === null) return 0;
  const { text, content } = node as { text?: unknown; content?: unknown };
  let total = typeof text === "string" ? countWords(text) : 0;
  if (Array.isArray(content)) {
    for (const child of content) total += nodeWords(child, depth + 1);
  }
  return total;
}

export function readingMinutes(doc: unknown, extra = ""): number {
  const words = nodeWords(doc, 0) + countWords(extra);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function readingTimeLabel(minutes: number): string {
  return `${minutes} min de lectura`;
}
