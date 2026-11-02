#!/usr/bin/env python3
"""Extract original project images from the supplied Figma PDF, not page screenshots."""
import argparse
import io
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/works/xinjingsheng'
ITEMS = [
    ('hero', 1, 5, 0), ('water', 2, 819, 0),
    ('sketch', 4, 1349, 90), ('model-section', 4, 1335, 0),
    ('model-front', 4, 1345, 0), ('mechanism', 5, 1799, 0),
    ('assembly', 8, 3311, 0), ('installation', 8, 3317, 0),
    ('detail', 8, 3339, 0), ('top-view', 8, 3295, 0),
]
PHOTOGRAPHS = {'hero', 'water', 'assembly', 'installation', 'detail', 'top-view'}


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--source', type=Path, required=True)
    source = args.parse_args().source
    document = fitz.open(source)
    assert len(document) == 9 and '心.境.声' in document[0].get_text()
    assert '千里江山' in document[8].get_text()  # Not part of this project.
    (ASSETS / 'originals').mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, page, xref, rotation in ITEMS:
        assert xref in [item['xref'] for item in document[page - 1].get_image_info(xrefs=True)]
        data = document.extract_image(xref)
        image = Image.open(io.BytesIO(data['image']))
        if data.get('smask'):
            pixmap = fitz.Pixmap(fitz.Pixmap(document, xref), fitz.Pixmap(document, data['smask']))
            image = Image.open(io.BytesIO(pixmap.tobytes('png')))
        if rotation:
            image = image.rotate(rotation, expand=True)
        if image.mode == 'RGBA':
            image = image.crop(image.getchannel('A').getbbox())
        extension = 'jpg' if name in PHOTOGRAPHS else 'png'
        original = ASSETS / 'originals' / f'{name}.{extension}'
        if name in PHOTOGRAPHS:
            image.convert('RGB').save(original, quality=94, subsampling=0, optimize=True)
        elif not rotation and not data.get('smask'):
            original.write_bytes(data['image'])
        else:
            image.save(original)
        preview = image.copy()
        preview.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        preview.save(ASSETS / f'{name}.webp', quality=86, method=6)
        manifest[name] = {'page': page, 'xref': xref, 'preview': f'{name}.webp',
                          'original': f'originals/{original.name}',
                          'width': preview.width, 'height': preview.height}
    (ASSETS / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
