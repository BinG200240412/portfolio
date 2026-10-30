/* Geometry-normalised previews preserve the source SVG paths. */
/* Offscreen media starts near its section, after the first screen can render.
 * data-nearby-state records only initialization, not download completion. */
((target, scriptURL, initialize) => {
  'use strict';
  if (!target) return;
  target.dataset.nearbyState = 'waiting';
  let started = false, observer;
  function check() {
    if (started) return;
    const box = target.getBoundingClientRect();
    const viewport = window.innerHeight || 800;
    const lead = viewport * .8;
    const visible = box.top < viewport && box.bottom >= 0;
    const approaching = window.scrollY > 8 && box.top < viewport + lead && box.bottom > -lead;
    // A below-fold section may already lie inside the lookahead on first load.
    // Keep that work out of the opening; direct links already in view still run.
    if (!visible && !approaching) return;
    started = true;
    observer?.disconnect();
    ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => removeEventListener(type, check));
    target.dataset.nearbyState = 'started';
    initialize(scriptURL);
  }
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(check, {rootMargin: `${Math.round((window.innerHeight || 800) * .8)}px 0px`});
    observer.observe(target);
  }
  // Geometry checks also provide the fallback when IntersectionObserver is absent.
  ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => addEventListener(type, check, {passive: true}));
  check();
})(document.getElementById("icon-library"), document.currentScript?.src || document.baseURI, scriptURL => {

  'use strict';
  const host = document.getElementById('icon-library');
  if (!host) return;
  host.dataset.i18nIgnore = '';
  host.dataset.state = 'loading';
  host.dataset.mode = 'preview';

  const words = {
    zh: {
      loading: '正在读取 SVG 图标库…', failed: '图标库暂未载入。',
      empty: '还没有可供展示的 SVG。', library: '图标预览', original: 'SVG / 保留原始路径 · #41403D',
      all: '全部', found: n => `${n} 枚图标`, open: name => `放大查看${name}`,
      pause: '暂停动态', play: '播放动态', reduced: '静态展示', movement: '动态图标展示',
      close: '关闭预览', format: '格式', dimensions: '尺寸', filters: '按分类筛选图标',
      noResults: '这个分类暂时没有图标。', retry: '重试', partial: n => `${n} 枚暂未载入`,
    },
    en: {
      loading: 'Loading the SVG library…', failed: 'The icon catalog could not load.',
      empty: 'There are no SVGs to display yet.', library: 'Icon preview', original: 'SVG / original paths preserved · #41403D',
      all: 'All', found: n => `${n} icons`, open: name => `Preview ${name}`,
      pause: 'Pause motion', play: 'Play motion', reduced: 'Static display', movement: 'Animated icon showcase',
      close: 'Close preview', format: 'Format', dimensions: 'Dimensions', filters: 'Filter icons by category',
      noResults: 'There are no icons in this category.', retry: 'Retry', partial: n => `${n} icons unavailable`,
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
  let icons = [], candidates = [], categories = [], activeCategory = '';
  const cards = new Map(), filterButtons = new Map(), failures = new Map(), requests = new Map();
  let queue = [], catalogReady = false, catalogFailed = false, pageShown = true, uiMounted = false;
  let renderTimer = 0, lastRender = 0, nearHost = true, hostFrame = null;
  try { hostFrame = window.frameElement?.closest('#section') || null; } catch (_) {}
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

  async function prepareArtwork(icon, stage, signal) {
    const response = await fetch(icon.src, {signal, priority:'low'});
    if (!response.ok) throw new Error(`SVG ${response.status}`);
    const text = await response.text();
    if (signal.aborted || !host.isConnected) throw new DOMException('Aborted', 'AbortError');
    const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
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
    if (!stage.isConnected) host.append(stage);
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
    return svg;
  }

  const displayArtwork = icon => artworkCache.get(icon.id).cloneNode(true);

  function renderRibbons() {
    const rows = [icons.filter((_, i) => i % 2 === 0), icons.filter((_, i) => i % 2 === 1)];
    // Each loop half must cover the viewport, including on wide monitors.
    // The 64px cell width is a conservative minimum; gaps add more coverage.
    const copies = rows.map(row => Math.max(1, Math.ceil(document.documentElement.clientWidth / Math.max(64, row.length * 64))));
    const layout = icons.map(icon => icon.id).join(',') + '|' + copies.join(':');
    if (ribbons.dataset.layout === layout) return;
    ribbons.dataset.layout = layout;
    const phases = [...ribbons.querySelectorAll('.il-ribbon-track')].map(track => {
      const animation = track.getAnimations?.()[0];
      const duration = Number(animation?.effect?.getComputedTiming().duration);
      return duration > 0 ? Number(animation.currentTime || 0) % duration / duration : 0;
    });
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
      const animation = track.getAnimations?.()[0];
      const duration = Number(animation?.effect?.getComputedTiming().duration);
      if (animation && duration > 0) animation.currentTime = (phases[index] || 0) * duration;
    });
  }

  function renderFilters() {
    const definitions = [['', w('all'), icons.length], ...categories.map(category => {
      const matches = icons.filter(icon => icon.category === category);
      const source = candidates.find(icon => icon.category === category);
      return [category, categoryOf(source), matches.length];
    })];
    definitions.forEach(([key, label, count], index) => {
      let item = filterButtons.get(key);
      if (!item) {
        item = button('il-filter', () => {
          activeCategory = key; renderFilters(); renderGrid();
        });
        item.dataset.category = key;
        item.append(el('span'), el('span', 'il-filter-count'));
        filterButtons.set(key, item);
      }
      item.setAttribute('aria-pressed', String(activeCategory === key));
      if (item.firstChild.textContent !== label) item.firstChild.textContent = label;
      if (item.lastChild.textContent !== String(count)) item.lastChild.textContent = String(count);
      if (filters.children[index] !== item) filters.insertBefore(item, filters.children[index] || null);
    });
  }

  function renderGrid() {
    const visible = visibleIcons(), desired = new Set();
    total.textContent = w('found', visible.length);
    visible.forEach((icon, index) => {
      let card = cards.get(icon.id);
      if (!card) {
        card = el('article', 'il-card'); card.dataset.iconId = icon.id;
        const open = button('il-card-open', () => openDetails(icon, open));
        const picture = el('span', 'il-card-picture'); picture.append(displayArtwork(icon));
        open.append(picture, el('span', 'il-card-title')); card.append(open);
        cards.set(icon.id, card);
      }
      const open = card.querySelector('.il-card-open'), title = card.querySelector('.il-card-title');
      open.setAttribute('aria-label', w('open', nameOf(icon)));
      if (title.textContent !== nameOf(icon)) title.textContent = nameOf(icon);
      desired.add(card);
      if (grid.children[index] !== card) grid.insertBefore(card, grid.children[index] || null);
    });
    [...grid.children].forEach(child => { if (!desired.has(child)) child.remove(); });
    if (!visible.length && !queue.length && !requests.size) grid.append(el('p', 'il-message', w('noResults')));
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
    host.classList.toggle('il-animation-paused', userPaused || reducedMotion.matches || !inView || !pageShown || document.hidden || dialog.open || (hostFrame && !hostFrame.classList.contains('on')));
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

  const measureStage = el('div', 'il-measure-stage');
  measureStage.setAttribute('aria-hidden', 'true');
  const loadStatus = el('div', 'il-loading-status page-width');
  const retry = button('il-text-button', () => {
    if (catalogFailed) { catalogFailed = false; updateLoadStatus(); loadCatalog(); return; }
    for (const icon of failures.values()) if (!queue.some(item => item.id === icon.id) && !requests.has(icon.id)) queue.push(icon);
    failures.clear(); syncLoading();
  });
  loadStatus.append(loading, retry);
  host.append(loadStatus);

  function mayLoad() {
    return host.isConnected && pageShown && nearHost && !document.hidden &&
      (!hostFrame || hostFrame.classList.contains('on'));
  }
  function updateLoadStatus() {
    const pending = queue.length + requests.size;
    const failed = failures.size;
    host.dataset.count = String(icons.length);
    host.dataset.normalizedCount = String(artworkCache.size);
    host.dataset.pendingCount = String(pending);
    host.dataset.failedCount = String(failed);
    host.dataset.state = catalogFailed || (catalogReady && !pending && !icons.length && failed) ? 'error'
      : !catalogReady || pending ? 'loading' : failed ? 'partial' : icons.length ? 'ready' : 'empty';
    host.dataset.loadingState = (pending || !catalogReady) && !mayLoad() ? 'paused' : pending || !catalogReady ? 'loading' : failed || catalogFailed ? 'error' : 'ready';
    loading.textContent = catalogFailed ? w('failed') : failed ? w('partial', failed)
      : !catalogReady || pending ? w('loading') : !icons.length ? w('empty') : '';
    retry.textContent = w('retry');
    retry.hidden = !failed && !catalogFailed;
    loadStatus.hidden = host.dataset.state === 'ready';
  }
  function renderLoaded() {
    lastRender = performance.now();
    if (!host.isConnected) return;
    renderRibbons(); renderFilters(); renderGrid(); updateMotion(); updateLoadStatus();
  }
  function scheduleRender() {
    if (renderTimer || !host.isConnected) return;
    // Coalesce arrivals instead of rebuilding ribbons once for every response.
    renderTimer = setTimeout(() => { renderTimer = 0; renderLoaded(); }, Math.max(0, 120 - (performance.now() - lastRender)));
  }
  function pump() {
    if (!catalogReady || !mayLoad()) { updateLoadStatus(); return; }
    while (requests.size < 4 && queue.length) {
      const icon = queue.shift();
      if (artworkCache.has(icon.id) || requests.has(icon.id)) continue;
      const controller = new AbortController();
      let timedOut = false;
      const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
      requests.set(icon.id, controller);
      prepareArtwork(icon, measureStage, controller.signal).then(svg => {
        if (!host.isConnected) return;
        if (controller.signal.aborted) {
          if (!queue.some(item => item.id === icon.id)) queue.unshift(icon);
          return;
        }
        artworkCache.set(icon.id, svg);
        if (!icons.some(item => item.id === icon.id)) icons.push(icon);
        icons.sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b));
        failures.delete(icon.id);
      }).catch(error => {
        if (controller.signal.aborted && !timedOut) {
          if (host.isConnected && !artworkCache.has(icon.id) && !queue.some(item => item.id === icon.id)) queue.unshift(icon);
        } else if (host.isConnected) failures.set(icon.id, icon);
      }).finally(() => {
        clearTimeout(deadline);
        if (requests.get(icon.id) === controller) requests.delete(icon.id);
        scheduleRender(); pump();
        if (!queue.length && !requests.size) measureStage.remove();
      });
    }
    updateLoadStatus();
  }
  function syncLoading() {
    if (!mayLoad()) {
      catalogRequest?.abort(); requests.forEach(controller => controller.abort());
      clearTimeout(renderTimer); renderTimer = 0;
    } else { pump(); if (uiMounted) scheduleRender(); }
    updateLoadStatus(); updateMotion();
  }
  function mount() {
    if (uiMounted) return;
    uiMounted = true;
    const libraryContent = el('div', 'il-library-content page-width');
    libraryContent.append(tools, grid);
    host.replaceChildren(showcase, libraryContent, dialog, loadStatus);
    localize(); updateLoadStatus();
    if ('ResizeObserver' in window) new ResizeObserver(renderRibbons).observe(ribbons);
    else window.addEventListener('resize', renderRibbons);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); updateMotion(); }, {rootMargin:'100px'}).observe(showcase);
      new IntersectionObserver(entries => { nearHost = entries.some(entry => entry.isIntersecting); syncLoading(); }, {rootMargin:'250px'}).observe(host);
    } else { inView = true; updateMotion(); }
  }
  let catalogRequest = null;
  async function loadCatalog() {
    if (catalogRequest || !mayLoad()) return;
    const controller = new AbortController(); catalogRequest = controller;
    let timedOut = false;
    const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
    try {
      const response = await fetch(host.dataset.catalog || '../assets/works/design-skills/catalog.json', {signal:controller.signal});
      if (!response.ok) throw new Error(`Catalog ${response.status}`);
      const catalog = await response.json();
      if (!host.isConnected || controller.signal.aborted) return;
      const ids = new Set();
      candidates = (catalog.icons || []).filter(icon => {
        if (!icon.id || !icon.src || ids.has(icon.id)) return false;
        ids.add(icon.id); return true;
      });
      candidates.forEach(icon => { if (!icon.category) icon.category = '图标'; });
      categories = [...new Set(candidates.map(icon => icon.category))];
      catalogReady = true; catalogFailed = false; queue = candidates.slice();
      mount(); pump();
    } catch (error) {
      if (host.isConnected && (!controller.signal.aborted || timedOut)) { catalogFailed = true; mount(); updateLoadStatus(); }
    } finally {
      clearTimeout(deadline); if (catalogRequest === controller) catalogRequest = null;
      if (!catalogReady && !catalogFailed && mayLoad()) queueMicrotask(loadCatalog);
    }
  }
  window.addEventListener('portfolio:language', event => {
    language = event.detail?.language === 'en' ? 'en' : 'zh';
    if (uiMounted) { localize(); updateLoadStatus(); }
    else loading.textContent = w('loading');
  });
  document.addEventListener('visibilitychange', () => { syncLoading(); if (!catalogReady && !catalogFailed) loadCatalog(); });
  reducedMotion.addEventListener('change', updateMotion);
  addEventListener('pagehide', () => { pageShown = false; catalogRequest?.abort(); syncLoading(); });
  addEventListener('pageshow', () => { pageShown = true; syncLoading(); if (!catalogReady && !catalogFailed) loadCatalog(); });
  if (hostFrame) {
    const parentObserver=new MutationObserver(() => {
      syncLoading(); if (!catalogReady && !catalogFailed) loadCatalog();
    });
    parentObserver.observe(hostFrame,{attributes:true,attributeFilter:['class']});
    window.PortfolioLifecycle?.trackParent(parentObserver,hostFrame,{attributes:true,attributeFilter:['class']});
  }
  updateLoadStatus(); loadCatalog();
});
