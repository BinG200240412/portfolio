#!/usr/bin/env python3
"""Refresh the Archive shelves and reader data from the rendered PDF catalog."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'assets/works/more/archive-catalog.json'
PAGE = ROOT / 'sections/more.html'


def card(document):
    title = html.escape(document['title']['zh'], quote=True)
    identifier = html.escape(document['id'], quote=True)
    eager = document['group'] == 'portfolio'
    size = f"{document['sizeBytes'] / 1_000_000:.1f} MB"
    return f'''<article class="archive-document archive-document--{identifier}">
      <button class="archive-tile" type="button" data-archive-open="{identifier}" aria-label="翻阅：{title}">
        <img src="{document['cover']}" alt="{title}" width="{document['coverWidth']}" height="{document['coverHeight']}" loading="{'eager' if eager else 'lazy'}" decoding="async">
      </button>
      <div class="archive-caption">
        <h3><button class="archive-title-link" type="button" data-archive-open="{identifier}">{title}</button></h3>
        <p class="archive-meta"><span>{len(document['pages'])} 页</span><span>{size}</span></p>
        <a class="archive-download" href="{document['pdf']}" download data-archive-pdf-download aria-label="下载 PDF：{title}"><span>PDF</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></svg></a>
      </div>
    </article>'''


def main():
    catalog = json.loads(CATALOG.read_text())
    source = PAGE.read_text()
    for group in ('portfolio', 'project'):
        markup = '\n'.join(card(document) for document in catalog['documents'] if document['group'] == group)
        pattern = rf'(<!-- archive-{group}-start -->).*?(<!-- archive-{group}-end -->)'
        source, count = re.subn(pattern, lambda match: match[1]+'\n'+markup+'\n'+match[2], source, flags=re.S)
        assert count == 1, f'Missing {group} shelf'
    payload = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    source, count = re.subn(r'(<script id="archive-catalog" type="application/json">).*?(</script>)',
                            lambda match: match[1]+payload+match[2], source, flags=re.S)
    assert count == 1, 'Missing reader catalog'
    PAGE.write_text(source)
    print(f'Archive refreshed: {len(catalog["documents"])} documents, {sum(len(d["pages"]) for d in catalog["documents"])} pages')


if __name__ == '__main__':
    main()
