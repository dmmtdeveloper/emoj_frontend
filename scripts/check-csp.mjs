/**
 * Fails the build if any page has inline JavaScript or CSS. Production
 * serves `script-src 'self'` and `style-src 'self'` (vercel.ts), so an
 * inline <script>, <style> or style="" attribute is silently blocked in the
 * browser while working fine in `astro dev` (no CSP there). JSON-LD blocks
 * are data, not executed, and are allowed.
 *
 * Checks the pages built ahead of time (.vercel/output/static) and renders
 * the pages built on demand through the built function: the home, the
 * listings, the not-found page and one project and one article taken from
 * the content sitemap. Those need the API in PUBLIC_API_URL; if it does not
 * answer, they are skipped with a warning (the static pages still count).
 *
 * Usage: node scripts/check-csp.mjs [output-dir]
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const output = process.argv[2] ?? ".vercel/output";
const dist = join(output, "static");
const entryFile = join(
  output,
  "functions/_render.func/.vercel/output/server/entry.mjs",
);

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

function check(name, html) {
  pages++;
  for (const rule of RULES) {
    const count = html.match(rule.pattern)?.length ?? 0;
    if (count > 0) {
      problems++;
      console.error(`${name}: ${count} × ${rule.name}`);
    }
  }
}

for await (const file of htmlFiles(dist)) {
  check(file, await readFile(file, "utf8"));
}

/** Pages rendered on demand, through the built Vercel function. */
async function checkOnDemand() {
  const { default: handler } = await import(
    pathToFileURL(resolve(entryFile)).href
  );
  const render = (path) =>
    handler.fetch(new Request(new URL(path, "https://emoj.cl")));
  const sitemap = await render("/sitemap-content.xml");
  if (!sitemap.ok) {
    console.warn(
      `CSP check: the API did not answer (HTTP ${sitemap.status}); pages rendered on demand were not checked.`,
    );
    return;
  }
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  const paths = [
    "/",
    "/proyectos",
    "/noticias",
    "/no-encontrada",
    locs.find((p) => p.startsWith("/proyectos/")),
    locs.find((p) => p.startsWith("/noticias/") && !p.includes("/pagina/")),
  ].filter(Boolean);
  for (const path of paths) {
    const res = await render(path);
    if (!(res.headers.get("content-type") ?? "").includes("html")) continue;
    check(`${path} (on demand)`, await res.text());
  }
}

await checkOnDemand();

if (problems > 0) {
  console.error(
    `\nThe production Content-Security-Policy would block the inline code above (${problems} problem(s)). Move it to a .css/.ts file.`,
  );
  process.exit(1);
}
console.log(`CSP check: ${pages} pages, no inline scripts or styles.`);
