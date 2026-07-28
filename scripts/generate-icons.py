#!/usr/bin/env python3
"""Regenerate every app icon in `assets/` from one vector source.

The artwork — three rising torches — is described once as SVG paths, rendered at
4x, and then fitted into each target canvas. Everything downstream (adaptive
icon layers, monochrome/themed icon, notification icon, splash badge, favicon)
comes from that single render, so the variants can never drift apart.

    pip install pillow cairosvg
    python3 scripts/generate-icons.py

Re-run after changing any constant below and commit the resulting PNGs.
"""

from __future__ import annotations

import io
import math
import os

import cairosvg
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# --- brand -------------------------------------------------------------------

INDIGO_LIGHT = (114, 104, 255)
INDIGO_DARK = (72, 58, 200)
AMBER_LIGHT = (255, 166, 71)
AMBER_DARK = (226, 98, 38)

# --- artwork geometry (1000x1000 design space) -------------------------------

ANGLE = 63.0                      # torch lean, degrees from horizontal
_RAD = math.radians(ANGLE)
UX, UY = math.cos(_RAD), -math.sin(_RAD)

SHAFT_R = 46.0                    # torch shaft half-width
GAP = 13.0                        # transparent gap between flame and shaft
SPACING = 128.0                   # perpendicular distance between shafts
BASE_X, BASE_Y = 230.0, 800.0     # bottom end of the shortest torch

TORCHES = [
    # (shaft length, flame height)
    (230.0, 158.0),
    (330.0, 175.0),
    (430.0, 192.0),
]

# Flame outline in normalised space: base centre at (0, 0), one unit tall,
# negative y is up. Three tongues split by deep notches, leaning right.
FLAME = [
    ("M", (0.160, -1.000)),
    ("C", (0.215, -0.735), (0.205, -0.530), (0.190, -0.360)),    # inner right of main tongue
    ("C", (0.275, -0.435), (0.375, -0.520), (0.460, -0.620)),    # up into the right tongue
    ("C", (0.495, -0.430), (0.510, -0.255), (0.470, -0.100)),    # outer right edge
    ("C", (0.435, 0.060), (0.265, 0.160), (0.000, 0.160)),       # base, right half
    ("C", (-0.265, 0.160), (-0.435, 0.060), (-0.470, -0.100)),   # base, left half
    ("C", (-0.505, -0.265), (-0.470, -0.375), (-0.400, -0.480)), # outer left edge
    ("C", (-0.330, -0.415), (-0.240, -0.370), (-0.165, -0.360)), # down into the left notch
    ("C", (-0.190, -0.600), (-0.040, -0.860), (0.160, -1.000)),  # inner left of main tongue
    ("Z",),
]

RENDER = 2048                     # working resolution for the vector render


def _flame_path(cx: float, cy: float, h: float) -> str:
    parts = []
    for seg in FLAME:
        if seg[0] == "Z":
            parts.append("Z")
            continue
        pts = " ".join("%.2f %.2f" % (cx + x * h, cy + y * h) for x, y in seg[1:])
        parts.append(f"{seg[0]} {pts}")
    return '<path d="%s"/>' % " ".join(parts)


def _alpha(body: str) -> Image.Image:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" '
        f'viewBox="0 0 1000 1000"><g fill="#fff" stroke="#fff">{body}</g></svg>'
    )
    buf = cairosvg.svg2png(bytestring=svg.encode(), output_width=RENDER, output_height=RENDER)
    return Image.open(io.BytesIO(buf)).convert("RGBA").split()[-1]


def _layers() -> tuple[str, str, str]:
    shafts, knockouts, flames = [], [], []
    for i, (length, flame_h) in enumerate(TORCHES):
        bx = BASE_X + i * SPACING / math.sin(_RAD)
        by = BASE_Y
        tx, ty = bx + UX * length, by + UY * length
        line = (f'<line x1="{bx:.2f}" y1="{by:.2f}" x2="{tx:.2f}" y2="{ty:.2f}" '
                f'stroke-linecap="round"')
        shafts.append(f'{line} stroke-width="{2 * SHAFT_R}"/>')
        knockouts.append(f'{line} stroke-width="{2 * (SHAFT_R + GAP)}"/>')
        flames.append(_flame_path(tx, ty, flame_h))
    return "".join(flames), "".join(knockouts), "".join(shafts)


def artwork(gap: bool = True) -> Image.Image:
    """White torches on transparent, cropped tight. `gap=False` fuses the flames
    onto the shafts for sizes too small to hold a 1px separation."""
    flames, knockouts, shafts = _layers()
    flame_a = _alpha(flames)
    shaft_a = _alpha(shafts)
    if gap:
        flame_a = ImageChops.subtract(flame_a, _alpha(knockouts))
    alpha = ImageChops.lighter(flame_a, shaft_a)
    out = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out.crop(alpha.getbbox())


