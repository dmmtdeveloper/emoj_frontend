import { describe, expect, it } from "vitest";
import {
  THEME_KEY,
  effectiveTheme,
  storedTheme,
  toggledTheme,
} from "../src/lib/theme";

describe("storedTheme", () => {
  it("accepts only the two themes", () => {
    expect(storedTheme("light")).toBe("light");
    expect(storedTheme("dark")).toBe("dark");
    expect(storedTheme(null)).toBeNull();
    expect(storedTheme("sepia")).toBeNull();
  });
});

describe("effectiveTheme", () => {
  it("is light until the visitor chooses, whatever the device says", () => {
    expect(effectiveTheme(null)).toBe("light");
  });

  it("keeps the visitor's choice", () => {
    expect(effectiveTheme("light")).toBe("light");
    expect(effectiveTheme("dark")).toBe("dark");
  });
});

describe("toggledTheme", () => {
  it("switches to the other theme", () => {
    expect(toggledTheme("light")).toBe("dark");
    expect(toggledTheme("dark")).toBe("light");
  });
});

describe("THEME_KEY", () => {
  it("matches the key read before paint by public/theme.js", async () => {
    const { readFile } = await import("node:fs/promises");
    const script = await readFile("public/theme.js", "utf8");
    expect(script).toContain(`"${THEME_KEY}"`);
  });

  it("makes light the default before paint (public/theme.js)", async () => {
    const { readFile } = await import("node:fs/promises");
    const script = await readFile("public/theme.js", "utf8");
    expect(script).toMatch(/:\s*"light"/);
  });
});
