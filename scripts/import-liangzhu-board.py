#!/usr/bin/env python3
"""Import original Liangzhu board media and vector paths without repainting them."""
from pathlib import Path
import hashlib
import io
import json
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/works/ai3d/liangzhu-3d.pdf'
OUT = ROOT / 'assets/works/ai3d/board'
OUT.mkdir(exist_ok=True)
doc = fitz.open(SOURCE)
page = doc[0]
media = {
    'site-aerial': 23, 'site-platform': 27, 'site-water': 24, 'site-houses': 26,
    'style-wetland': 31, 'style-clouds': 35, 'style-field': 29, 'style-forest': 33,
    'output-platform': 75, 'output-water': 77, 'output-houses': 79,
    'output-hut': 71, 'output-field': 73, 'output-aerial': 81,
    'panorama-hut-input': 87, 'panorama-hut-result': 89,
    'panorama-field-input': 85, 'panorama-field-result': 93,
    'panorama-hut-record': 96, 'panorama-field-record': 120,
    'marble-input-hut': 127, 'marble-input-field': 129, 'marble-input-aerial': 130,
    'marble-interface': 136,
    'scene-hut-points': 141, 'scene-hut-view-a': 132, 'scene-hut-view-b': 134,
    'scene-platform-points': 147, 'scene-platform-view-a': 143, 'scene-platform-view-b': 145,
}
manifest = {'source': 'assets/works/ai3d/liangzhu-3d.pdf',
            'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'page': 1, 'media': {}}
for name, xref in media.items():
    data = doc.extract_image(xref)
    im = Image.open(io.BytesIO(data['image'])).convert('RGB')
    im.thumbnail((1800, 1800))
    im.save(OUT / f'{name}.webp', quality=94, method=6)
    manifest['media'][name] = {'xref': xref, 'source_size': [data['width'], data['height']],
                             'size': list(im.size), 'source_rects': [list(r) for r in page.get_image_rects(xref)]}

def path_data(items):
    result, last = [], None
    def point(p): return f'{p.x:.3f} {p.y:.3f}'
    for item in items:
        op = item[0]
        if op in ('l', 'c'):
            start = item[1]
            if last != start: result.append('M' + point(start))
            if op == 'l': result.append('L' + point(item[2])); last = item[2]
            else: result.append('C' + ' '.join(point(p) for p in item[2:])); last = item[-1]
        elif op == 're':
            r = item[1]
            result.append(f'M{r.x0:.3f} {r.y0:.3f}H{r.x1:.3f}V{r.y1:.3f}H{r.x0:.3f}Z')
            last = None
        elif op == 'qu':
            q = item[1]
            result.append('M' + point(q.ul) + 'L' + point(q.ur) + 'L' + point(q.lr) + 'L' + point(q.ll) + 'Z')
            last = None
        else: raise ValueError(op)
    return ''.join(result)

diagrams = {}
drawings = page.get_drawings()
for name, indices, bounds in [
    ('overview', range(396, 511), [60, 4770, 2620, 380]),
    ('repaint', range(75, 164), [865, 1615, 1820, 440]),
]:
    paths = []
    for index in indices:
        drawing = drawings[index]
        colour = drawing['fill'] or drawing['color']
        if not colour: continue
        chromatic = max(colour) - min(colour) > .1
        arrow = name == 'repaint' and index in (107, 109, 111, 147, 149, 151, 153, 155, 157, 159, 161, 163)
        if not chromatic and not arrow: continue
        # Exclude coloured outlined text: real marks and ribbons have four segments.
        if chromatic and len(drawing['items']) != 4: continue
        if arrow: tone = 'ink'
        elif colour[0] > .9: tone = 'ochre'
        elif colour[1] > colour[2]: tone = 'green'
        else: tone = 'violet'
        paths.append({'source_index': index, 'd': path_data(drawing['items']), 'tone': tone,
                      'opacity': drawing.get('fill_opacity', 1), 'bounds': list(drawing['rect'])})
    diagrams[name] = {'viewBox': bounds, 'paths': paths}
(OUT / 'sankey-paths.json').write_text(json.dumps(diagrams, separators=(',', ':')))
manifest['diagrams'] = {key: {'path_count': len(value['paths']), 'viewBox': value['viewBox']}
                        for key, value in diagrams.items()}
(OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Imported {len(media)} original images; ' + ', '.join(f'{k}: {len(v["paths"])} native paths' for k,v in diagrams.items()))
