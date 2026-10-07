import { describe, expect, it } from "vitest";
import { edgeCacheHeader } from "../src/lib/cdn-cache";

describe("edgeCacheHeader", () => {
  it("lets the CDN keep resized and stable content images for a year", () => {
    expect(edgeCacheHeader("/_image", 200)).toBe("max-age=31536000");
    expect(edgeCacheHeader("/media/noticias/hito/0123456789abcdef", 200)).toBe(
      "max-age=31536000",
    );
  });

  it("leaves pages, errors and other routes alone", () => {
    expect(edgeCacheHeader("/noticias/hito", 200)).toBeNull();
    expect(edgeCacheHeader("/_image", 500)).toBeNull();
    expect(edgeCacheHeader("/media/noticias/hito/x", 404)).toBeNull();
    expect(edgeCacheHeader("/mediateca", 200)).toBeNull();
  });
});
