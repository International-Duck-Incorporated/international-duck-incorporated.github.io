#!/usr/bin/env python3
"""Generate a 1200x630 Open Graph / Twitter card image for the site.

Uses only assets already in the repo (assets/org-avatar.png) plus DejaVu,
which is available in the build sandbox. Output: assets/og-default.png
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
BG = (7, 9, 13)          # matches <meta name="theme-color" content="#07090d">
BLUE = (138, 184, 246)   # #8ab8f6 from the site palette
STEEL = (74, 127, 192)   # #4a7fc0
TEXT = (220, 236, 255)   # #dcecff
MUTED = (150, 168, 194)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# soft blue glow, bottom-right (echoes .site-glow-blue)
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 560, H - 420, W + 260, H + 300], fill=(16, 34, 62))
gd.ellipse([-220, -260, 420, 260], fill=(12, 24, 46))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, glow, 0.85)
d = ImageDraw.Draw(img)

# thin top accent rule
d.rectangle([0, 0, W, 6], fill=STEEL)

# org avatar
av = Image.open("assets/org-avatar.png").convert("RGBA")
SIZE = 168
av = av.resize((SIZE, SIZE), Image.LANCZOS)
AX, AY = 96, (H - SIZE) // 2 - 30
# rounded mask
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE, SIZE], radius=38, fill=255)
img.paste(av, (AX, AY), mask)
d.rounded_rectangle([AX, AY, AX + SIZE, AY + SIZE], radius=38, outline=(64, 86, 120), width=2)

TX = AX + SIZE + 46

f_kick = ImageFont.truetype(FONT_B, 24)
f_1 = ImageFont.truetype(FONT_B, 72)
f_2 = ImageFont.truetype(FONT_B, 72)
f_tag = ImageFont.truetype(FONT, 30)

RIGHT = W - 96
MAXW = RIGHT - TX


def wrap(text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if d.textlength(trial, font=font) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


d.text((TX, AY - 4), "INTERNATIONAL DUCK INCORPORATED", font=f_kick, fill=BLUE)
d.text((TX, AY + 40), "International Duck", font=f_1, fill=TEXT)
d.text((TX, AY + 118), "Incorporated.", font=f_2, fill=MUTED)
ty = AY + 212
for line in wrap("Open-source Minecraft mods, tools and experiments \u2014 built in public on GitLab.",
                 f_tag, MAXW):
    d.text((TX, ty), line, font=f_tag, fill=MUTED)
    ty += 40

# footer strip
d.line([96, H - 86, W - 96, H - 86], fill=(38, 52, 76), width=1)
f_foot = ImageFont.truetype(FONT, 24)
left, right = "idi-official.pages.dev", "Beacon \u00b7 Venomous \u00b7 NullTrace \u00b7 ZonedOut"
d.text((96, H - 68), left, font=f_foot, fill=BLUE)
d.text((RIGHT - d.textlength(right, font=f_foot), H - 68), right, font=f_foot, fill=MUTED)

img.save("assets/og-default.png", "PNG", optimize=True)
print("wrote assets/og-default.png", img.size)
