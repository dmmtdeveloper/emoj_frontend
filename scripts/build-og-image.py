"""Build the default Open Graph image (public/og-default.jpg, 1200x630).

Floral White background with the official vertical lockup in color
(design/brand/oficial/vertical-bold.svg, never redrawn; the heavy stroke
holds up in small previews) and the tagline set in Urbanist, all centered.
Everything sits inside the central 630x630 square, so chat apps that crop
the preview to a square thumbnail (WhatsApp) still show the whole mark.
Run it after the brand files change; the output is committed.

Usage (needs Pillow, and `pnpm install` for sharp and the Urbanist font):

    python scripts/build-og-image.py
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOCKUP = ROOT / "design/brand/oficial/vertical-bold.svg"
FONTS = ROOT / "node_modules/@fontsource/urbanist/files"
OUT = ROOT / "public/og-default.jpg"

SAND_50 = (255, 248, 240)  # Floral White
PLUM_950 = (42, 12, 78)  # Russian Violet
WIDTH, HEIGHT = 1200, 630
SAFE = 630  # the central square every crop keeps
LOCKUP_WIDTH = 500

# Rasterize the official SVG with sharp (a dependency of the site).
with tempfile.TemporaryDirectory() as tmp:
    png = Path(tmp) / "lockup.png"
    subprocess.run(
        [
            "node",
            "-e",
            "require('sharp')(process.argv[1], { density: 300 })"
            ".resize({ width: Number(process.argv[3]) })"
            ".png().toFile(process.argv[2])",
            str(LOCKUP),
            str(png),
            str(LOCKUP_WIDTH),
        ],
        check=True,
        cwd=ROOT,
    )
    lockup = Image.open(png).convert("RGBA")
    # Trim the transparent margin of the artboard so the mark is centered.
    lockup = lockup.crop(lockup.getbbox())

font = ImageFont.truetype(str(FONTS / "urbanist-latin-500-normal.woff"), 38)
tagline = "Humanizamos la ingeniería"
draw_probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
left, top, right, bottom = draw_probe.textbbox((0, 0), tagline, font=font)
text_w, text_h = right - left, bottom - top

gap = 44
block_h = lockup.height + gap + text_h
assert lockup.width <= SAFE - 80 and block_h <= SAFE - 120, "keep it in the square"

canvas = Image.new("RGB", (WIDTH, HEIGHT), SAND_50)
y = (HEIGHT - block_h) // 2
canvas.paste(lockup, ((WIDTH - lockup.width) // 2, y), lockup)
draw = ImageDraw.Draw(canvas)
draw.text(
    ((WIDTH - text_w) // 2 - left, y + lockup.height + gap - top),
    tagline,
    font=font,
    fill=PLUM_950,
)

canvas.save(OUT, "JPEG", quality=90, optimize=True, progressive=True)
print(f"wrote {OUT.relative_to(ROOT)}")
