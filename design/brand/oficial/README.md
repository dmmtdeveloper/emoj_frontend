# Official EMOJ brand files

The logo package delivered with the 2025 brand book ("Memoria Branding Emoj
Consultora", RGB / digital media), exported as SVG. File names are the
originals in kebab case; the contents are untouched. These files are the
source of truth: the site's marks are built from them, never redrawn.

## Versions

| Files                          | What                                                            | Use                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isotipo-recorte*.svg`         | Isotype, fine stroke (10.19 on an 852 grid)                     | The main mark in the brand book. Large sizes.                                                                                                                                         |
| `isotipo-bold.svg`             | Isotype, heavy stroke (20)                                      | Small sizes, where the fine stroke would thin out (header, favicon).                                                                                                                  |
| `horizontal-*.svg`             | Isotype + "Emoj Consultora" side by side                        | Wide, short spaces.                                                                                                                                                                   |
| `vertical-*.svg`               | Isotype over "Emoj Consultora"                                  | Main lockup. The site footer uses `vertical-recorte` (`src/components/LogoLockup.astro`).                                                                                             |
| `vertical-tagline-*.svg`       | Vertical lockup with tagline                                    | **Outdated tagline**: these files say "acercamos la ingeniería"; the brand book and the site use "Humanizamos la ingeniería". Do not publish them until the designer re-exports them. |
| `patron-1.svg`, `patron-2.svg` | The isotype repeated as a pattern (same tile, different offset) | Backgrounds. The web tile is `public/brand/patron.svg`.                                                                                                                               |

Suffixes: none = color (Auburn stroke `#9E2B25`, Russian Violet dots and
"Consultora" `#2A0C4E`, "Emoj" in Auburn); `positivo` = one ink, black;
`negativo` = one ink, white, for dark grounds.

## Palette (brand book, page 23)

| Name           | Hex       | Share | Token                 |
| -------------- | --------- | ----- | --------------------- |
| Floral White   | `#FFF8F0` | 30%   | `sand-50` (`surface`) |
| Auburn         | `#9E2B25` | 25%   | `brick-700` (`brand`) |
| Russian Violet | `#2A0C4E` | 25%   | `plum-950`            |
| Opal           | `#9DCBC6` | 20%   | `sage-300` (`accent`) |

## Concept

"Personas" (the `e`, a person) + "Corriente de río" (the wave): a single
hand-drawn line with a dot at each end. The brand book also uses the stroke
as a large cropped supergraphic on Opal or Floral White, which the site
echoes behind "EMOJ en cifras".

## Inline use on the site

The production CSP is `style-src 'self'`, so an SVG inlined in HTML must not
carry a `<style>` block: copy the geometry into a component and color it
with tokens (`currentColor`, `--mark-stroke`). As an `<img>` or CSS
background the files work as they are.
