import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The Caddyfile serves the site on Railway, its only host. The headers,
 * cache rules and redirects it must send are written out here, so a rule
 * dropped from (or slipped into) the Caddyfile fails.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const caddyfile = readFileSync(`${root}Caddyfile`, "utf8");

/**
 * Content Security Policy for the static Astro build.
 *
 * - Scripts: Astro emits every processed <script> as a same-origin module
 *   (`build.inlineStylesheets: "never"` and `assetsInlineLimit: 0` in
 *   astro.config.mjs keep CSS and JS out of the HTML), so `'self'` is
 *   enough. JSON-LD blocks are data, not executed, so CSP does not apply to
 *   them. No 'unsafe-inline', no 'unsafe-eval', no third-party scripts.
 * - Styles: same-origin stylesheets only.
 * - img-src / connect-src: the site's own origin. Photos are optimised at
 *   build time (astro:assets) and the site calls no API.
 * - Frames: none. The site embeds no third-party content.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** Response headers per Caddy path matcher ("*" is the site-wide block). */
const expectedHeaders: Record<string, Record<string, string>> = {
  "*": {
    "content-security-policy": csp,
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "x-frame-options": "DENY",
    // Prerender pages on hover or press (public/speculationrules.json), so
    // the card-to-cover transition has its photo on the first visit.
    "speculation-rules": '"/speculationrules.json"',
  },
  // Browsers only read speculation rules sent with their own type.
  "/speculationrules.json": {
    "content-type": "application/speculationrules+json",
  },
  // Hashed build assets never change, so they can be cached forever.
  "/_astro/*": {
    "cache-control": "public, max-age=31557600, immutable",
  },
};

/**
 * Old WordPress addresses (emoj.cl before the redesign) and where they live
 * now, as the Caddyfile's `redir` rules in file order. Permanent (301) so
 * search engines move their ranking to the new page. The four real articles
 * keep their content under a new slug; placeholder posts, categories, tags
 * and the author archive go to the news index; the old admin entry points
 * go home (the site has no panel). `/old*` is the prefix and everything
 * below it.
 */
const expectedRedirects: [path: string, to: string, status: string][] = [
  ["/archivo/2939", "/noticias/visita-tecnica-canal-la-petaca", "301"],
  [
    "/archivo/2899",
    "/noticias/de-sitios-abandonados-a-plazas-comunitarias",
    "301",
  ],
  ["/archivo/2873", "/noticias/redisenar-para-evolucionar", "301"],
  ["/archivo/2841", "/noticias/emojita-supervisora-felina", "301"],
  ["/archivo*", "/noticias", "301"],
  ["/jobs*", "/contacto", "301"],
  ["/feed*", "/noticias", "301"],
  ["/comments/feed", "/noticias", "301"],
  ["/wp-admin*", "/", "301"],
  ["/wp-login.php", "/", "301"],
];

interface HeaderBlock {
  /** Caddy path matcher, or "*" for the site-wide block. */
  path: string;
  headers: Map<string, string>;
}

/** Drop comments: a `#` that starts a line or follows whitespace. */
function stripComments(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "").trim())
    .filter(Boolean);
}

function unquote(value: string): string {
  return value.replace(/^"(.*)"$/, "$1").replaceAll('\\"', '"');
}

