"""Create faithful, proportionate web excerpts from the Commons scan.

Usage: python scripts/build-qianli-painting.py master.jpg
Requires ffmpeg. No generative enhancement or colour adjustment is applied.
"""
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/works/qianli/case/painting-hd'
MASTER = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
EXCERPTS = {
    'entry': (24000, 0, 8000, 1600),
    'layers': (26000, 0, 3400, 1600),
    'sample-1': (31900, 0, 7600, 1600),
    'sample-2': (24200, 0, 7000, 1600),
    'sample-3': (11500, 0, 7000, 1600),
    'sample-4': (2100, 0, 7000, 1600),
}
meta = {'sourcePage': 'https://commons.wikimedia.org/wiki/File:Wang_Ximeng._A_Thousand_Li_of_Rivers_and_Mountains._(Complete,_51,3x1191,5_cm)._1113._Palace_museum,_Beijing.jpg',
        'sourceDimensions': [39974, 1600],
        'sourceSha256': hashlib.sha256(MASTER.read_bytes()).hexdigest(),
        'license': 'Public Domain Mark 1.0; faithful reproduction of public-domain art',
        'treatment': 'Crop and proportional resampling only; no colour edits or generative enhancement',
        'excerpts': {}}
for name, rect in EXCERPTS.items():
    x, y, w, h = rect
    widths = ([960, 1920, 3200] if name == 'entry' else [640, 1280, 1920]) + [w]
    records = []
    for width in widths:
        height = round(h * width / w)
        dest = OUT / f'{name}-{width}.webp'
        subprocess.run(['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-y', '-i', str(MASTER),
            '-vf', f'crop={w}:{h}:{x}:{y},scale={width}:{height}', '-frames:v', '1',
            '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6', str(dest)], check=True)
        records.append({'file': dest.name, 'width': width, 'height': height, 'bytes': dest.stat().st_size})
    meta['excerpts'][name] = {'sourceCrop': list(rect), 'outputs': records}
(OUT / 'source.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
print('Built', sum(len(x['outputs']) for x in meta['excerpts'].values()), 'proportionate painting excerpts')
