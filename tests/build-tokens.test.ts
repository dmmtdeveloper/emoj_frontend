import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildTokensCss,
  SEMANTIC_COLORS,
  BRAND_SCALES,
  SCALE_STEPS,
} from "../scripts/build-tokens.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceTokens = JSON.parse(
  readFileSync(`${root}design/tokens.json`, "utf8"),
) as unknown;

/** Returns the body of the first block whose selector line matches exactly. */
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Block not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Unclosed block: ${selector}`);
}

/** Minimal valid token document used to exercise edge cases. */
function minimalTokens(extraColors: unknown[] = []): Record<string, unknown> {
  const semantic = SEMANTIC_COLORS.map((name: string) => ({
    name,
    value: { light: "#FFFFFF", dark: "#000000" },
  }));
  const scales = BRAND_SCALES.flatMap((scale: string) =>
    SCALE_STEPS.map((step: number) => ({
      name: `${scale}-${step}`,
      value: "#123456",
    })),
  );
  return {
    color: { tokens: [...semantic, ...scales, ...extraColors] },
    type: { families: { sans: '"Urbanist", sans-serif' } },
    spacing: { tokens: [{ name: "space-1", value: "4px" }] },
    radius: { tokens: [{ name: "radius-sm", value: "6px" }] },
    shadow: {
      tokens: [
        {
          name: "shadow-sm",
          value: { light: "0 1px red", dark: "0 1px blue" },
        },
      ],
    },
  };
}

describe("buildTokensCss with the EMOJ design tokens", () => {
  const css = buildTokensCss(sourceTokens);

  it("emits light color values in :root", () => {
    const light = block(css, ":root");
    expect(light).toContain("--surface: #FFF8F0;");
    expect(light).toContain("--ink: #2A0C4E;");
    expect(light).toContain("--brand: #9E2B25;");
    expect(light).toContain("color-scheme: light;");
  });

  it("emits dark color values for the OS preference unless light is forced", () => {
    const media = block(css, "@media (prefers-color-scheme: dark)");
    const dark = block(media, ':root:not([data-theme="light"])');
    expect(dark).toContain("--surface: #170828;");
    expect(dark).toContain("--ink: #FFF8F0;");
    expect(dark).toContain("--brand: #EA8377;");
    expect(dark).toContain("color-scheme: dark;");
  });

  it("emits the same dark values for an explicit data-theme=dark", () => {
    const media = block(css, "@media (prefers-color-scheme: dark)");
    const viaMedia = block(media, ':root:not([data-theme="light"])');
    const explicit = block(css, ':root[data-theme="dark"]');
    const normalize = (body: string) =>
      body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    expect(normalize(explicit)).toEqual(normalize(viaMedia));
  });

  it("only overrides tokens whose value differs per theme in dark blocks", () => {
    const dark = block(css, ':root[data-theme="dark"]');
    expect(dark).not.toContain("--plum-950");
    expect(dark).not.toContain("--space-1");
  });

  it("emits every brand scale step as a static variable", () => {
    const light = block(css, ":root");
    for (const scale of ["plum", "brick", "sage", "sand"]) {
      for (const step of [
        50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
      ]) {
        expect(light).toMatch(new RegExp(`--${scale}-${step}: #[0-9A-F]{6};`));
      }
    }
    expect(light).toContain("--plum-950: #2A0C4E;");
    expect(light).toContain("--brick-700: #9E2B25;");
    expect(light).toContain("--sage-300: #9DCBC6;");
    expect(light).toContain("--sand-50: #FFF8F0;");
  });

  it("emits spacing, radius and theme-aware shadow variables", () => {
    const light = block(css, ":root");
    expect(light).toContain("--space-4: 16px;");
    expect(light).toContain("--space-24: 96px;");
    expect(light).toContain("--radius-signature: 50px;");
    expect(light).toContain("--shadow-sm: 0 1px 2px rgba(42,12,78,0.08);");
    const dark = block(css, ':root[data-theme="dark"]');
    expect(dark).toContain("--shadow-md: 0 8px 24px rgba(0,0,0,0.45);");
  });

  it("maps semantic colors, scales, radii and font into a Tailwind @theme inline block", () => {
    const theme = block(css, "@theme inline");
    for (const name of SEMANTIC_COLORS) {
      expect(theme).toContain(`--color-${name}: var(--${name});`);
    }
    expect(theme).toContain("--color-whatsapp: var(--whatsapp);");
    expect(theme).toContain("--color-plum-50: var(--plum-50);");
    expect(theme).toContain("--color-sand-950: var(--sand-950);");
    expect(theme).toContain("--radius-md: 10px;");
    expect(theme).toContain("--radius-signature: 50px;");
    expect(theme).toContain(
      '--font-sans: "Urbanist", ui-sans-serif, system-ui, "Segoe UI", sans-serif;',
    );
    // Tailwind's default palette is reset so only brand colors are available.
    expect(theme).toContain("--color-*: initial;");
  });

  it("is deterministic", () => {
    expect(buildTokensCss(sourceTokens)).toBe(css);
    const clone = JSON.parse(JSON.stringify(sourceTokens)) as unknown;
    expect(buildTokensCss(clone)).toBe(css);
  });

  it("starts with a do-not-edit banner", () => {
    expect(css.startsWith("/*")).toBe(true);
    expect(css).toContain("Do not edit");
  });

  it("matches the committed src/styles/tokens.css (run `pnpm tokens` if this fails)", () => {
    const committed = readFileSync(`${root}src/styles/tokens.css`, "utf8");
    expect(committed).toBe(css);
  });
});