/** `header` blocks of the Caddyfile, resolved to their path matchers. */
function parseHeaderBlocks(text: string): HeaderBlock[] {
  const lines = stripComments(text);
  const matchers = new Map<string, string>();
  for (const line of lines) {
    const m = /^@(\S+)\s+path\s+(\S+)$/.exec(line);
    if (m?.[1] && m[2]) matchers.set(m[1], m[2]);
  }

  const blocks: HeaderBlock[] = [];
  let current: HeaderBlock | null = null;
  for (const line of lines) {
    if (current) {
      if (line === "}") {
        blocks.push(current);
        current = null;
        continue;
      }
      // `-Name` deletes a response header (e.g. -Server); not a sent header.
      if (line.startsWith("-")) continue;
      const m = /^(\S+)\s+(.+)$/.exec(line);
      if (!m?.[1] || !m[2]) throw new Error(`Unparsed header line: ${line}`);
      current.headers.set(m[1].toLowerCase(), unquote(m[2]));
      continue;
    }
    const open = /^header(?:\s+@(\S+))?\s*\{$/.exec(line);
    if (open) {
      const name = open[1];
      const path = name ? matchers.get(name) : "*";
      if (!path) throw new Error(`Unknown matcher @${name ?? ""}`);
      current = { path, headers: new Map() };
      continue;
    }
    const inline = /^header(?:\s+@(\S+))?\s+(\S+)\s+(.+)$/.exec(line);
    if (inline?.[2] && inline[3]) {
      const name = inline[1];
      const path = name ? matchers.get(name) : "*";
      if (!path) throw new Error(`Unknown matcher @${name ?? ""}`);
      blocks.push({
        path,
        headers: new Map([[inline[2].toLowerCase(), unquote(inline[3])]]),
      });
    }
  }
  return blocks;
}

/** Same CSP regardless of repeated sources within a directive. */
function normalizeCsp(policy: string): string {
  return policy
    .split(";")
    .map((directive) => [...new Set(directive.trim().split(/\s+/))].join(" "))
    .filter(Boolean)
    .join("; ");
}

function caddyHeaders(): Record<string, Record<string, string>> {
  const byPath: Record<string, Record<string, string>> = {};
  for (const block of parseHeaderBlocks(caddyfile)) {
    const merged = (byPath[block.path] ??= {});
    for (const [key, value] of block.headers) {
      merged[key] =
        key === "content-security-policy" ? normalizeCsp(value) : value;
    }
  }
  return byPath;
}

function siteCsp(): string {
  return caddyHeaders()["*"]?.["content-security-policy"] ?? "";
}

describe("Caddyfile (Railway)", () => {
  it("sends exactly the expected headers on each path", () => {
    expect(caddyHeaders()).toEqual(expectedHeaders);
  });

  it("points browsers at the speculation rules, served with their type", () => {
    const headers = caddyHeaders();
    expect(headers["*"]?.["speculation-rules"]).toBe(
      '"/speculationrules.json"',
    );
    expect(headers["/speculationrules.json"]?.["content-type"]).toBe(
      "application/speculationrules+json",
    );
  });

  it("loads no third-party scripts and no frames (there is no captcha)", () => {
    expect(siteCsp()).toContain("script-src 'self';");
    expect(siteCsp()).toContain("frame-src 'none';");
    expect(siteCsp()).not.toContain("challenges.cloudflare.com");
    expect(siteCsp()).not.toContain("'unsafe-inline'");
    expect(siteCsp()).not.toContain("'unsafe-eval'");
  });

  it("connects to its own origin only (there is no API)", () => {
    expect(siteCsp()).toContain("connect-src 'self';");
    expect(siteCsp()).toContain("img-src 'self' data:;");
  });

  it("caches hashed build assets forever", () => {
    expect(caddyHeaders()["/_astro/*"]?.["cache-control"]).toBe(
      "public, max-age=31557600, immutable",
    );
  });

  it("serves the built site from disk, with no server behind it", () => {
    const lines = stripComments(caddyfile);
    expect(lines).toContain("root * /app/dist");
    expect(lines).toContain("try_files {path} {path}/index.html");
    expect(lines).toContain("file_server");
    expect(lines.some((line) => line.startsWith("reverse_proxy"))).toBe(false);
  });

  it("rewrites nothing but unknown paths to the 404 page", () => {
    const rewrites = stripComments(caddyfile).filter((line) =>
      line.startsWith("rewrite"),
    );
    expect(rewrites).toEqual(["rewrite * /404.html"]);
  });

  it("answers unknown paths with the 404 page and status 404", () => {
    const lines = stripComments(caddyfile);
    const start = lines.indexOf("handle_errors 404 {");
    expect(start).toBeGreaterThan(-1);
    expect(lines.slice(start, start + 6)).toEqual([
      "handle_errors 404 {",
      "rewrite * /404.html",
      "file_server {",
      "status 404",
      "}",
      "}",
    ]);
  });

  it("answers the Railway healthcheck from Caddy itself", () => {
    expect(stripComments(caddyfile)).toContain("respond /healthz 200");
  });

  it("redirects exactly the expected legacy URLs, in order", () => {
    expect(caddyRedirects()).toEqual(expectedRedirects);
  });
});

function caddyRedirects(): string[][] {
  return stripComments(caddyfile)
    .filter((line) => line.startsWith("redir "))
    .map((line) => {
      const [, path = "", to = "", code = ""] = line.split(/\s+/);
      return [path, to, code];
    });
}

/**
 * Caddy's order for `redir` rules with one path each (directive sorting in
 * httpcaddyfile): the longer path, without its trailing `*`, goes first; on
 * a tie the exact path beats the prefix. File order breaks the rest.
 */
function caddyOrder(redirects: string[][]): string[][] {
  return [...redirects].sort(([a = ""], [b = ""]) => {
    const ta = a.replace(/\*$/, "");
    const tb = b.replace(/\*$/, "");
    return ta === tb ? a.length - b.length : tb.length - ta.length;
  });
}

/** First Caddyfile redirect that matches `path`, as Caddy evaluates them. */
function resolveRedirect(path: string): string | undefined {
  for (const [source = "", to] of caddyOrder(caddyRedirects())) {
    const matches = source.endsWith("*")
      ? path.startsWith(source.slice(0, -1))
      : path === source;
    if (matches) return to;
  }
  return undefined;
}

describe("legacy WordPress URLs (emoj.cl before the redesign)", () => {
  // Every URL in the old site's sitemap (wp-sitemap.xml), plus the feeds and
  // admin entry points people and bots still request.
  const expected: Record<string, string> = {
    "/archivo/2939": "/noticias/visita-tecnica-canal-la-petaca",
    "/archivo/2899": "/noticias/de-sitios-abandonados-a-plazas-comunitarias",
    "/archivo/2873": "/noticias/redisenar-para-evolucionar",
    "/archivo/2841": "/noticias/emojita-supervisora-felina",
    // Published placeholders (Lorem Ipsum) and duplicates: no new article.
    "/archivo/380": "/noticias",
    "/archivo/389": "/noticias",
    "/archivo/1821": "/noticias",
    "/archivo/2598": "/noticias",
    "/archivo/category/noticias": "/noticias",
    "/archivo/category/sin-categoria": "/noticias",
    "/archivo/tag/ingenieria-hidraulica": "/noticias",
    "/archivo/author/inginfhotmail-com": "/noticias",
    "/archivo": "/noticias",
    "/jobs": "/contacto",
    "/jobs/dibujante-proyectista": "/contacto",
    "/feed": "/noticias",
    "/comments/feed": "/noticias",
    // There is no panel anymore: the old admin entry points go home.
    "/wp-admin": "/",
    "/wp-admin/post.php": "/",
    "/wp-login.php": "/",
  };

  it.each(Object.entries(expected))("%s -> %s", (from, to) => {
    expect(resolveRedirect(from)).toBe(to);
  });

  it("tries the exact article paths before the /archivo* prefix", () => {
    const order = caddyOrder(caddyRedirects()).map(([path]) => path);
    const prefix = order.indexOf("/archivo*");
    for (const article of ["2939", "2899", "2873", "2841"]) {
      expect(order.indexOf(`/archivo/${article}`)).toBeLessThan(prefix);
    }
  });

  it("leaves the pages that kept their address alone", () => {
    for (const path of [
      "/",
      "/nosotros",
      "/proyectos",
      "/noticias",
      "/contacto",
    ]) {
      expect(resolveRedirect(path)).toBeUndefined();
    }
  });

  it("never redirects into a loop", () => {
    for (const [, to = ""] of caddyRedirects()) {
      expect(resolveRedirect(to)).toBeUndefined();
    }
  });

  it("sends permanent redirects (301)", () => {
    for (const [, , code] of caddyRedirects()) expect(code).toBe("301");
  });
});
