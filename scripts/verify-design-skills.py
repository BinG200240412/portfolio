#!/usr/bin/env python3
"""Validate the portfolio catalog and actual SVG payloads without rendering bitmaps."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import re
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
page = root / 'sections/design-skills.html'
page_text = page.read_text()
folder = root / 'assets/works/design-skills'
catalog = json.loads((folder / 'catalog.json').read_text())
assert len(catalog['gallery']) == 75
assert len(catalog['icons']) == 43
assert len({entry['id'] for entries in (catalog['gallery'], catalog['icons']) for entry in entries}) == 118
assert '/Users/' not in (folder / 'catalog.json').read_text()
assert not re.search(r'\.png|\.jpe?g|\.webp', page_text, re.I)

class PreviewLinks(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert 'download' not in attrs, (tag, attrs)
        if tag == 'a':
            href = attrs.get('href', '').split('?')[0].split('#')[0]
            assert not re.search(r'\.(?:svg|png|jpe?g|webp|mp4|zip|json)$', href, re.I), href

PreviewLinks().feed(page_text)
assert '可交互预览' in page_text
assert 'archive-download' not in page_text
for module in ('skills-icon-library.js', 'design-skills.js'):
    source = (root / 'assets' / module).read_text()
    assert not re.search(r'\.download\s*=|createObjectURL|new\s+Blob\b', source), module
    assert 'archive-download' not in source, module
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
for match in re.findall(r'(?:src|href)="([^"#]+)"', page_text):
    if match.startswith(('http:', 'https:')):
        continue
    local = match.split('?')[0].split('#')[0]
    assert (page.parent / local).exists(), local
sample = ET.parse(folder / 'figma-settings-poster-group.svg')
assert not any(node.tag.split('}')[-1] == 'image' for node in sample.iter())
print('PASS: 75 unique vector artworks, 43 ink-coloured path icons, preview-only links, local references and Figma SVG sample.')
