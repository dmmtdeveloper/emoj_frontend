import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import vercel from "../vercel";

/**
 * The Caddyfile serves the site on Railway; vercel.ts configures Vercel.
 * Both must send the same headers and rewrite /api the same way, so a
 * header added to one and forgotten in the other fails here.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const caddyfile = readFileSync(`${root}Caddyfile`, "utf8");

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
  return value.replace(/^"(.*)"$/, "$1");
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
      // `-Name` deletes a response header (e.g. -Server); not a parity item.
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

/** Vercel source pattern to the equivalent Caddy path matcher. */
function caddyPath(source: string): string {
  const path = source.replace("(.*)", "*");
  return path === "/*" ? "*" : path;
}

/** Same CSP regardless of repeated sources within a directive. */
function normalizeCsp(csp: string): string {
  return csp
    .split(";")
    .map((directive) => [...new Set(directive.trim().split(/\s+/))].join(" "))
    .filter(Boolean)
    .join("; ");
}

const rewrite = vercel.rewrites?.[0];
const apiOrigin = rewrite ? new URL(rewrite.destination).origin : "";

/** Caddy reads `{$API_ORIGIN}` from the environment at startup. */
function resolveEnv(value: string): string {
  return value.replaceAll("{$API_ORIGIN}", apiOrigin);
}

function caddyHeaders(): Map<string, Map<string, string>> {
  const byPath = new Map<string, Map<string, string>>();
  for (const block of parseHeaderBlocks(caddyfile)) {
    const merged = byPath.get(block.path) ?? new Map<string, string>();
    for (const [key, value] of block.headers) {
      const resolved = resolveEnv(value);
      merged.set(
        key,
        key === "content-security-policy" ? normalizeCsp(resolved) : resolved,
      );
    }
    byPath.set(block.path, merged);
  }
  return byPath;
}

function vercelHeaders(): Map<string, Map<string, string>> {
  const byPath = new Map<string, Map<string, string>>();
  for (const rule of vercel.headers ?? []) {
    const merged = new Map<string, string>();
    for (const { key, value } of rule.headers) {
      const k = key.toLowerCase();
      merged.set(
        k,
        k === "content-security-policy" ? normalizeCsp(value) : value,
      );
    }
    byPath.set(caddyPath(rule.source), merged);
  }
  return byPath;
}

describe("Caddyfile (Railway) matches vercel.ts", () => {
  it("sends the same headers on the same paths", () => {
    const toObject = (m: Map<string, Map<string, string>>) =>
      Object.fromEntries(
        [...m].map(([path, headers]) => [path, Object.fromEntries(headers)]),
      );
    expect(toObject(caddyHeaders())).toEqual(toObject(vercelHeaders()));
  });

  it("allows the API origin in connect-src", () => {
    const csp = caddyHeaders().get("*")?.get("content-security-policy") ?? "";
    expect(apiOrigin).toMatch(/^https:\/\//);
    expect(csp).toContain(`connect-src 'self' ${apiOrigin}`);
  });

  it("proxies /api/* to the API without the /api prefix, like the rewrite", () => {
    expect(rewrite?.source).toBe("/api/(.*)");
    expect(rewrite?.destination).toMatch(/\/\$1$/);
    const lines = stripComments(caddyfile);
    const start = lines.indexOf("handle_path /api/* {");
    expect(start).toBeGreaterThan(-1);
    expect(lines[start + 1]).toMatch(/^reverse_proxy \{\$API_UPSTREAM\}/);
  });

  it("serves the built pages and the 404 page", () => {
    const lines = stripComments(caddyfile);
    expect(lines).toContain("root * /srv");
    expect(lines).toContain("try_files {path} {path}/index.html");
    expect(lines).toContain("rewrite * /404.html");
  });
});
