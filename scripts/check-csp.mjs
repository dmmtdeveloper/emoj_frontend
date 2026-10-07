/**
 * Fails the build if any page has inline JavaScript or CSS. Production
 * serves `script-src 'self'` and `style-src 'self'` (vercel.ts), so an
 * inline <script>, <style> or style="" attribute is silently blocked in the
 * browser while working fine in `astro dev` (no CSP there). JSON-LD blocks
 * are data, not executed, and are allowed.
 *
 * Checks the pages built ahead of time and renders the pages built on
 * demand: the home, the listings, the not-found page and one project and one
 * article taken from the content sitemap. Those need the API in
 * PUBLIC_API_URL; if it does not answer, they are skipped with a warning (the
 * static pages still count).
 *
 * Works on both builds (astro.config.mjs): the Vercel output (.vercel/output,
 * pages rendered through the built function) and the Node server (dist/,
 * pages rendered by starting dist/server/entry.mjs on a free local port).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const vercelOutput = ".vercel/output";
const onVercelBuild = existsSync(join(vercelOutput, "static"));
const dist = onVercelBuild ? join(vercelOutput, "static") : "dist/client";

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

/** Renders through the built Vercel function. */
async function vercelRenderer() {
  const entryFile = join(
    vercelOutput,
    "functions/_render.func/.vercel/output/server/entry.mjs",
  );
  const { default: handler } = await import(
    pathToFileURL(resolve(entryFile)).href
  );
  return {
    render: (path) =>
      handler.fetch(new Request(new URL(path, "https://emoj.cl"))),
    stop: () => undefined,
  };
}

function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

/** Renders through the built Node server, started on a free local port. */
async function nodeRenderer() {
  const port = await freePort();
  const server = spawn(process.execPath, ["dist/server/entry.mjs"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch(`${origin}/healthz`);
      break;
    } catch (error) {
      if (attempt >= 100) {
        server.kill();
        throw error;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    render: (path) => fetch(new URL(path, origin), { redirect: "manual" }),
    stop: () => server.kill(),
  };
}

/** Pages rendered on demand. */
async function checkOnDemand() {
  const { render, stop } = onVercelBuild
    ? await vercelRenderer()
    : await nodeRenderer();
  try {
    await checkPages(render);
  } finally {
    stop();
  }
}

async function checkPages(render) {
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
