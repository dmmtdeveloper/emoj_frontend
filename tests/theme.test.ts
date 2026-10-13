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
  it("follows the device until the visitor chooses", () => {
    expect(effectiveTheme(null, true)).toBe("dark");
    expect(effectiveTheme(null, false)).toBe("light");
  });

  it("keeps the visitor's choice over the device", () => {
    expect(effectiveTheme("light", true)).toBe("light");
    expect(effectiveTheme("dark", false)).toBe("dark");
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
});
