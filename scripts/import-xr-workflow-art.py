"""Import the supplied workflow photographs and preserve PDF vector artwork.

Usage: python import-xr-workflow-art.py --gallery <supplied workflow folder>
Opaque PDF container panels are deliberately excluded from the SVG exports.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import pdfplumber
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/works/xr/experience/workflow'
PHOTO_MAP = {
    'arrive': 'Gemini_Generated_Image_2mw67z2mw67z2mw6.png',
    'begin': 'Gemini_Generated_Image_8kc9tc8kc9tc8kc9.png',
    'scene': 'Gemini_Generated_Image_ifiunqifiunqifiu.png',
    'landmark': '59c6397b2d4e810bc55f4aaec03c6fd6 1.png',
    'station': 'Gemini_Generated_Image_vxdbv0vxdbv0vxdb.png',
    'play1': 'Gemini_Generated_Image_hz19exhz19exhz19.png',
    'play2': 'Gemini_Generated_Image_1lqpaf1lqpaf1lqp.png',
    'play3': 'Gemini_Generated_Image_nl281anl281anl28.png',
}


def path_data(commands):
    result, current, start = [], (0, 0), (0, 0)
    pair = lambda p: ' '.join(f'{v:.3f}' for v in p)
    for command in commands:
        op, *points = command
        if op == 'm':
            current = start = points[0]
            result.append('M' + pair(current))
        elif op == 'l':
            current = points[0]
            result.append('L' + pair(current))
        elif op == 'c':
            result.append('C' + ' '.join(pair(p) for p in points))
            current = points[-1]
        elif op == 'v':
            result.append('C' + ' '.join(pair(p) for p in [current, *points]))
            current = points[-1]
        elif op == 'y':
            result.append('C' + ' '.join(pair(p) for p in [points[0], points[1], points[1]]))
            current = points[-1]
        elif op == 'h':
            result.append('Z')
            current = start
        else:
            raise ValueError(op)
    return ' '.join(result)


def compound(curves, colour, cls=''):
    d = ' '.join(path_data(c['path']) for c in curves)
    return f'<path class="{cls}" d="{d}" fill="{colour}" fill-rule="evenodd"/>'


def save_svg(name, box, body, label):
    x, y, width, height = box
    text = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {width} {height}" role="img" aria-label="{label}">{body}</svg>\n'
    (OUT / name).write_text(text)


def curves_in(page, box):
    x, y, right, bottom = box
    return [c for c in page.curves if x <= (c['x0'] + c['x1']) / 2 <= right and y <= (c['top'] + c['bottom']) / 2 <= bottom]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gallery', type=Path, required=True)
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    records = []
    for alias, filename in PHOTO_MAP.items():
        source = args.gallery / filename
        target = OUT / f'{alias}.png'
        shutil.copyfile(source, target)
        records.append({'file': target.name, 'source_file': filename, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'dimensions': list(Image.open(source).size), 'transform': 'Byte-identical supplied photograph; displayed without cropping or recoloring.'})

    pdf = ROOT / 'assets/works/xr/gogo.pdf'
    page = pdfplumber.open(pdf).pages[0]
    collect = curves_in(page, (1880, 5780, 2120, 5920))
    gold = [c for c in collect if isinstance(c['non_stroking_color'], (tuple, list))]
    tray = [c for c in collect if c['non_stroking_color'] == .561]
    save_svg('collection.svg', (1919, 5856, 166, 42), compound(gold, 'var(--gogo-accent,#a88e62)', 'gw-source-gold') + compound(tray, 'currentColor'), '考古收集物品')

    route = curves_in(page, (2130, 5690, 2380, 5835))
    grid = [c for c in route if c['non_stroking_color'] == .765]
    track = [c for c in route if c['non_stroking_color'] == .549]
    flags = [c for c in route if isinstance(c['non_stroking_color'], (tuple, list))]
    body = compound(grid, 'var(--mid,#999)', 'gw-source-grid') + compound(track, 'currentColor', 'gw-source-route')
    for c in flags:
        rgb = '#' + ''.join(f'{round(v * 255):02x}' for v in c['non_stroking_color'])
        body += compound([c], rgb, 'gw-source-flag')
    save_svg('journal-route.svg', (2173, 5765, 181, 65), body, '根据解锁地点生成个性化游玩日志')

    upload = curves_in(page, (2420, 5800, 2650, 5920))
    upload_icon = [c for c in upload if c['non_stroking_color'] == .447]
    red_letters = [c for c in upload if isinstance(c['non_stroking_color'], (tuple, list)) and c['width'] < 30]
    body = '<g transform="translate(5 10) scale(1.15) translate(-2476 -5867)">' + compound(upload_icon, 'currentColor') + '</g>'
    body += '<text x="38" y="31" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="currentColor">UPLOAD</text>'
    body += '<g transform="translate(111 17) scale(1.35) translate(-2570 -5873)">' + compound(red_letters, '#bb7364') + '</g>'
    save_svg('social-upload.svg', (0, 0, 160, 48), body, '上传至社交媒体')

    doc = curves_in(page, (2210, 5945, 2300, 6018))
    doc = [c for c in doc if c['fill'] and c['width'] < 60 and c['height'] < 60]
    if not doc:
        raise ValueError('Original journal glyph not found')
    x0 = min(c['x0'] for c in doc) - 2
    y0 = min(c['top'] for c in doc) - 2
    x1 = max(c['x1'] for c in doc) + 2
    y1 = max(c['bottom'] for c in doc) + 2
    save_svg('journal.svg', (x0, y0, x1 - x0, y1 - y0), compound(doc, 'currentColor'), '游玩日志')

    manifest = {'source_pdf': 'assets/works/xr/gogo.pdf', 'pdf_sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(), 'photos': records, 'placements': {'arrive': 'arrive.png', 'begin': 'begin.png', 'pass': 'scene.png', 'incidental': 'scene.png', 'landmark': 'landmark.png', 'station': 'station.png', 'play1': 'play1.png', 'play2': 'play2.png', 'play3': 'play3.png'}, 'vectors': {'collection.svg': 'Original jade forms and collection tray, PDF curves; container omitted.', 'journal-route.svg': 'Original grid, curved route and all seven flags, PDF curves; container omitted.', 'social-upload.svg': 'Original upload and Xiaohongshu glyph contours, native UPLOAD text; opaque tiles omitted.', 'journal.svg': 'Original journal-page glyph, PDF curves; container omitted.'}}
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(records)} supplied photos for 9 PDF-matched nodes and 4 transparent vector illustrations.')


if __name__ == '__main__':
    main()
