"""Build the default Open Graph image (public/og-default.jpg, 1200x630).

Plum background, the official vertical lockup for dark grounds
(design/brand/oficial/vertical-recorte-negativo.svg, never redrawn), and the
tagline set in Urbanist. Run it after the brand files change; the output is
committed.

Usage (needs Pillow, and `pnpm install` for sharp and the Urbanist font):

    python scripts/build-og-image.py
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOCKUP = ROOT / "design/brand/oficial/vertical-recorte-negativo.svg"
FONTS = ROOT / "node_modules/@fontsource/urbanist/files"
OUT = ROOT / "public/og-default.jpg"

PLUM_950 = (42, 12, 78)
SAND_50 = (255, 248, 240)
SAGE_300 = (157, 203, 198)
WIDTH, HEIGHT = 1200, 630
MARGIN = 96
LOCKUP_WIDTH = 560

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

canvas = Image.new("RGB", (WIDTH, HEIGHT), PLUM_950)
# The lockup's own margin sits left of the text column.
canvas.paste(lockup, (MARGIN - 32, MARGIN), lockup)

draw = ImageDraw.Draw(canvas)
tagline_y = MARGIN + lockup.height + 50
draw.rectangle((MARGIN, tagline_y - 26, MARGIN + 64, tagline_y - 22), fill=SAGE_300)
draw.text(
    (MARGIN, tagline_y),
    "Humanizamos la ingeniería",
    font=ImageFont.truetype(str(FONTS / "urbanist-latin-500-normal.woff"), 46),
    fill=SAND_50,
)
draw.text(
    (MARGIN, HEIGHT - 72 - 26),
    "Ingeniería civil · Valparaíso y Coquimbo",
    font=ImageFont.truetype(str(FONTS / "urbanist-latin-500-normal.woff"), 26),
    fill=SAGE_300,
)

canvas.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
print(f"wrote {OUT.relative_to(ROOT)}")
