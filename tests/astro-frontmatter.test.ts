import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/** Every .astro file under src. */
function astroFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return astroFiles(path);
    return entry.name.endsWith(".astro") ? [path] : [];
  });
}

describe("Astro components", () => {
  // A stray `---` after the frontmatter is rendered as text: on the home
  // page it pushed the hero 27px down, under a strip of page background.
  it.each(astroFiles("src").map((f) => relative(".", f)))(
    "%s has one frontmatter block and no stray fence",
    (file) => {
      const fences = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.trimEnd() === "---").length;
      expect([0, 2]).toContain(fences);
    },
  );
});
