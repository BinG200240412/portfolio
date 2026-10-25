"""Sample the user's embedded PDF illustrations into actual circular-dot data.

Requires Pillow and pypdf. No source files are changed. The website draws these
coordinates, rather than displaying raster pictures under a dot-pattern overlay.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/works/xr/gogo.pdf"
OUTPUT = ROOT / "assets/works/xr/logic/dot-assets.json"
SPECS = {
    "walk": (83, (130, 189, 375, 324), 100, False),
    "dog": (4, (275, 190, 615, 510), 72, False),
    "ar": (85, None, 112, False),
    "fragment": (83, (134, 594, 228, 673), 56, True),
    "voice": (83, (282, 606, 352, 667), 44, True),
    "route": (83, (594, 190, 830, 324), 100, False),
    "translation": (83, (594, 552, 830, 671), 100, False),
    "story": (83, (1045, 190, 1310, 325), 112, True),
    "memory": (83, (1070, 405, 1272, 544), 100, False),
    "hub": (75, (56, 55, 967, 540), 144, True),
}


def colour_role(red, green, blue):
    if max(red, green, blue) - min(red, green, blue) < 19:
        family = 0
    elif blue > red * 1.05:
        family = 1
    elif green > red * 1.07 and green > blue * .9:
        family = 2
    else:
        family = 3
    luminance = (.2126 * red + .7152 * green + .0722 * blue) / 255
    level = sum(luminance > threshold for threshold in (.22, .48, .74))
    return family * 4 + level


def main():
    page = PdfReader(SOURCE).pages[0]
    result = {
        "source": "gogo.pdf",
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "method": "Embedded original images, cropped to individual motifs, then sampled to a uniform dot lattice. No board screenshot.",
        "assets": {},
    }
    for name, (index, crop, columns, remove_white) in SPECS.items():
        original = page.images[index].image.convert("RGBA")
        image = original.crop(crop) if crop else original
        rows = round(columns * image.height / image.width)
        sample = image.resize((columns, rows), Image.Resampling.LANCZOS)
        points = []
        for y in range(rows):
            for x in range(columns):
                red, green, blue, alpha = sample.getpixel((x, y))
                if alpha < 80 or (remove_white and min(red, green, blue) > 242):
                    continue
                points.append([x, y, colour_role(red, green, blue)])
        result["assets"][name] = {
            "width": columns, "height": rows, "points": points,
            "pdfImageIndex": index, "crop": crop,
            "originalDimensions": list(original.size),
        }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(SPECS)} original motifs, {sum(len(a['points']) for a in result['assets'].values())} dots, {OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
