import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * public/speculationrules.json (sent with the Speculation-Rules header,
 * Caddyfile and vercel.ts): pages are prerendered when a link is hovered or
 * pressed, so their photos are ready and the card-to-cover transition works
 * on the first visit too.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const rules = JSON.parse(
  readFileSync(`${root}public/speculationrules.json`, "utf8"),
) as {
  prerender: {
    where: {
      and: [{ href_matches: string }, { not: { href_matches: string[] } }];
    };
    eagerness: string;
  }[];
};

describe("speculation rules", () => {
  const [rule] = rules.prerender;

  it("prerenders same-site pages on hover or press, not eagerly", () => {
    expect(rules.prerender).toHaveLength(1);
    expect(rule?.eagerness).toBe("moderate");
    expect(rule?.where.and[0].href_matches).toBe("/*");
  });

  it("never prerenders the panel, the API, previews or the contact form", () => {
    const excluded = rule?.where.and[1].not.href_matches ?? [];
    for (const path of ["/admin*", "/api/*", "/preview*", "/contacto*"]) {
      expect(excluded).toContain(path);
    }
  });
});
