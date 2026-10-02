"""Build the default Open Graph image (public/og-default.jpg, 1200x630).

Plum background, cream logo and the tagline set in Urbanist. Run it once
after the brand assets change; the output is committed.

Usage (needs Pillow, and the design-system repo checked out next to this one):

    python scripts/build-og-image.py [path/to/emoj-logo-crema.png]
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else ROOT.parent / "design-system/logo/png/emoj-logo-crema.png"
)
FONT = ROOT / "node_modules/@fontsource/urbanist/files/urbanist-latin-500-normal.woff"
OUT = ROOT / "public/og-default.jpg"

PLUM_950 = (42, 12, 78)
SAND_50 = (255, 248, 240)
SAGE_300 = (157, 203, 198)
WIDTH, HEIGHT = 1200, 630
MARGIN = 96

canvas = Image.new("RGB", (WIDTH, HEIGHT), PLUM_950)

logo = Image.open(LOGO).convert("RGBA")
logo_width = 520
logo = logo.resize(
    (logo_width, round(logo.height * logo_width / logo.width)), Image.LANCZOS
)
canvas.paste(logo, (MARGIN - 12, 120), logo)

draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype(str(FONT), 44)
tagline_y = 120 + logo.height + 40
draw.rectangle((MARGIN, tagline_y - 20, MARGIN + 64, tagline_y - 16), fill=SAGE_300)
draw.text((MARGIN, tagline_y), "Humanizamos la ingeniería", font=font, fill=SAND_50)

small = ImageFont.truetype(str(FONT), 26)
draw.text(
    (MARGIN, HEIGHT - MARGIN + 20),
    "Ingeniería civil · Región de Valparaíso",
    font=small,
    fill=SAGE_300,
)

canvas.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
print(f"wrote {OUT.relative_to(ROOT)}")
