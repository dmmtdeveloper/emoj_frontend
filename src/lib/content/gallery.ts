/**
 * Mosaic tiles for a photo gallery (PhotoGallery.astro). Classes are
 * written out in full for Tailwind.
 *
 * - `wide` (a section of its own, four columns from md): one photo fills
 *   the row; two share it; from three on, the first is a large 2x2 tile.
 * - `narrow` (beside an article's text, two columns): one photo fills the
 *   row; from three on, the first does; a last photo left alone in its row
 *   widens to fill it.
 */
export type GalleryLayout = "wide" | "narrow";

export function galleryTile(
  index: number,
  count: number,
  layout: GalleryLayout,
): string {
  if (layout === "wide") {
    if (count === 1) return "col-span-2 md:col-span-4";
    if (count === 2) return "md:col-span-2";
    return index === 0 ? "col-span-2 row-span-2" : "";
  }
  if (count === 1) return "col-span-2";
  if (count === 2) return "";
  if (index === 0) return "col-span-2";
  // After the full-width first photo, the rest go in pairs.
  const rest = count - 1;
  const isLast = index === count - 1;
  return isLast && rest % 2 === 1 ? "col-span-2" : "";
}
