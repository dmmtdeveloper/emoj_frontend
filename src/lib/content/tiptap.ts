/**
 * Render a TipTap (ProseMirror) JSON document from the API to HTML at build
 * time. The API already sanitizes bodies against an allowlist; this renderer
 * applies the same allowlist again (defense in depth):
 *
 * - Nodes: doc, paragraph, heading (levels clamped to 2-4: the page owns the
 *   h1), bulletList, orderedList (start), listItem, blockquote, hardBreak,
 *   horizontalRule and text. Unknown nodes are dropped with their content.
 * - Images carry only a media library ID (no URL in the public API), so they
 *   render nothing for now.
 * - Marks: bold, italic, underline, strike and link (http, https, mailto).
 *   External links get `rel="noopener noreferrer"`.
 * - Every text and attribute value is HTML-escaped; no other attribute is
 *   ever emitted.
 */

export interface RenderOptions {
  /** Host of the site; links to it (or www.) are internal. */
  siteHost?: string;
}

type Json = Record<string, unknown>;

const MAX_DEPTH = 64;

const SIMPLE_MARKS: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function attrs(node: Json): Json {
  return isObject(node["attrs"]) ? node["attrs"] : {};
}

/** Parse an href, keeping only absolute http(s) and mailto URLs. */
export function safeUrl(href: unknown): URL | undefined {
  if (typeof href !== "string" || href.trim() === "") return undefined;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  return ["http:", "https:", "mailto:"].includes(url.protocol)
    ? url
    : undefined;
}

function isExternal(url: URL, siteHost: string): boolean {
  if (url.protocol === "mailto:") return false;
  const host = url.hostname.toLowerCase();
  return host !== siteHost && host !== `www.${siteHost}`;
}

function renderText(node: Json, options: Required<RenderOptions>): string {
  const value = node["text"];
  if (typeof value !== "string" || value === "") return "";
  let html = escapeHtml(value);
  const marks = Array.isArray(node["marks"]) ? node["marks"] : [];
  // Wrap from the innermost mark outwards so the first mark is outermost.
  for (const mark of [...marks].reverse()) {
    if (!isObject(mark) || typeof mark["type"] !== "string") continue;
    const tag = SIMPLE_MARKS[mark["type"]];
    if (tag) {
      html = `<${tag}>${html}</${tag}>`;
    } else if (mark["type"] === "link") {
      const url = safeUrl(attrs(mark)["href"]);
      if (!url) continue;
      const rel = isExternal(url, options.siteHost)
        ? ' rel="noopener noreferrer"'
        : "";
      html = `<a href="${escapeHtml(url.href)}"${rel}>${html}</a>`;
    }
  }
  return html;
}

function headingLevel(value: unknown): 2 | 3 | 4 {
  if (typeof value !== "number" || !Number.isInteger(value)) return 2;
  return Math.min(4, Math.max(2, value)) as 2 | 3 | 4;
}

function renderChildren(
  node: Json,
  options: Required<RenderOptions>,
  depth: number,
): string {
  const content = node["content"];
  if (!Array.isArray(content)) return "";
  return content.map((child) => renderNode(child, options, depth + 1)).join("");
}

function renderNode(
  node: unknown,
  options: Required<RenderOptions>,
  depth: number,
): string {
  if (!isObject(node) || depth > MAX_DEPTH) return "";
  const inner = () => renderChildren(node, options, depth);

  switch (node["type"]) {
    case "text":
      return renderText(node, options);
    case "paragraph": {
      const html = inner();
      return html ? `<p>${html}</p>` : "";
    }
    case "heading": {
      const html = inner();
      const level = headingLevel(attrs(node)["level"]);
      return html ? `<h${level}>${html}</h${level}>` : "";
    }
    case "bulletList": {
      const html = inner();
      return html ? `<ul>${html}</ul>` : "";
    }
    case "orderedList": {
      const html = inner();
      const start = attrs(node)["start"];
      const startAttr =
        typeof start === "number" && Number.isInteger(start) && start > 1
          ? ` start="${start}"`
          : "";
      return html ? `<ol${startAttr}>${html}</ol>` : "";
    }
    case "listItem": {
      const html = inner();
      return html ? `<li>${html}</li>` : "";
    }
    case "blockquote": {
      const html = inner();
      return html ? `<blockquote>${html}</blockquote>` : "";
    }
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    default:
      // image (mediaId only) and every unknown node.
      return "";
  }
}

export function renderTipTap(
  doc: unknown,
  options: RenderOptions = {},
): string {
  if (!isObject(doc) || doc["type"] !== "doc") return "";
  const resolved = { siteHost: (options.siteHost ?? "emoj.cl").toLowerCase() };
  return renderChildren(doc, resolved, 0);
}
