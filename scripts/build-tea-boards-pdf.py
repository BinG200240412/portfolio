#!/usr/bin/env python3
"""Combine the two author-supplied complete exhibition boards, without page screenshots."""
import argparse
import hashlib
import io
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
Image.MAX_IMAGE_PIXELS = None  # The supplied culture board is 379 megapixels.


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--culture', required=True, type=Path)
    parser.add_argument('--space', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/works/tea/tea-boards.pdf')
    parser.add_argument('--max-width', type=int, default=7680)
    parser.add_argument('--quality', type=int, default=90)
    args = parser.parse_args()
    document = fitz.open()
    records = []
    titles = ['文化调研与游戏系统', '空间体验与展陈设计']
    for number, (name, source) in enumerate([('culture', args.culture), ('space', args.space)], 1):
        image = Image.open(source)
        source_size = image.size
        image.thumbnail((args.max_width, args.max_width * 4), Image.Resampling.LANCZOS, reducing_gap=3.0)
        if image.mode == 'RGBA':
            paper = Image.new('RGB', image.size, 'white')
            paper.paste(image, mask=image.getchannel('A'))
            image = paper
        else:
            image = image.convert('RGB')
        encoded = io.BytesIO()
        image.save(encoded, format='JPEG', quality=args.quality, subsampling=0, optimize=True)
        width = 1000
        height = width * source_size[1] / source_size[0]
        page = document.new_page(width=width, height=height)
        page.insert_image(page.rect, stream=encoded.getvalue(), keep_proportion=True)
        records.append({'page': number, 'board': name, 'title': titles[number - 1],
                        'sourceFile': source.name, 'sourceSHA256': sha256(source),
                        'sourcePixels': list(source_size), 'embeddedPixels': list(image.size),
                        'pagePoints': [width, height], 'jpegQuality': args.quality,
                        'chromaSubsampling': '4:4:4', 'crop': 'none',
                        'alpha': 'composited onto white when needed'})
        image.close()
        print(f'Board {number}: {source_size} -> {records[-1]["embeddedPixels"]}', flush=True)
    document.set_metadata({'title': '茶弦记 · 设计展板',
                           'subject': '文化调研与游戏系统；空间体验与展陈设计',
                           'creator': 'build-tea-boards-pdf.py'})
    document.set_toc([[1, title, index + 1] for index, title in enumerate(titles)])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    document.save(args.output, garbage=4, deflate=True)
    document.close()
    with fitz.open(args.output) as check:
        assert len(check) == 2
        for page, record in zip(check, records):
            assert len(page.get_images()) == 1
            assert abs(page.rect.height / page.rect.width - record['sourcePixels'][1] / record['sourcePixels'][0]) < 1e-6
    provenance = {'title': '茶弦记 · 设计展板', 'pageOrder': ['culture', 'space'],
                  'operation': f'Complete source boards, proportionally downsampled at most to {args.max_width}px wide, JPEG{args.quality} 4:4:4 in a two-page PDF; no new cover, crop or content edits.',
                  'pages': records, 'sizeBytes': args.output.stat().st_size,
                  'sha256': sha256(args.output)}
    args.output.with_name('tea-boards-source.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    print(f'{args.output}: {provenance["sizeBytes"]:,} bytes', flush=True)


if __name__ == '__main__':
    main()