describe("buildTokensCss edge cases", () => {
  it("resolves {alias} values to var() references of existing tokens", () => {
    const css = buildTokensCss(
      minimalTokens([
        { name: "link", value: { light: "{brick-700}", dark: "{brick-400}" } },
      ]),
    );
    expect(block(css, ":root")).toContain("--link: var(--brick-700);");
    expect(block(css, ':root[data-theme="dark"]')).toContain(
      "--link: var(--brick-400);",
    );
  });

  it("rejects aliases that point to unknown tokens", () => {
    expect(() =>
      buildTokensCss(minimalTokens([{ name: "link", value: "{nope-500}" }])),
    ).toThrow(/unknown token "nope-500"/);
  });

  it("rejects circular aliases", () => {
    expect(() =>
      buildTokensCss(
        minimalTokens([
          { name: "a", value: "{b}" },
          { name: "b", value: "{a}" },
        ]),
      ),
    ).toThrow(/circular alias/i);
  });

  it("rejects themed values missing a theme", () => {
    expect(() =>
      buildTokensCss(minimalTokens([{ name: "x", value: { light: "#fff" } }])),
    ).toThrow(/"x".*dark/);
  });

  it("rejects themed values with unknown themes", () => {
    expect(() =>
      buildTokensCss(
        minimalTokens([
          { name: "x", value: { light: "#fff", dark: "#000", sepia: "#ccc" } },
        ]),
      ),
    ).toThrow(/unknown theme "sepia"/);
  });

  it("rejects invalid and duplicate token names", () => {
    expect(() =>
      buildTokensCss(minimalTokens([{ name: "Bad Name", value: "#fff" }])),
    ).toThrow(/invalid token name/i);
    expect(() =>
      buildTokensCss(minimalTokens([{ name: "surface", value: "#fff" }])),
    ).toThrow(/duplicate token "surface"/i);
  });

  it("fails when a required semantic color is missing", () => {
    const tokens = minimalTokens();
    const color = tokens["color"] as { tokens: { name: string }[] };
    color.tokens = color.tokens.filter((t) => t.name !== "focus-ring");
    expect(() => buildTokensCss(tokens)).toThrow(
      /missing semantic color "focus-ring"/i,
    );
  });

  it("ignores unknown top-level sections and non-token metadata", () => {
    const tokens = { ...minimalTokens(), name: "EMOJ", motion: { tokens: [] } };
    const css = buildTokensCss(tokens);
    expect(css).not.toContain("motion");
    expect(css).not.toContain("EMOJ\n");
  });

  it("rejects input that is not a token document", () => {
    expect(() => buildTokensCss(null)).toThrow(/token document/);
    expect(() => buildTokensCss({})).toThrow(/color\.tokens/);
  });
});
