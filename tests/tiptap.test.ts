import { describe, expect, it } from "vitest";
import { escapeHtml, renderTipTap } from "../src/lib/content/tiptap";

const text = (value: string, marks?: unknown[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const link = (href: string) => ({ type: "link", attrs: { href } });

describe("escapeHtml", () => {
  it("escapes the five HTML special characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("renderTipTap", () => {
  it.each([
    ["paragraph", doc(p(text("Hola"))), "<p>Hola</p>"],
    [
      "headings 2 to 4",
      doc(
        { type: "heading", attrs: { level: 2 }, content: [text("A")] },
        { type: "heading", attrs: { level: 3 }, content: [text("B")] },
        { type: "heading", attrs: { level: 4 }, content: [text("C")] },
      ),
      "<h2>A</h2><h3>B</h3><h4>C</h4>",
    ],
    [
      "out-of-range heading levels are clamped (the page owns the h1)",
      doc(
        { type: "heading", attrs: { level: 1 }, content: [text("A")] },
        { type: "heading", attrs: { level: 6 }, content: [text("B")] },
        { type: "heading", attrs: { level: "x" }, content: [text("C")] },
      ),
      "<h2>A</h2><h4>B</h4><h2>C</h2>",
    ],
    [
      "bullet and ordered lists",
      doc(
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [p(text("Uno"))] }],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [p(text("Tres"))] }],
        },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [{ type: "listItem", content: [p(text("Uno"))] }],
        },
      ),
      '<ul><li><p>Uno</p></li></ul><ol start="3"><li><p>Tres</p></li></ol><ol><li><p>Uno</p></li></ol>',
    ],
    [
      "blockquote, hard break and horizontal rule",
      doc(
        { type: "blockquote", content: [p(text("Cita"))] },
        p(text("a"), { type: "hardBreak" }, text("b")),
        { type: "horizontalRule" },
      ),
      "<blockquote><p>Cita</p></blockquote><p>a<br>b</p><hr>",
    ],
    [
      "marks",
      doc(
        p(
          text("b", [{ type: "bold" }]),
          text("i", [{ type: "italic" }]),
          text("u", [{ type: "underline" }]),
          text("s", [{ type: "strike" }]),
          text("bi", [{ type: "bold" }, { type: "italic" }]),
        ),
      ),
      "<p><strong>b</strong><em>i</em><u>u</u><s>s</s><strong><em>bi</em></strong></p>",
    ],
    [
      "empty paragraphs are dropped",
      doc(p(), { type: "paragraph" }, p(text("x"))),
      "<p>x</p>",
    ],
    [
      "images (only a mediaId, no URL in the API) render nothing",
      doc(
        { type: "image", attrs: { mediaId: "0192f0a0-0000", alt: "Foto" } },
        p(text("x")),
      ),
      "<p>x</p>",
    ],
    [
      "unknown nodes are dropped with their content",
      doc(
        { type: "codeBlock", content: [text("rm -rf /")] },
        { type: "iframe", attrs: { src: "https://evil.test" } },
        p(text("ok")),
      ),
      "<p>ok</p>",
    ],
    [
      "unknown marks are ignored, text kept",
      doc(p(text("x", [{ type: "highlight" }, { type: "textStyle" }]))),
      "<p>x</p>",
    ],
  ])("%s", (_name, input, expected) => {
    expect(renderTipTap(input)).toBe(expected);
  });

  describe("links", () => {
    it("adds rel=noopener noreferrer to external links", () => {
      expect(
        renderTipTap(
          doc(p(text("LinkedIn", [link("https://linkedin.com/x")]))),
        ),
      ).toBe(
        '<p><a href="https://linkedin.com/x" rel="noopener noreferrer">LinkedIn</a></p>',
      );
    });

    it("keeps links to the site itself without rel", () => {
      expect(
        renderTipTap(
          doc(p(text("Servicios", [link("https://emoj.cl/servicios")]))),
          { siteHost: "emoj.cl" },
        ),
      ).toBe('<p><a href="https://emoj.cl/servicios">Servicios</a></p>');
    });

    it("allows mailto links without rel", () => {
      expect(
        renderTipTap(doc(p(text("Escríbenos", [link("mailto:a@emoj.cl")])))),
      ).toBe('<p><a href="mailto:a@emoj.cl">Escríbenos</a></p>');
    });

    it.each([
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "/relative/path",
      "//evil.test/x",
      "",
    ])("drops the link mark for unsafe href %j but keeps the text", (href) => {
      expect(renderTipTap(doc(p(text("clic", [link(href)]))))).toBe(
        "<p>clic</p>",
      );
    });

    it("escapes the href", () => {
      expect(
        renderTipTap(
          doc(
            p(
              text("x", [
                link('https://a.test/?q="><script>alert(1)</script>'),
              ]),
            ),
          ),
        ),
      ).toBe(
        '<p><a href="https://a.test/?q=%22%3E%3Cscript%3Ealert(1)%3C/script%3E" rel="noopener noreferrer">x</a></p>',
      );
    });
  });

  describe("XSS payloads in text are escaped", () => {
    it.each([
      ["<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"],
      [
        '<img src=x onerror="alert(1)">',
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
      ],
      ["</p><iframe src=//evil>", "&lt;/p&gt;&lt;iframe src=//evil&gt;"],
      ["a & b", "a &amp; b"],
    ])("%s", (payload, escaped) => {
      expect(renderTipTap(doc(p(text(payload))))).toBe(`<p>${escaped}</p>`);
    });

    it("ignores attributes smuggled into nodes", () => {
      expect(
        renderTipTap(
          doc({
            type: "paragraph",
            attrs: { onclick: "alert(1)", style: "x", class: "y" },
            content: [text("x")],
          }),
        ),
      ).toBe("<p>x</p>");
    });

    it("ignores HTML smuggled in a node type", () => {
      expect(
        renderTipTap(doc({ type: "<script>", content: [text("x")] })),
      ).toBe("");
    });
  });

  describe("malformed input", () => {
    it.each([
      ["null", null],
      ["a string", "<p>x</p>"],
      ["a number", 42],
      ["not a doc", { type: "paragraph", content: [text("x")] }],
      ["content not an array", { type: "doc", content: "x" }],
    ])("renders %s as an empty string", (_name, input) => {
      expect(renderTipTap(input)).toBe("");
    });

    it("skips non-object children and non-string text", () => {
      expect(
        renderTipTap(doc(null, 3, p(text("a"), { type: "text", text: 5 }))),
      ).toBe("<p>a</p>");
    });

    it("stops at an absurd nesting depth instead of overflowing the stack", () => {
      let node: unknown = p(text("deep"));
      for (let i = 0; i < 5000; i++) {
        node = { type: "blockquote", content: [node] };
      }
      expect(() => renderTipTap(doc(node))).not.toThrow();
    });
  });
});
