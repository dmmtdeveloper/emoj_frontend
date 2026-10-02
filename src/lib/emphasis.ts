/**
 * Splits a heading around the phrase that gets the hand-drawn underline
 * (`Scribble`). Returns null when there is nothing to emphasize, so the
 * caller renders the plain title.
 */
export interface EmphasisParts {
  before: string;
  word: string;
  after: string;
}

export function splitEmphasis(
  title: string,
  emphasis: string,
): EmphasisParts | null {
  if (!emphasis) return null;
  const at = title.indexOf(emphasis);
  if (at === -1) return null;
  return {
    before: title.slice(0, at),
    word: emphasis,
    after: title.slice(at + emphasis.length),
  };
}
