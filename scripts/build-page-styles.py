#!/usr/bin/env python3
"""Keep each entry's styles in its HTML, without a render-blocking request fan-out.

The named CSS files remain the editable sources. This preserves their exact
cascade order and media conditions; relative CSS URLs are rebased to the page.
Run through sync-shared-assets.py after editing CSS, or use --check in review.
"""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
STYLE = re.compile(r'<style\b(?=[^>]*\bdata-portfolio-style-source=)[^>]*>.*?</style\s*>|<link\b[^>]*>', re.I | re.S)
URL = re.compile(r'url\(\s*(?:([\'"])(.*?)\1|([^)]*?))\s*\)', re.I | re.S)


class Tag(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.tag = tag
        self.attrs = dict(attrs)


def source_bytes(path: Path) -> bytes:
    if path.is_file():
        return path.read_bytes()
    # Release checkouts may be sparse. Read only the specified source at HEAD.
    return subprocess.check_output(['git', 'show', 'HEAD:' + path.relative_to(ROOT).as_posix()], cwd=ROOT)


def rebase_urls(css: str, source: Path, page: Path) -> str:
    def replace(match):
        value = (match[2] if match[1] else match[3]).strip()
        parts = urlsplit(value)
        if not value or parts.scheme or parts.netloc or value.startswith(('/', '#')):
            return match[0]
        target = (source.parent / parts.path).resolve()
        if not target.is_relative_to(ROOT):
            raise ValueError(f'CSS URL outside site: {source}: {value}')
        relative = Path(os.path.relpath(target, page.parent)).as_posix()
        rebased = urlunsplit(('', '', relative, parts.query, parts.fragment))
        return 'url("' + rebased.replace('"', '%22') + '")'
    return URL.sub(replace, css)


def build(page: Path, text: str) -> tuple[str, int]:
    count = 0
    def replace(match):
        nonlocal count
        parser = Tag()
        parser.feed(match[0].split('>', 1)[0] + '>')
        attrs = parser.attrs
        if parser.tag == 'style':
            relative = attrs['data-portfolio-style-source']
        else:
            if 'stylesheet' not in attrs.get('rel', '').split() or 'disabled' in attrs:
                return match[0]
            relative = attrs.get('href', '')
        parts = urlsplit(relative)
        if parts.scheme or parts.netloc or not parts.path.endswith('.css'):
            return match[0]
        source = (page.parent / parts.path).resolve()
        if not source.is_relative_to(ROOT / 'assets'):
            return match[0]
        raw = source_bytes(source)
        css = raw.decode('utf-8')
        if re.search(r'</style', css, re.I):
            raise ValueError(f'Unsafe inline style terminator in {source}')
        if re.search(r'@import\b', css, re.I):
            raise ValueError(f'Keep CSS imports explicit before inlining: {source}')
        digest = hashlib.sha256(raw).hexdigest()[:10]
        media = (' media="' + html.escape(attrs['media'], quote=True) + '"') if attrs.get('media') else ''
        count += 1
        return ('<style data-portfolio-style-source="' + html.escape(parts.path, quote=True)
                + '" data-source-version="' + digest + '"' + media + '>\n'
                + re.sub(r'(?m)^[ \t]+$', '', rebase_urls(css, source, page)).rstrip() + '\n</style>')
    return STYLE.sub(replace, text), count


def refresh_routes(text: str) -> str:
    # Navigation must ask for the new HTML even when the previous entry is cached.
    start = text.index('const SECTION_PAGE={')
    end = text.index('\n};', start)
    def version(match):
        parts = urlsplit(match[0])
        path = ROOT / parts.path
        if not path.is_file():
            return match[0]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:10]
        query = parts.query
        if re.search(r'(^|&)v=', query):
            query = re.sub(r'(^|&)v=[^&]*', lambda m: m[1] + 'v=' + digest, query)
        else:
            query += ('&' if query else '') + 'v=' + digest
        return urlunsplit(('', '', parts.path, query, parts.fragment))
    table = re.sub(r'sections/[A-Za-z0-9-]+\.html(?:\?[^"\s#]*)?(?:#[^"\s]*)?', version, text[start:end])
    return text[:start] + table + text[end:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    pages = [*sorted((ROOT / 'sections').glob('*.html')), ROOT / 'index.html']
    changed = []
    styles = 0
    for page in pages:
        old = page.read_text()
        new, count = build(page, old)
        if page.name == 'index.html':
            new = refresh_routes(new)
        styles += count
        if new != old:
            changed.append(page.relative_to(ROOT).as_posix())
            if not args.check:
                page.write_text(new)
    if args.check and changed:
        print('Page styles are stale: ' + ', '.join(changed))
        return 1
    print(f'Page styles: {styles} sources across {len(pages)} entries; {len(changed)} updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
