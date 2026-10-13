/**
 * How project and news cards request their photo. The project and article
 * pages put the same request under their large cover (CoverImage), so the
 * photo the card already loaded is on screen from the first frame and the
 * card-to-cover transition always lands on a photo, even before the large
 * cover arrives. Same widths and sizes give the browser the same candidate.
 */
export const CARD_IMAGE = {
  max: 800,
  widths: [208, 400, 640, 800],
  sizes:
    "(min-width: 1200px) 380px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 104px",
} as const;
