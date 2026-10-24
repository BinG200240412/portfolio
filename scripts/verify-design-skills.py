#!/usr/bin/env python3
"""Validate the portfolio catalog and actual SVG payloads without rendering bitmaps."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
page = root / 'sections/design-skills.html'
folder = root / 'assets/works/design-skills'
catalog = json.loads((folder / 'catalog.json').read_text())
assert len(catalog['gallery']) == 75
assert len(catalog['icons']) == 43
assert len({entry['id'] for entries in (catalog['gallery'], catalog['icons']) for entry in entries}) == 118
assert '/Users/' not in (folder / 'catalog.json').read_text()
assert not re.search(r'\.png|\.jpe?g|\.webp', page.read_text(), re.I)
seen = set()
for group in ('gallery', 'icons'):
    for entry in catalog[group]:
        path = (page.parent / entry['src']).resolve()
        assert path.is_relative_to(folder), path
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], path
        assert len(data) == entry['bytes'], path
        assert entry['width'] > 0 and entry['height'] > 0, path
        tree = ET.fromstring(data)
        tags = {node.tag.split('}')[-1] for node in tree.iter()}
        assert 'path' in tags and not {'image', 'script', 'foreignObject'}.intersection(tags), path
        assert b'base64' not in data and b'http://localhost' not in data, path
        if group == 'gallery':
            assert entry['sha256'] not in seen, path
            seen.add(entry['sha256'])
        else:
            text = data.decode()
            colours = {c.lower() for c in re.findall(r'#[0-9a-fA-F]{6}', text)}
            assert '#41403d' in colours and '#000000' not in colours, (path, colours)
for match in re.findall(r'(?:src|href)="([^"#]+)"', page.read_text()):
    if match.startswith(('http:', 'https:')):
        continue
    local = match.split('?')[0].split('#')[0]
    assert (page.parent / local).exists(), local
sample = ET.parse(folder / 'figma-settings-poster-group.svg')
assert not any(node.tag.split('}')[-1] == 'image' for node in sample.iter())
print('PASS: 75 unique vector artworks, 43 ink-coloured path icons, local references and Figma SVG sample.')
