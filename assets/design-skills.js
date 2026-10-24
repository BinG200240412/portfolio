(() => {
  'use strict';
  const root = document.getElementById('visual-archive');
  if (!root) return;
  const wall = document.getElementById('archive-wall');
  const filters = document.getElementById('archive-filters');
  const count = document.getElementById('archive-count');
  const status = document.getElementById('archive-status');
  const sentinel = document.getElementById('archive-sentinel');
  const more = document.getElementById('archive-more');
  const viewer = document.getElementById('archive-viewer');
  const image = document.getElementById('archive-viewer-image');
  const title = document.getElementById('archive-viewer-title');
  const download = document.getElementById('archive-download');
  const close = document.getElementById('archive-close');
  const prev = document.getElementById('archive-prev');
  const next = document.getElementById('archive-next');
  const position = document.getElementById('archive-position');
  let entries = [], visible = [], active = 'all', shown = 0, current = -1, opener, columns = [], heights = [], columnCount = 0;
  const en = () => window.PortfolioI18n?.language === 'en';
  const tr = (zh, eng) => en() ? eng : zh;
  const label = entry => en() ? entry.titleEn || entry.title : entry.title;
  const categories = {
    all: ['全部', 'All'], posters: ['海报', 'Posters'], daily: ['每日挑战', 'Daily challenges'],
    illustrations: ['插图', 'Illustrations'], achievements: ['成就', 'Achievements'], botanical: ['植物与工具', 'Botanicals & tools'], stamps: ['组合图章', 'Stamps']
  };
  const categoryLabel = key => categories[key]?.[en() ? 1 : 0] || key;
  function updateCopy() {
    filters.setAttribute('aria-label', tr('筛选版画', 'Filter artwork'));
    wall.setAttribute('aria-label', tr('数独 SVG 展示墙', 'Sudoku SVG archive'));
    more.textContent = tr('继续浏览 ↓', 'Keep browsing ↓');
    close.setAttribute('aria-label', tr('关闭预览', 'Close preview'));
    prev.setAttribute('aria-label', tr('上一张', 'Previous artwork'));
    next.setAttribute('aria-label', tr('下一张', 'Next artwork'));
    download.textContent = tr('下载 SVG ↓', 'Download SVG ↓');
    filters.replaceChildren();
    ['all', ...Object.keys(categories).filter(key => key !== 'all' && entries.some(e => e.category === key))].forEach(key => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.category = key;
      button.setAttribute('aria-pressed', String(key === active));
      button.append(categoryLabel(key));
      const n = document.createElement('small'); n.textContent = key === 'all' ? entries.length : entries.filter(e => e.category === key).length;
      button.append(n); filters.append(button);
    });
    updateCount();
  }
  function updateCount() {
    count.textContent = tr(`${visible.length} 件 / 原生 SVG`, `${visible.length} works / original SVG`);
    sentinel.hidden = shown >= visible.length;
    status.textContent = shown >= visible.length
      ? tr('已浏览全部作品 · 保留原始比例与矢量细节', 'All works shown · Original proportions and vector detail')
      : tr(`已展开 ${shown} / ${visible.length} 件 · 下滑继续浏览`, `${shown} / ${visible.length} shown · Scroll for more`);
  }
  function makeTile(entry, index) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'archive-tile'; button.dataset.id = entry.id;
    button.setAttribute('aria-label', tr(`放大查看：${entry.title}`, `View ${label(entry)}`));
    const paper = document.createElement('span'); paper.className = 'archive-paper';
    const img = document.createElement('img');
    img.src = entry.src; img.alt = label(entry); img.loading = 'lazy'; img.decoding = 'async';
    img.width = Math.round(entry.width || 1000); img.height = Math.round(entry.height || 1200);
    img.style.aspectRatio = `${entry.width || 1000} / ${entry.height || 1200}`;
    paper.append(img);
    const caption = document.createElement('span'); caption.className = 'tile-label';
    const text = document.createElement('span'); text.textContent = label(entry);
    const type = document.createElement('small'); type.textContent = 'SVG ↗'; caption.append(text, type);
    button.append(paper, caption); button.addEventListener('click', () => open(index, button));
    return button;
  }
  function resetColumns() {
    columnCount = Number(getComputedStyle(wall).getPropertyValue('--archive-columns')) || 4;
    columns = []; heights = Array(columnCount).fill(0); wall.replaceChildren();
    for (let i = 0; i < columnCount; i++) {
      const column = document.createElement('div'); column.className = 'archive-column';
      wall.append(column); columns.push(column);
    }
  }
  function appendTile(entry, index) {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].append(makeTile(entry, index));
    heights[shortest] += (entry.height || 1200) / (entry.width || 1000) + .38;
  }
  function showMore() {
    const end = visible.length;
    for (let i = shown; i < end; i++) appendTile(visible[i], i);
    shown = end; updateCount();
  }
  function render() {
    visible = entries.filter(entry => active === 'all' || entry.category === active);
    shown = 0; resetColumns(); showMore(); updateCopy();
  }
  function showArtwork(index) {
    if (index < 0 || index >= visible.length) return;
    current = index; const entry = visible[current];
    title.textContent = label(entry); image.src = entry.src; image.alt = label(entry);
    image.width = Math.round(entry.width); image.height = Math.round(entry.height);
    download.href = entry.src; download.download = entry.filename || `${entry.id}.svg`;
    position.textContent = `${current + 1} / ${visible.length}`;
    prev.disabled = current === 0; next.disabled = current === visible.length - 1;
    viewer.scrollTop = 0;
  }
  function open(index, trigger) {
    opener = trigger; showArtwork(index); viewer.showModal(); close.focus({preventScroll:true});
  }
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => { current = -1; opener?.focus({preventScroll:true}); });
  prev.addEventListener('click', () => showArtwork(current - 1));
  next.addEventListener('click', () => showArtwork(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); showArtwork(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]'); if (!button) return;
    active = button.dataset.category; render();
    filters.querySelector(`[data-category="${active}"]`)?.focus({preventScroll:true});
  });
  more.addEventListener('click', showMore);
  new ResizeObserver(() => {
    if (!entries.length) return;
    const size = Number(getComputedStyle(wall).getPropertyValue('--archive-columns')) || 4;
    if (size !== columnCount) { resetColumns(); visible.slice(0, shown).forEach(appendTile); }
  }).observe(wall);
  addEventListener('portfolio:language', () => {
    if (!entries.length) return;
    const scroll = scrollY; updateCopy(); resetColumns(); visible.slice(0, shown).forEach(appendTile);
    if (viewer.open) showArtwork(current); else scrollTo({top:scroll,behavior:'instant'});
  });
  fetch('../assets/works/design-skills/catalog.json').then(response => {
    if (!response.ok) throw new Error('Archive unavailable'); return response.json();
  }).then(data => {
    entries = data.gallery; render();
    // Reserve every tile from the outset; only nearby SVG images are fetched.
    if ('IntersectionObserver' in window) new IntersectionObserver(rows => {
      if (rows.some(row => row.isIntersecting) && shown < visible.length) showMore();
    }, {rootMargin:'600px'}).observe(sentinel);
  }).catch(() => {
    status.replaceChildren(document.createTextNode(tr('档案暂时未载入，请刷新重试。', 'The archive could not load. Please refresh.')));
    sentinel.hidden = true;
  });
})();
