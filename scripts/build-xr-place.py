#!/usr/bin/env python3
"""Bundle the original tiny map with its renderer; no late map-data request."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/works/xr/experience/place-dots.json'
TARGET = ROOT / 'assets/xr-place-native.js'
START = '  // BEGIN GENERATED PLACE DATA'
END = '  // END GENERATED PLACE DATA'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = SOURCE.read_bytes() if SOURCE.is_file() else subprocess.check_output(
        ['git', 'show', 'HEAD:' + SOURCE.relative_to(ROOT).as_posix()], cwd=ROOT)
    data = json.loads(raw)
    assert len(data['players']) == 4
    assert all(len(cell) == 3 and 0 <= cell[2] <= 5 for cell in data['cells'])
    block = (START + '\n  // Original source SHA256: ' + hashlib.sha256(raw).hexdigest()
             + '\n  const PLACE_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':'))
             + ';\n' + END)
    text = TARGET.read_text()
    updated, count = re.subn(re.escape(START) + r'.*?' + re.escape(END), lambda _: block, text, flags=re.S)
    assert count == 1, 'Expected exactly one generated map block'
    if args.check:
        assert updated == text, 'Map renderer is stale; run scripts/build-xr-place.py'
    elif updated != text:
        TARGET.write_text(updated)
    print(f"Original map bundled: {len(data['cells'])} cells, {len(raw)} source bytes; current={updated == TARGET.read_text()}")


if __name__ == '__main__':
    main()
