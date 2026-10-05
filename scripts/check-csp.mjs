/**
 * Fails the build if any page has inline JavaScript or CSS. Production
 * serves `script-src 'self'` and `style-src 'self'` (vercel.ts), so an
 * inline <script>, <style> or style="" attribute is silently blocked in the
 * browser while working fine in `astro dev` (no CSP there). JSON-LD blocks
 * are data, not executed, and are allowed.
 *
 * Usage: node scripts/check-csp.mjs [dist]
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

const RULES = [
  {
    name: "inline <script>",
    pattern:
      /<script\b(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/gi,
  },
  { name: "<style> element", pattern: /<style\b[^>]*>/gi },
  { name: 'style="" attribute', pattern: /<[a-z][^>]*\sstyle="/gi },
];

let problems = 0;
let pages = 0;
for await (const file of htmlFiles(dist)) {
  pages++;
  const html = await readFile(file, "utf8");
  for (const rule of RULES) {
    const count = html.match(rule.pattern)?.length ?? 0;
    if (count > 0) {
      problems++;
      console.error(`${file}: ${count} × ${rule.name}`);
    }
  }
}

if (problems > 0) {
  console.error(
    `\nThe production Content-Security-Policy would block the inline code above (${problems} problem(s)). Move it to a .css/.ts file.`,
  );
  process.exit(1);
}
console.log(`CSP check: ${pages} pages, no inline scripts or styles.`);
