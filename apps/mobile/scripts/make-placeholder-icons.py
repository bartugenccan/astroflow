"""Placeholder AstroFlow app icons (Celestial Gold palette). Usage: python scripts/make-placeholder-icons.py assets

Gold crescent + four-point star inside a thin gold ring on deep navy.
Rendered at 4x and downsampled for clean edges.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(sys.argv[1])
SS = 4
NAVY_EDGE = (6, 8, 16)
NAVY_CORE = (24, 30, 58)
GOLD = (231, 205, 143)
GOLD_DEEP = (194, 156, 72)


def background(size):
    img = Image.new("RGB", (size, size), NAVY_EDGE)
    px = img.load()
    c = size / 2
    rmax = math.hypot(c, c)
    for y in range(size):
        for x in range(size):
            t = min(1.0, math.hypot(x - c, y - c * 0.9) / (rmax * 0.95))
            t = t ** 1.4
            px[x, y] = tuple(round(NAVY_CORE[i] * (1 - t) + NAVY_EDGE[i] * t) for i in range(3))
    return img


def glyph_mask(size, scale):
    """Mask for crescent + star + ring, centred, occupying `scale` of the canvas."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    c = size / 2
    R = size * scale / 2

    # thin ring
    ring_w = max(2, round(R * 0.035))
    d.ellipse([c - R, c - R, c + R, c + R], outline=255, width=ring_w)

    # crescent: disc minus offset disc
    cr = R * 0.62
    disc = Image.new("L", (size, size), 0)
    ImageDraw.Draw(disc).ellipse([c - cr - R * 0.08, c - cr, c + cr - R * 0.08, c + cr], fill=255)
    cut = Image.new("L", (size, size), 0)
    off = cr * 0.42
    ImageDraw.Draw(cut).ellipse(
        [c - cr - R * 0.08 + off, c - cr - off * 0.35, c + cr - R * 0.08 + off, c + cr - off * 0.35], fill=255
    )
    crescent = ImageChops.subtract(disc, cut)
    m = ImageChops.lighter(m, crescent)

    # four-point star sitting in the crescent's mouth
    d = ImageDraw.Draw(m)
    sx, sy = c + R * 0.30, c - R * 0.18
    long_r, short_r = R * 0.26, R * 0.06
    pts = []
    for i in range(8):
        a = -math.pi / 2 + i * math.pi / 4
        r = long_r if i % 2 == 0 else short_r
        pts.append((sx + r * math.cos(a), sy + r * math.sin(a)))
    d.polygon(pts, fill=255)
    # small companion star
    sx2, sy2 = c + R * 0.52, c + R * 0.22
    pts2 = []
    for i in range(8):
        a = -math.pi / 2 + i * math.pi / 4
        r = (long_r * 0.42) if i % 2 == 0 else (short_r * 0.45)
        pts2.append((sx2 + r * math.cos(a), sy2 + r * math.sin(a)))
    d.polygon(pts2, fill=255)
    return m


def gold_layer(size):
    """Vertical gold gradient (light top → deeper bottom)."""
    strip = Image.new("RGB", (1, 256))
    px = strip.load()
    for y in range(256):
        t = y / 255
        px[0, y] = tuple(round(GOLD[i] * (1 - t * 0.55) + GOLD_DEEP[i] * t * 0.55) for i in range(3))
    return strip.resize((size, size), Image.BICUBIC)


def compose(final, scale, with_bg):
    size = final * SS
    mask = glyph_mask(size, scale)
    gold = gold_layer(size)
    if with_bg:
        base = background(final).resize((size, size), Image.BICUBIC)
        glow = mask.filter(ImageFilter.GaussianBlur(size * 0.02)).point(lambda v: int(v * 0.45))
        glow_col = Image.new("RGB", (size, size), (217, 185, 100))
        base = Image.composite(glow_col, base, glow)
        img = Image.composite(gold, base, mask).convert("RGB")
    else:
        img = gold.convert("RGBA")
        img.putalpha(mask)
    return img.resize((final, final), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    compose(1024, 0.72, True).save(OUT / "icon.png")
    # Android adaptive foreground: keep glyph inside the 66% safe zone.
    compose(1024, 0.52, False).save(OUT / "adaptive-icon.png")
    compose(1024, 0.80, False).save(OUT / "splash-icon.png")
    compose(48, 0.80, True).save(OUT / "favicon.png")
    print("ok", sorted(p.name for p in OUT.glob("*.png")))


if __name__ == "__main__":
    main()
