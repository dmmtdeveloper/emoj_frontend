import { describe, expect, it } from "vitest";
import { galleryTile } from "../src/lib/content/gallery";

describe("galleryTile, wide (four columns from md)", () => {
  it("lets one photo fill the row and two share it", () => {
    expect(galleryTile(0, 1, "wide")).toBe("col-span-2 md:col-span-4");
    expect(galleryTile(0, 2, "wide")).toBe("md:col-span-2");
    expect(galleryTile(1, 2, "wide")).toBe("md:col-span-2");
  });

  it("makes the first of three or more a large 2x2 tile", () => {
    expect(galleryTile(0, 5, "wide")).toBe("col-span-2 row-span-2");
    expect(galleryTile(3, 5, "wide")).toBe("");
  });
});

describe("galleryTile, narrow (two columns, beside a text)", () => {
  it("lets one photo fill the row and two share it", () => {
    expect(galleryTile(0, 1, "narrow")).toBe("col-span-2");
    expect(galleryTile(1, 2, "narrow")).toBe("");
  });

  it("opens three or more with a full-width photo", () => {
    expect(galleryTile(0, 3, "narrow")).toBe("col-span-2");
    expect(galleryTile(2, 3, "narrow")).toBe("");
  });

  it("widens a last photo left alone in its row", () => {
    expect(galleryTile(3, 4, "narrow")).toBe("col-span-2");
    expect(galleryTile(4, 5, "narrow")).toBe("");
  });
});
