#!/usr/bin/env python3
"""Generate raster favicon assets from HIRELENS branding colors."""

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Pillow required: pip install pillow")

PUBLIC = Path(__file__).resolve().parent.parent / "public"
BG = (15, 23, 42)       # #0F172A
PRIMARY = (37, 99, 235) # #2563EB
ACCENT = (56, 189, 248) # #38BDF8


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.125
    radius = size * 0.25
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BG)

    inner_pad = size * 0.125
    inner = (
        inner_pad,
        inner_pad,
        size - inner_pad - 1,
        size - inner_pad - 1,
    )
    inner_radius = size * 0.1875
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(inner, radius=inner_radius, fill=(*PRIMARY, 56))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2
    eye_w = size * 0.52
    eye_h = size * 0.22
    left = cx - eye_w / 2
    top = cy - eye_h / 2
    draw.ellipse((left, top, left + eye_w, top + eye_h), outline=PRIMARY, width=max(1, size // 18))

    pupil_r = size * 0.078
    draw.ellipse(
        (cx - pupil_r, cy - pupil_r, cx + pupil_r, cy + pupil_r),
        fill=ACCENT,
    )
    return img


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    sizes = {
        "favicon-32.png": 32,
        "favicon-192.png": 192,
        "apple-touch-icon.png": 180,
    }
    for name, size in sizes.items():
        draw_icon(size).save(PUBLIC / name, format="PNG")
    # ICO bundle for legacy browsers
    icon_16 = draw_icon(16)
    icon_32 = draw_icon(32)
    icon_48 = draw_icon(48)
    icon_16.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[icon_32, icon_48],
    )
    print("Generated favicon assets in", PUBLIC)


if __name__ == "__main__":
    main()
