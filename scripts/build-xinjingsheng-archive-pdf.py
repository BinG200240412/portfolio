#!/usr/bin/env python3
"""Archive the eight project pages, excluding the next project's cover."""
import argparse
import hashlib
import json
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    source = fitz.open(args.source)
    assert len(source) == 9 and '心.境.声' in source[0].get_text()
    assert '千里江山' in source[8].get_text()
    document = fitz.open()
    document.insert_pdf(source, from_page=0, to_page=7)
    document.set_metadata({'title': '心·境·声', 'author': '蔡正阳',
                           'subject': 'Heart · Space · Sound — project archive'})
    target = ROOT / 'assets/works/xinjingsheng/xinjingsheng.pdf'
    document.save(target, garbage=4, deflate=True)
    document.close()
    with fitz.open(target) as result:
        assert len(result) == 8
        for i, page in enumerate(result):
            assert page.rect == source[i].rect
            assert page.get_text() == source[i].get_text()
            original = source[i].get_pixmap(matrix=fitz.Matrix(.25, .25), alpha=False)
            actual = page.get_pixmap(matrix=fitz.Matrix(.25, .25), alpha=False)
            assert original.samples == actual.samples, f'Page {i+1} render changed'
    record = {'source': args.source.name, 'sourceSHA256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'sourcePages': [1, 8], 'excludedPage': 9, 'pages': 8,
              'pageSizePoints': [1920, 1080], 'renderAndTextMatch': True,
              'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size}
    target.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
