"""Extract the original PDF's circle geometry, never a raster texture.

Run from the repository root with PyMuPDF and Pillow available. The web UI
draws this small semantic model as native SVG. The rendered crop is used only
inside the optional original-diagram comparison.
"""
import json
from collections import Counter
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/works/xr/experience'
OUT.mkdir(exist_ok=True)
page = fitz.open(ROOT / 'assets/works/xr/gogo.pdf')[0]
palette = [(0.373, 0.373, 0.373), (0.514, 0.690, 0.769),
           (0.565, 0.557, 0.424), (0.831, 0.922, 0.867),
           (0.506, 0.710, 0.592), (1.0, 0.616, 0.616)]


def role(fill):
    return min(range(6), key=lambda i: sum((a-b)**2 for a, b in zip(fill, palette[i])))


cells, sequence_dots = [], []
for drawing in page.get_drawings():
    r = drawing['rect']
    if not drawing['fill'] or len(drawing['items']) != 4:
        continue
    if not (9 < r.width < 25 and 9 < r.height < 25):
        continue
    x, y = (r.x0+r.x1)/2, (r.y0+r.y1)/2
    if 630 < r.x0 < 1200 and 4850 < r.y0 < 5370:
        cells.append([round((x-655.738)/19.6833), round((y-4880.82)/19.6833), role(drawing['fill'])])
    elif 630 < r.x0 < 970 and 5420 < r.y0 < 5580:
        sequence_dots.append([x, y, role(drawing['fill'])])

cells.sort(key=lambda cell: (cell[1], cell[0]))
players = []
for row_y in [5442.5, 5480.5, 5519, 5557.5]:
    row = sorted((d for d in sequence_dots if abs(d[1]-row_y) < 1), key=lambda d: d[0])
    assert len(row) == 16
    players.append([d[2] for d in row])
assert len(cells) == 416 and len({(c, r) for c, r, _ in cells}) == 416
model = {
    'source': {'file': 'gogo.pdf', 'page': 1, 'comparison_clip': [606, 4840, 1530, 5620],
               'method': 'Original PDF circle coordinates and fills, quantized to its regular lattice.'},
    'columns': 27, 'rows': 24,
    'categories': ['neutral', 'riverside', 'platform', 'grassland', 'woodland', 'service'],
    'source_palette': [[round(c*255) for c in rgb] for rgb in palette],
    'cells': cells, 'players': players,
}
(OUT / 'place-dots.json').write_text(json.dumps(model, separators=(',', ':'))+'\n')
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(*model['source']['comparison_clip']))
Image.frombytes('RGB', [pix.width, pix.height], pix.samples).save(
    OUT / 'place-source.webp', quality=90, method=6)
print('416 native cells:', dict(Counter(c[2] for c in cells)), '; 4 original sequences of 16 cells')
