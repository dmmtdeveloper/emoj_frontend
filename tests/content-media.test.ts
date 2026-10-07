import { describe, expect, it } from "vitest";
import type { MediaRef } from "../src/lib/api/client";
import {
  contentImages,
  findImage,
  isMediaKey,
  mediaKey,
  mediaPath,
} from "../src/lib/content/media";

function ref(path: string, query = "X-Amz-Signature=abc"): MediaRef {
  return {
    url: `https://bucket.t3.storageapi.dev${path}?${query}`,
    alt: "Foto",
    width: 1600,
    height: 900,
  };
}

describe("mediaKey", () => {
  it("is stable across presigned URLs of the same object", () => {
    const a = ref("/media/abc/original.jpg", "X-Amz-Signature=one");
    const b = ref("/media/abc/original.jpg", "X-Amz-Signature=two");
    expect(mediaKey(a.url)).toBe(mediaKey(b.url));
    expect(isMediaKey(mediaKey(a.url))).toBe(true);
  });

  it("differs between objects", () => {
    expect(mediaKey(ref("/media/a.jpg").url)).not.toBe(
      mediaKey(ref("/media/b.jpg").url),
    );
  });
});

describe("isMediaKey", () => {
  it.each(["", "zz", "0123456789abcdef0", "../etc/passwd"])(
    "rejects %j",
    (value) => {
      expect(isMediaKey(value)).toBe(false);
    },
  );
});

describe("mediaPath", () => {
  it("points at the site's own stable image route", () => {
    const image = ref("/media/abc/original.jpg");
    expect(mediaPath("noticias", "nuevo-hito", image)).toBe(
      `/media/noticias/nuevo-hito/${mediaKey(image.url)}`,
    );
  });
});

describe("contentImages and findImage", () => {
  it("collect the cover, the gallery and the share image, and find one by key", () => {
    const cover = ref("/media/cover.jpg");
    const photo = ref("/media/photo.jpg");
    const og = ref("/media/og.jpg");
    const images = contentImages({
      cover,
      gallery: [photo],
      seo: { title: "T", description: "D", ogImage: og },
    });
    expect(images).toEqual([cover, photo, og]);
    expect(findImage(images, mediaKey(photo.url))).toBe(photo);
    expect(findImage(images, "0".repeat(16))).toBeUndefined();
  });

  it("works for content without images", () => {
    expect(contentImages({ seo: { title: "T", description: "D" } })).toEqual(
      [],
    );
  });
});
