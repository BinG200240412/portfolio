"""Re-export GouGO field images from the untouched source library.

Usage: python scripts/import-xr-field.py --source /path/to/gougo现场
Captions and source mappings are kept in the adjacent field sources.json manifest.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import tempfile
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/works/xr/field'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((OUT / 'sources.json').read_text())
    with tempfile.TemporaryDirectory(prefix='gogo-field-') as temporary:
        for record in manifest['selection']:
            original = args.source / record['source_file']
            assert hashlib.sha256(original.read_bytes()).hexdigest() == record['source_sha256'], original
            decoded = original
            if original.suffix.lower() == '.heic':
                decoded = Path(temporary) / (original.stem + '.jpg')
                subprocess.run(['sips', '-s', 'format', 'jpeg', str(original), '--out', str(decoded)], check=True, stdout=subprocess.DEVNULL)
            image = ImageOps.exif_transpose(Image.open(decoded)).convert('RGB')
            image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            target = OUT / record['file']
            image.save(target, 'WEBP', quality=87, method=6)
            record['output_sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
            record['dimensions'] = list(image.size)
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Exported {len(manifest['selection'])} full-frame field images; original hashes verified.")


if __name__ == '__main__':
    main()
