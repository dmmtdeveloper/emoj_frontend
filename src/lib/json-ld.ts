/** JSON unicode escape for `<`: a backslash (char code 92) followed by "u003c". */
const ESCAPED_LT = `${String.fromCharCode(92)}u003c`;

/**
 * Serialize structured data for a `<script type="application/ld+json">` tag.
 * `<` is escaped so a value can never close the script element early.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, ESCAPED_LT);
}
