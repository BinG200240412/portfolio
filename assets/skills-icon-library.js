/* Geometry-normalised previews preserve the source SVG paths. */
(() => {
  'use strict';
  const host = document.getElementById('icon-library');
  if (!host) return;
  host.dataset.i18nIgnore = '';
  host.dataset.state = 'loading';
  host.dataset.mode = 'preview';

  const words = {
    zh: {
      loading: '正在读取 SVG 图标库…', failed: '图标库暂时无法读取。请刷新页面重试。',
      empty: '还没有可供展示的 SVG。', library: '图标预览', original: 'SVG / 保留原始路径 · #41403D',
      all: '全部', found: n => `${n} 枚图标`, open: name => `放大查看${name}`,
      pause: '暂停动态', play: '播放动态', reduced: '静态展示', movement: '动态图标展示',
      close: '关闭预览', format: '格式', dimensions: '尺寸', filters: '按分类筛选图标',
      noResults: '这个分类暂时没有图标。',
    },
    en: {
      loading: 'Loading the SVG library…', failed: 'The icon library could not be loaded. Please refresh and try again.',
      empty: 'There are no SVGs to display yet.', library: 'Icon preview', original: 'SVG / original paths preserved · #41403D',
      all: 'All', found: n => `${n} icons`, open: name => `Preview ${name}`,
      pause: 'Pause motion', play: 'Play motion', reduced: 'Static display', movement: 'Animated icon showcase',
      close: 'Close preview', format: 'Format', dimensions: 'Dimensions', filters: 'Filter icons by category',
      noResults: 'There are no icons in this category.',
    },
  };
  let language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh';
  const w = (key, ...args) => typeof words[language][key] === 'function' ? words[language][key](...args) : words[language][key];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (className, handler) => {
    const node = el('button', className);
    node.type = 'button';
    if (handler) node.addEventListener('click', handler);
    return node;
  };
  const loading = el('p', 'il-message', w('loading'));
  loading.setAttribute('role', 'status');
  host.append(loading);
  let icons = [], categories = [], activeCategory = '';
  let openIcon = null, opener = null;
  const artworkCache = new Map();
  let userPaused = false, inView = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nameOf = icon => language === 'en' ? icon.titleEn || icon.title || icon.id : icon.title || icon.id;
  const categoryOf = icon => language === 'en' ? icon.categoryEn || icon.category || 'Icons' : icon.category || '图标';
  const visibleIcons = () => activeCategory ? icons.filter(icon => icon.category === activeCategory) : icons;

  const showcase = el('div', 'il-showcase');
  const showcaseHeader = el('div', 'il-showcase-header page-width');
  const motionLabel = el('span', 'il-overline');
  const motionButton = button('il-text-button il-motion-button', () => { userPaused = !userPaused; updateMotion(); });
  showcaseHeader.append(motionLabel, motionButton);
  showcase.append(showcaseHeader);
  const ribbons = el('div', 'il-ribbons');
  ribbons.setAttribute('aria-hidden', 'true');
  showcase.append(ribbons);

  const tools = el('div', 'il-tools');
  const headingRow = el('div', 'il-heading-row');
  const heading = el('h3', 'il-heading');
  const total = el('span', 'il-total');
  headingRow.append(heading, total);
  const subheading = el('p', 'il-subheading');
  const filters = el('div', 'il-filters');
  filters.setAttribute('role', 'group');
  tools.append(headingRow, subheading, filters);

  const grid = el('div', 'il-grid');

  const dialog = el('dialog', 'il-dialog');
  dialog.setAttribute('aria-labelledby', 'il-detail-title');
  const dialogContent = el('div', 'il-dialog-content');
  const close = button('il-dialog-close', () => dialog.close());
  close.setAttribute('autofocus', '');
  close.textContent = '×';
  const preview = el('div', 'il-detail-preview');
  const detail = el('div', 'il-detail');
  const detailCategory = el('p', 'il-overline');
  const detailTitle = el('h3', 'il-detail-title');
  detailTitle.id = 'il-detail-title';
  const detailFacts = el('dl', 'il-detail-facts');
  detail.append(detailCategory, detailTitle, detailFacts);
  dialogContent.append(close, preview, detail);
  dialog.append(dialogContent);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    openIcon = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else host.querySelector('.il-card-open')?.focus({ preventScroll: true });
    updateMotion();
  });

  async function prepareArtwork(icon, stage) {
    const response = await fetch(icon.src);
    if (!response.ok) throw new Error(`SVG ${response.status}`);
    const parsed = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    const source = parsed.documentElement;
    if (source.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Invalid SVG');
    const svg = document.importNode(source, true);
    // The audited set contains SVG roots and filled paths. Keep every original
    // path, fill rule and transform; only the preview ink inherits the theme.
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.classList.add('il-artwork');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.dataset.iconId = icon.id;
    svg.dataset.sourceViewbox = source.getAttribute('viewBox') || '';
    svg.querySelectorAll('[fill]').forEach(shape => {
      if (!['none', 'transparent'].includes(shape.getAttribute('fill').toLowerCase())) shape.setAttribute('fill', 'currentColor');
    });
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    while (svg.firstChild) group.append(svg.firstChild);
    svg.append(group);
    stage.append(svg);
    // The parent group's box includes each path's existing transform. Source
    // canvas margins no longer determine how large the visible icon appears.
    const bounds = group.getBBox();
    const longest = Math.max(bounds.width, bounds.height);
    if (!(longest > 0) || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) throw new Error('Empty SVG');
    const side = longest / .75;
    const viewBox = [bounds.x + bounds.width / 2 - side / 2, bounds.y + bounds.height / 2 - side / 2, side, side];
    svg.setAttribute('viewBox', viewBox.map(value => Number(value.toFixed(6))).join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.dataset.inkBounds = [bounds.x, bounds.y, bounds.width, bounds.height].map(value => Number(value.toFixed(6))).join(' ');
    svg.dataset.normalized = 'true';
    svg.remove();
    artworkCache.set(icon.id, svg);
  }

  const displayArtwork = icon => artworkCache.get(icon.id).cloneNode(true);

  function renderRibbons() {
    const rows = [icons.filter((_, i) => i % 2 === 0), icons.filter((_, i) => i % 2 === 1)];
    // Each loop half must cover the viewport, including on wide monitors.
    // The 64px cell width is a conservative minimum; gaps add more coverage.
    const copies = rows.map(row => Math.max(1, Math.ceil(document.documentElement.clientWidth / Math.max(64, row.length * 64))));
    const layout = copies.join(':');
    if (ribbons.dataset.layout === layout) return;
    ribbons.dataset.layout = layout;
    ribbons.replaceChildren();
    rows.forEach((row, index) => {
      if (!row.length) return;
      const ribbon = el('div', 'il-ribbon');
      const track = el('div', `il-ribbon-track${index ? ' il-ribbon-track-reverse' : ''}`);
      track.style.setProperty('--il-duration', `${Math.max(32, row.length * copies[index] * 4)}s`);
      for (let repeat = 0; repeat < 2; repeat++) {
        const group = el('div', 'il-ribbon-group');
        Array.from({ length: copies[index] }, () => row).flat().forEach((icon, i) => {
          const cell = el('span', 'il-ribbon-cell');
          const artwork = displayArtwork(icon);
          artwork.style.setProperty('--il-drift-delay', `${-(i % 7)}s`);
          cell.append(artwork);
          group.append(cell);
        });
        track.append(group);
      }
      ribbon.append(track);
      ribbons.append(ribbon);
    });
  }

  function renderFilters() {
    filters.replaceChildren();
    const makeFilter = (key, label, count) => {
      const item = button('il-filter', () => {
        activeCategory = key;
        renderFilters();
        renderGrid();
        // Keep keyboard position after the filter buttons are rebuilt.
        [...filters.children].find(child => child.dataset.category === key)?.focus({ preventScroll: true });
      });
      item.dataset.category = key;
      item.setAttribute('aria-pressed', String(activeCategory === key));
      item.append(el('span', '', label), el('span', 'il-filter-count', String(count)));
      filters.append(item);
    };
    makeFilter('', w('all'), icons.length);
    categories.forEach(category => {
      const items = icons.filter(icon => icon.category === category);
      makeFilter(category, categoryOf(items[0]), items.length);
    });
  }

  function renderGrid() {
    grid.replaceChildren();
    const visible = visibleIcons();
    total.textContent = w('found', visible.length);
    if (!visible.length) { grid.append(el('p', 'il-message', w('noResults'))); return; }
    visible.forEach(icon => {
      const card = el('article', 'il-card');
      card.dataset.iconId = icon.id;
      const open = button('il-card-open', () => openDetails(icon, open));
      open.setAttribute('aria-label', w('open', nameOf(icon)));
      const picture = el('span', 'il-card-picture');
      picture.append(displayArtwork(icon));
      const title = el('span', 'il-card-title', nameOf(icon));
      open.append(picture, title);
      card.append(open);
      grid.append(card);
    });
  }

  function openDetails(icon, source) {
    openIcon = icon;
    opener = source;
    renderDetails();
    dialog.showModal();
    updateMotion();
  }

  function renderDetails() {
    if (!openIcon) return;
    const icon = openIcon;
    preview.replaceChildren(displayArtwork(icon));
    detailCategory.textContent = categoryOf(icon);
    detailTitle.textContent = nameOf(icon);
    detailFacts.replaceChildren();
    const facts = [['format', 'SVG'], ['dimensions', icon.width && icon.height ? `${icon.width} × ${icon.height}` : '—']];
    facts.forEach(([key, value]) => { detailFacts.append(el('dt', '', w(key)), el('dd', '', value)); });
  }

  function updateMotion() {
    host.classList.toggle('il-animation-paused', userPaused || reducedMotion.matches || !inView || document.hidden || dialog.open);
    motionButton.disabled = reducedMotion.matches;
    motionButton.textContent = reducedMotion.matches ? w('reduced') : userPaused ? w('play') : w('pause');
    motionButton.setAttribute('aria-pressed', String(userPaused || reducedMotion.matches));
  }

  function localize() {
    heading.textContent = w('library');
    subheading.textContent = w('original');
    filters.setAttribute('aria-label', w('filters'));
    motionLabel.textContent = w('movement');
    close.setAttribute('aria-label', w('close'));
    renderFilters();
    renderGrid();
    renderDetails();
    updateMotion();
  }

  window.addEventListener('portfolio:language', event => {
    language = event.detail?.language === 'en' ? 'en' : 'zh';
    if (host.dataset.state === 'ready') localize();
    else loading.textContent = w(host.dataset.state === 'error' ? 'failed' : host.dataset.state === 'empty' ? 'empty' : 'loading');
  });
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);

  fetch(host.dataset.catalog || '../assets/works/design-skills/catalog.json')
    .then(response => { if (!response.ok) throw new Error(`Catalog ${response.status}`); return response.json(); })
    .then(async catalog => {
      const ids = new Set();
      icons = (catalog.icons || []).filter(icon => {
        if (!icon.id || !icon.src || ids.has(icon.id)) return false;
        ids.add(icon.id);
        return true;
      });
      if (!icons.length) { host.dataset.state = 'empty'; loading.textContent = w('empty'); return; }
      categories = [...new Set(icons.map(icon => icon.category || '图标'))];
      icons.forEach(icon => { if (!icon.category) icon.category = '图标'; });
      const stage = el('div', 'il-measure-stage');
      stage.setAttribute('aria-hidden', 'true');
      host.append(stage);
      try { await Promise.all(icons.map(icon => prepareArtwork(icon, stage))); }
      finally { stage.remove(); }
      renderRibbons();
      const libraryContent = el('div', 'il-library-content page-width');
      libraryContent.append(tools, grid);
      host.replaceChildren(showcase, libraryContent, dialog);
      if ('ResizeObserver' in window) new ResizeObserver(renderRibbons).observe(ribbons);
      else window.addEventListener('resize', renderRibbons);
      host.dataset.state = 'ready';
      host.dataset.count = String(icons.length);
      host.dataset.normalizedCount = String(artworkCache.size);
      localize();
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); updateMotion(); }, { rootMargin: '100px' });
        observer.observe(showcase);
      } else { inView = true; updateMotion(); }
    })
    .catch(() => { host.dataset.state = 'error'; loading.textContent = w('failed'); });
})();
