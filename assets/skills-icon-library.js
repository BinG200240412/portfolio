/* Geometry-normalised SVG previews; downloads keep the source SVG bytes. */
(() => {
  'use strict';
  const host = document.getElementById('icon-library');
  if (!host) return;
  host.dataset.i18nIgnore = '';
  host.dataset.state = 'loading';

  const words = {
    zh: {
      loading: '正在读取 SVG 图标库…', failed: '图标库暂时无法读取。请刷新页面重试。',
      empty: '还没有可供展示的 SVG。', library: '取用图标', original: 'SVG / 保留原始路径 · #41403D',
      all: '全部', found: n => `${n} 枚图标`, selected: n => `已选 ${n} 枚`,
      select: name => `选择${name}`, open: name => `放大查看${name}`,
      selectAll: '选择当前分类', clear: '清空选择', download: '下载所选 SVG', downloadZip: '打包下载 ZIP',
      preparing: '正在打包…', prepared: n => `已打包 ${n} 枚 SVG。`,
      saved: '已准备下载 SVG。', downloadError: '下载失败，请稍后重试。',
      pause: '暂停动态', play: '播放动态', reduced: '静态展示', movement: '动态图标展示',
      close: '关闭预览', single: '下载 SVG', add: '加入选择', remove: '取消选择',
      format: '格式', dimensions: '尺寸', size: '文件大小', filters: '按分类筛选图标',
      filename: '文件', noResults: '这个分类暂时没有图标。',
    },
    en: {
      loading: 'Loading the SVG library…', failed: 'The icon library could not be loaded. Please refresh and try again.',
      empty: 'There are no SVGs to display yet.', library: 'Pick your icons', original: 'SVG / original paths preserved · #41403D',
      all: 'All', found: n => `${n} icons`, selected: n => `${n} selected`,
      select: name => `Select ${name}`, open: name => `Preview ${name}`,
      selectAll: 'Select this category', clear: 'Clear selection', download: 'Download selected SVG', downloadZip: 'Download selection ZIP',
      preparing: 'Preparing ZIP…', prepared: n => `${n} SVGs ready to download.`,
      saved: 'SVG ready to download.', downloadError: 'Download failed. Please try again.',
      pause: 'Pause motion', play: 'Play motion', reduced: 'Static display', movement: 'Animated icon showcase',
      close: 'Close preview', single: 'Download SVG', add: 'Add to selection', remove: 'Remove selection',
      format: 'Format', dimensions: 'Dimensions', size: 'File size', filters: 'Filter icons by category',
      filename: 'File', noResults: 'There are no icons in this category.',
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
  let icons = [], categories = [], activeCategory = '', selected = new Set();
  let openIcon = null, opener = null, busy = false, statusKey = '', statusCount = 0;
  const artworkCache = new Map();
  let userPaused = false, inView = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nameOf = icon => language === 'en' ? icon.titleEn || icon.title || icon.id : icon.title || icon.id;
  const categoryOf = icon => language === 'en' ? icon.categoryEn || icon.category || 'Icons' : icon.category || '图标';
  const visibleIcons = () => activeCategory ? icons.filter(icon => icon.category === activeCategory) : icons;
  const fileName = icon => {
    if (icon.filename) return icon.filename.replace(/[\\/:*?"<>|]/g, '-');
    try { return decodeURIComponent(new URL(icon.src, document.baseURI).pathname.split('/').pop()).replace(/[\\/:*?"<>|]/g, '-') || `${icon.id}.svg`; }
    catch (_) { return `${icon.id}.svg`; }
  };
  const bytesLabel = bytes => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;

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
  const selectionBar = el('div', 'il-selection-bar');
  const selectionSummary = el('span', 'il-selection-summary');
  selectionSummary.setAttribute('aria-live', 'polite');
  selectionSummary.setAttribute('aria-atomic', 'true');
  const selectionActions = el('div', 'il-selection-actions');
  const selectAll = button('il-text-button', () => {
    visibleIcons().forEach(icon => selected.add(icon.id));
    updateSelection();
  });
  const clear = button('il-text-button', () => { selected.clear(); updateSelection(); });
  const download = button('il-button il-download', downloadSelected);
  selectionActions.append(selectAll, clear, download);
  selectionBar.append(selectionSummary, selectionActions);
  const status = el('p', 'il-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

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
  const detailButtons = el('div', 'il-detail-buttons');
  const detailSelect = button('il-button', () => {
    if (!openIcon) return;
    toggle(openIcon.id);
  });
  const detailDownload = button('il-button il-download', () => openIcon && downloadOne(openIcon));
  const detailStatus = el('p', 'il-status');
  detailStatus.setAttribute('role', 'status');
  detailButtons.append(detailSelect, detailDownload);
  detail.append(detailCategory, detailTitle, detailFacts, detailButtons, detailStatus);
  dialogContent.append(close, preview, detail);
  dialog.append(dialogContent);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    openIcon = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else host.querySelector('.il-card-open')?.focus({ preventScroll: true });
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
        updateSelection();
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
      const label = el('label', 'il-checkbox-label');
      const checkbox = el('input', 'il-checkbox');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(icon.id);
      checkbox.setAttribute('aria-label', w('select', nameOf(icon)));
      checkbox.addEventListener('change', () => toggle(icon.id));
      label.append(checkbox, el('span', 'il-check-mark'));
      card.append(open, label);
      grid.append(card);
    });
    updateSelection();
  }

  function toggle(id) {
    selected.has(id) ? selected.delete(id) : selected.add(id);
    updateSelection();
  }

  function updateSelection() {
    host.dataset.selectedCount = String(selected.size);
    selectionSummary.textContent = w('selected', selected.size);
    clear.disabled = !selected.size;
    selectAll.disabled = visibleIcons().every(icon => selected.has(icon.id));
    download.disabled = busy || !selected.size;
    download.textContent = busy ? w('preparing') : w(selected.size > 1 ? 'downloadZip' : 'download');
    grid.querySelectorAll('.il-card').forEach(card => {
      const isSelected = selected.has(card.dataset.iconId);
      card.classList.toggle('il-selected', isSelected);
      card.querySelector('input').checked = isSelected;
    });
    if (openIcon) {
      detailSelect.textContent = selected.has(openIcon.id) ? w('remove') : w('add');
      detailSelect.setAttribute('aria-pressed', String(selected.has(openIcon.id)));
      detailDownload.disabled = busy;
    }
  }

  function openDetails(icon, source) {
    openIcon = icon;
    opener = source;
    detailStatus.textContent = '';
    renderDetails();
    dialog.showModal();
  }

  function renderDetails() {
    if (!openIcon) return;
    const icon = openIcon;
    preview.replaceChildren(displayArtwork(icon));
    detailCategory.textContent = categoryOf(icon);
    detailTitle.textContent = nameOf(icon);
    detailFacts.replaceChildren();
    const facts = [['format', 'SVG'], ['dimensions', icon.width && icon.height ? `${icon.width} × ${icon.height}` : '—'], ['size', Number.isFinite(icon.bytes) ? bytesLabel(icon.bytes) : '—'], ['filename', fileName(icon)]];
    facts.forEach(([key, value]) => { detailFacts.append(el('dt', '', w(key)), el('dd', '', value)); });
    detailDownload.textContent = w('single');
    updateSelection();
  }

  function updateMotion() {
    host.classList.toggle('il-animation-paused', userPaused || reducedMotion.matches || !inView || document.hidden);
    motionButton.disabled = reducedMotion.matches;
    motionButton.textContent = reducedMotion.matches ? w('reduced') : userPaused ? w('play') : w('pause');
    motionButton.setAttribute('aria-pressed', String(userPaused || reducedMotion.matches));
  }

  function localize() {
    heading.textContent = w('library');
    subheading.textContent = w('original');
    filters.setAttribute('aria-label', w('filters'));
    motionLabel.textContent = w('movement');
    selectAll.textContent = w('selectAll');
    clear.textContent = w('clear');
    close.setAttribute('aria-label', w('close'));
    renderFilters();
    renderGrid();
    renderDetails();
    updateMotion();
    updateStatus();
  }

  function updateStatus() {
    const message = statusKey ? w(statusKey, statusCount) : '';
    status.textContent = message;
    detailStatus.textContent = message;
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = el('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    host.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function originalBytes(icon) {
    const response = await fetch(icon.downloadSrc || icon.src);
    if (!response.ok) throw new Error(`SVG ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async function downloadOne(icon) {
    if (busy) return;
    busy = true;
    updateSelection();
    try {
      const bytes = await originalBytes(icon);
      saveBlob(new Blob([bytes], { type: 'image/svg+xml' }), fileName(icon));
      statusKey = 'saved';
    } catch (_) { statusKey = 'downloadError'; }
    finally { busy = false; updateSelection(); updateStatus(); }
  }
  async function downloadSelected() {
    if (busy || !selected.size) return;
    const chosen = icons.filter(icon => selected.has(icon.id));
    if (chosen.length === 1) { await downloadOne(chosen[0]); return; }
    busy = true;
    statusKey = 'preparing';
    updateSelection();
    updateStatus();
    try {
      const usedNames = new Set();
      const files = await Promise.all(chosen.map(async icon => {
        let name = fileName(icon);
        if (usedNames.has(name)) name = `${icon.id}-${name}`;
        usedNames.add(name);
        return { name, bytes: await originalBytes(icon) };
      }));
      saveBlob(makeZip(files), `BinG-icons-${files.length}.zip`);
      statusKey = 'prepared';
      statusCount = files.length;
    } catch (_) { statusKey = 'downloadError'; }
    finally { busy = false; updateSelection(); updateStatus(); }
  }

  // ZIP method 0: the downloaded SVG byte streams are stored unchanged.
  function makeZip(files) {
    const encoder = new TextEncoder();
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let value = n;
      for (let k = 0; k < 8; k++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      table[n] = value >>> 0;
    }
    const crc32 = bytes => {
      let crc = 0xffffffff;
      for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };
    const parts = [], directory = [];
    let offset = 0, directorySize = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach(file => {
      const name = encoder.encode(file.name);
      const checksum = crc32(file.bytes);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true);
      lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, checksum, true);
      lv.setUint32(18, file.bytes.length, true); lv.setUint32(22, file.bytes.length, true); lv.setUint16(26, name.length, true);
      local.set(name, 30);
      parts.push(local, file.bytes);
      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true);
      cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, checksum, true);
      cv.setUint32(20, file.bytes.length, true); cv.setUint32(24, file.bytes.length, true); cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true); central.set(name, 46);
      directory.push(central);
      directorySize += central.length;
      offset += local.length + file.bytes.length;
    });
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end], { type: 'application/zip' });
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
      libraryContent.append(tools, selectionBar, status, grid);
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
