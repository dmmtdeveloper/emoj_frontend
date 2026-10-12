import { describe, expect, it } from "vitest";
import type { NewsSummary } from "../src/lib/api/client";
import { newsListing } from "../src/lib/content/news-listing";

function article(slug: string): NewsSummary {
  return {
    id: slug,
    slug,
    title: slug,
    excerpt: "",
    category: "",
    publishedAt: "2026-10-01T12:00:00Z",
  };
}

describe("newsListing", () => {
  const items = ["a", "b", "c", "d"].map(article);

  it("features the newest article on the first page", () => {
    const { featured, rest } = newsListing(items, 1);
    expect(featured?.slug).toBe("a");
    expect(rest.map((a) => a.slug)).toEqual(["b", "c", "d"]);
  });

  it("features nothing on later pages", () => {
    const { featured, rest } = newsListing(items, 2);
    expect(featured).toBeUndefined();
    expect(rest).toEqual(items);
  });

  it("handles a single article and an empty page", () => {
    const one = newsListing([article("a")], 1);
    expect(one.featured?.slug).toBe("a");
    expect(one.rest).toEqual([]);

    const none = newsListing([], 1);
    expect(none.featured).toBeUndefined();
    expect(none.rest).toEqual([]);
  });
});