# --- canvas helpers ----------------------------------------------------------


def gradient(size: int, top: tuple, bottom: tuple) -> Image.Image:
    """Diagonal top-left to bottom-right gradient."""
    ramp = Image.new("RGB", (1, size))
    px = ramp.load()
    for y in range(size):
        t = y / (size - 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    ramp = ramp.resize((size * 2, size * 2), Image.BILINEAR).rotate(
        -45, resample=Image.BICUBIC, expand=False
    )
    left = (ramp.width - size) // 2
    return ramp.crop((left, left, left + size, left + size)).convert("RGBA")


def enclosing_radius(art: Image.Image) -> float:
    """Distance from `art`'s centre to its furthest opaque pixel."""
    alpha = art.split()[-1].load()
    cx, cy = (art.width - 1) / 2, (art.height - 1) / 2
    worst = 0.0
    for y in range(art.height):
        for x in range(art.width):
            if alpha[x, y] > 8:
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d > worst:
                    worst = d
    return math.sqrt(worst)


def circle_box(art: Image.Image, radius: float) -> int:
    """The `box` width that makes `art` fit exactly inside a circle of `radius`.

    The composition is diagonal, so its bounding box is a poor proxy for how
    much of a round mask it actually needs — measure the real extent instead.
    """
    return round(art.width * radius / enclosing_radius(art))


def place(canvas: Image.Image, art: Image.Image, box: int,
          shadow: bool = False) -> Image.Image:
    """Scale `art` to fit a `box`-wide square and centre it on `canvas`."""
    fitted = art.copy()
    fitted.thumbnail((box, box), Image.LANCZOS)
    x = (canvas.width - fitted.width) // 2
    y = (canvas.height - fitted.height) // 2
    if shadow:
        blur = max(1, round(canvas.width * 0.014))
        drop = max(1, round(canvas.width * 0.006))
        mask = fitted.split()[-1].filter(ImageFilter.GaussianBlur(blur))
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        layer.paste(Image.new("RGBA", fitted.size, (24, 14, 68, 48)), (x, y + drop), mask)
        canvas.alpha_composite(layer)
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def squircle(size: int, radius_ratio: float = 0.225) -> Image.Image:
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * radius_ratio), fill=255
    )
    return mask.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str, opaque: bool = False) -> None:
    path = os.path.join(ASSETS, name)
    (img.convert("RGB") if opaque else img).save(path, optimize=True)
    print(f"  {name:34s} {img.width}x{img.height}")


# --- outputs -----------------------------------------------------------------

# An adaptive icon is a 108dp canvas of which only the inner 72dp is ever shown,
# and a round launcher mask trims that down to a 66dp circle. The old foreground
# ignored this and had its outer flame and lowest torch sliced off, so the
# foreground layers are now fitted to that 66dp circle. Everything else is a
# finished icon rather than a masked layer and can sit proportionally larger.
SAFE_CIRCLE = 1024 * 33 / 108
ICON_BOX = 0.68


def build(name_suffix: str, light: tuple, dark: tuple, adaptive: bool) -> None:
    art = artwork()

    icon = gradient(1024, light, dark)
    place(icon, art, round(1024 * ICON_BOX), shadow=True)
    save(icon, f"icon{name_suffix}.png", opaque=True)

    save(gradient(1024, light, dark), f"android-icon-background{name_suffix}.png", opaque=True)

    badge = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    body = gradient(1024, light, dark)
    body.putalpha(squircle(1024))
    badge.alpha_composite(body)
    place(badge, art, round(1024 * ICON_BOX), shadow=True)
    badge.putalpha(ImageChops.multiply(badge.split()[-1], squircle(1024)))
    save(badge, f"splash-icon{name_suffix}.png")

    if not adaptive:
        return

    safe = circle_box(art, SAFE_CIRCLE)

    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    place(fg, art, safe)
    save(fg, "android-icon-foreground.png")

    # Themed icons are re-tinted by the launcher, so this must be a flat
    # silhouette on transparency — not the greyscale square it used to be.
    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    place(mono, art, safe)
    save(mono, "android-icon-monochrome.png")

    # Android draws notification icons from the alpha channel alone, at 24dp in
    # the status bar — the flame/shaft gap closes up at that size, so use the
    # fused silhouette, which keeps its mass instead of turning to mush.
    notif = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    place(notif, artwork(gap=False), 152)
    save(notif, "notification-icon.png")

    ico = badge.resize((256, 256), Image.LANCZOS)
    ico.save(os.path.join(ASSETS, "favicon.ico"),
             sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"  {'favicon.ico':34s} 16..256")


if __name__ == "__main__":
    print("generating icons ->", ASSETS)
    build("", INDIGO_LIGHT, INDIGO_DARK, adaptive=True)
    build("-dev", AMBER_LIGHT, AMBER_DARK, adaptive=False)
    print("done")
