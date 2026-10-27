#!/usr/bin/env python3
"""Check the published UI policy; this does not claim network-level asset protection."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re

root = Path(__file__).resolve().parents[1]
pages = [root / 'index.html', *sorted((root / 'sections').glob('*.html'))]
file_extension = re.compile(r'\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp|mp4|m4v|mov|webm|og[gv]|mp3|m4a|wav|flac|aac|pdf|zip|7z|rar|obj|fbx|glb|gltf|ply|spz|stl|usdz)$', re.I)
video_count = 0

class PagePolicy(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.shared = set()

    def handle_starttag(self, tag, attrs):
        global video_count
        attrs = dict(attrs)
        assert 'download' not in attrs, (self.path.name, 'download attribute')
        if tag == 'a':
            href = attrs.get('href', '')
            assert not file_extension.search(urlsplit(href).path), (self.path.name, href)
            assert not href.startswith(('blob:', 'data:')), (self.path.name, 'file URL')
        if tag in ('video', 'audio'):
            assert 'nodownload' in attrs.get('controlslist', '').split(), (self.path.name, tag)
            assert 'controls' not in attrs, (self.path.name, 'inline controls')
            video_count += 1
        if tag in ('script', 'link'):
            source = attrs.get('src', '') if tag == 'script' else attrs.get('href', '')
            name = Path(urlsplit(source).path).name
            if name in ('media-view-only.js', 'media-view-only.css', 'video-detail.js', 'video-detail.css'):
                assert (self.path.parent / urlsplit(source).path).resolve().is_file(), source
                self.shared.add(name)

for page in pages:
    parser = PagePolicy(page)
    parser.feed(page.read_text())
    assert parser.shared == {'media-view-only.js', 'media-view-only.css', 'video-detail.js', 'video-detail.css'}, page.name

for module in (root / 'assets').rglob('*.js'):
    if 'vendor' in module.relative_to(root / 'assets').parts:
        continue
    assert not re.search(r'\.download\s*=|setAttribute\(\s*[\'"]download[\'"]', module.read_text()), module.name

assert video_count == 5, video_count
print(f'PASS: {len(pages)} pages, no file-download links or export handlers; {video_count} inline previews hide controls and retain nodownload.')
