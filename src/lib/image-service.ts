/**
 * Astro's sharp image service, plus content images at their stable address
 * (`/media/...`, see src/lib/content/media.ts).
 *
 * Astro leaves string sources that start with "/" untouched (it takes them
 * for files in public/), so content photos would be sent at full size. Here
 * they get an `/_image?href=/media/...` address like imported images: the
 * image endpoint loads them from this same site and resizes them on demand,
 * with a srcset, and the CDN keeps each size (src/lib/cdn-cache.ts).
 */
import type { ImageMetadata, LocalImageService } from "astro";
import sharp from "astro/assets/services/sharp";

const base = sharp as LocalImageService;

const service: LocalImageService = {
  ...base,
  getURL(options, imageConfig, logger) {
    if (typeof options.src === "string" && options.src.startsWith("/media/")) {
      const asImported: ImageMetadata = {
        src: options.src,
        width: options.width ?? 0,
        height: options.height ?? 0,
        format: "jpg",
      };
      return base.getURL(
        { ...options, src: asImported, format: options.format ?? "webp" },
        imageConfig,
        logger,
      );
    }
    return base.getURL(options, imageConfig, logger);
  },
};

export default service;
