/* Offscreen media starts near its section, after the first screen can render.
 * data-nearby-state records only initialization, not download completion. */
((target, scriptURL, initialize) => {
  'use strict';
  if (!target) return;
  target.dataset.nearbyState = 'waiting';
  let navigatedBeforeInit = false;
  ['wheel', 'touchstart', 'keydown'].forEach(type => addEventListener(type, () => { navigatedBeforeInit = true; }, {once: true, passive: true}));
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
    initialize(scriptURL, navigatedBeforeInit);
  }
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(check, {rootMargin: `${Math.round((window.innerHeight || 800) * .8)}px 0px`});
    observer.observe(target);
  }
  // Geometry checks also provide the fallback when IntersectionObserver is absent.
  ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => addEventListener(type, check, {passive: true}));
  check();
})(document.getElementById("visual-archive"), document.currentScript?.src || document.baseURI, (scriptURL, navigatedBeforeInit) => {

  'use strict';
  const root = document.getElementById('visual-archive');
  if (!root) return;
  const wall = document.getElementById('archive-wall');
  const filters = document.getElementById('archive-filters');
  const count = document.getElementById('archive-count');
  const status = document.getElementById('archive-status');
  const sentinel = document.getElementById('archive-sentinel');
  const more = document.getElementById('archive-more');
  const pause = document.getElementById('archive-pause');
  const viewer = document.getElementById('archive-viewer');
  const image = document.getElementById('archive-viewer-image');
  const title = document.getElementById('archive-viewer-title');
  const close = document.getElementById('archive-close');
  const prev = document.getElementById('archive-prev');
  const next = document.getElementById('archive-next');
  const position = document.getElementById('archive-position');
  const initialHash = location.hash;
  let userNavigated = navigatedBeforeInit;
  ['wheel', 'touchstart', 'keydown'].forEach(type => addEventListener(type, () => { userNavigated = true; }, {once:true, passive:true}));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let entries = [], visible = [], active = 'all', current = -1, opener;
  let columns = [], heights = [], columnCount = 0, wallWidth = 0, wallHeight = 0, wallGap = '';
  let paused = false, onScreen = false, layoutFrame = 0;
  // Load SVGs just before they enter the moving window, including the copy
  // across a loop seam. Tile dimensions never depend on image decoding.
  const nearbyImages = 'IntersectionObserver' in window ? new IntersectionObserver(rows => {
    rows.forEach(row => {
      if (!row.isIntersecting) return;
      const img = row.target;
      if (!img.src) img.src = img.dataset.src;
      nearbyImages.unobserve(img);
    });
  }, {root:wall, rootMargin:'400px 0px'}) : null;
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
    more.textContent = tr(`浏览全部 ${visible.length} 件作品 ↗`, `Browse all ${visible.length} works ↗`);
    close.setAttribute('aria-label', tr('关闭预览', 'Close preview'));
    prev.setAttribute('aria-label', tr('上一张', 'Previous artwork'));
    next.setAttribute('aria-label', tr('下一张', 'Next artwork'));
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
    sentinel.hidden = !visible.length;
    const stopped = paused || reducedMotion.matches;
    pause.textContent = reducedMotion.matches ? tr('动态已关闭', 'Motion off')
      : paused ? tr('继续滚动', 'Resume') : tr('暂停滚动', 'Pause');
    pause.disabled = reducedMotion.matches;
    pause.setAttribute('aria-pressed', String(stopped));
    status.textContent = stopped
      ? tr('滚动已暂停 · 点击作品可放大', 'Motion paused · Select a work to enlarge')
      : tr('各列缓慢循环', 'Slow, continuous columns');
  }
  function makeTile(entry, index) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'archive-tile'; button.dataset.id = entry.id;
    button.dataset.index = index;
    // The stationary browse button opens the complete keyboard-accessible
    // gallery; tabbing never moves focus to a tile outside the clipped window.
    button.tabIndex = -1;
    button.setAttribute('aria-label', tr(`放大查看：${entry.title}`, `View ${label(entry)}`));
    const paper = document.createElement('span'); paper.className = 'archive-paper';
    const img = document.createElement('img');
    img.dataset.src = entry.preview || entry.src; img.alt = label(entry); img.decoding = 'async';
    img.width = Math.round(entry.width || 1000); img.height = Math.round(entry.height || 1200);
    img.style.aspectRatio = `${entry.width || 1000} / ${entry.height || 1200}`;
    paper.append(img);
    const caption = document.createElement('span'); caption.className = 'tile-label';
    const text = document.createElement('span'); text.textContent = label(entry);
    const type = document.createElement('small'); type.textContent = 'SVG ↗'; caption.append(text, type);
    button.append(paper, caption);
    return button;
  }
  function syncMotion() {
    const canPlay = onScreen && !document.hidden && !paused && !reducedMotion.matches && !viewer.open;
    columns.forEach(column => {
      const focused = column.element.contains(document.activeElement);
      if (canPlay && !focused) column.animation?.play();
      else column.animation?.pause();
    });
  }
  function buildColumns() {
    columns.forEach(column => column.animation?.cancel());
    nearbyImages?.disconnect();
    columnCount = Math.min(visible.length, Number(getComputedStyle(wall).getPropertyValue('--archive-columns')) || 4);
    columns = []; heights = Array(columnCount).fill(0); wall.replaceChildren();
    wall.style.setProperty('--visible-columns', columnCount);
    for (let i = 0; i < columnCount; i++) {
      const column = document.createElement('div'); column.className = 'archive-column';
      const track = document.createElement('div'); track.className = 'archive-track';
      const sequence = document.createElement('div'); sequence.className = 'archive-sequence';
      track.append(sequence); column.append(track); wall.append(column);
      const state = {element:column, track, sequence, animation:null};
      columns.push(state);
    }
    visible.forEach((entry, index) => {
      const shortest = heights.indexOf(Math.min(...heights));
      columns[shortest].sequence.append(makeTile(entry, index));
      heights[shortest] += (entry.height || 1200) / (entry.width || 1000) + .38;
    });
    columns.forEach((column, index) => {
      const {sequence, track} = column;
      const originals = [...sequence.children];
      // Small categories also fill the entire window. Repeated artwork is
      // decorative, but remains clickable through the wall's delegated handler.
      while (sequence.getBoundingClientRect().height < wall.clientHeight + 80) {
        originals.forEach(tile => {
          const copy = tile.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); sequence.append(copy);
        });
      }
      const distance = sequence.getBoundingClientRect().height;
      const copy = sequence.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); track.append(copy);
      // Exactly one measured sequence per cycle: no jump or empty tail when
      // the two identical sequences exchange places.
      const duration = distance / (index % 2 ? 15 : 12) * 1000;
      const frames = [{transform:'translate3d(0,0,0)'}, {transform:`translate3d(0,${-distance}px,0)`}];
      column.animation = track.animate(index % 2 ? frames.slice().reverse() : frames, {duration, iterations:Infinity, easing:'linear'});
      column.animation.pause();
      column.animation.currentTime = duration * ((index * .173 + .037) % 1);
      track.querySelectorAll('img').forEach(img => {
        if (nearbyImages) nearbyImages.observe(img);
        else {img.src = img.dataset.src; img.loading = 'lazy';}
      });
    });
    wallWidth = wall.clientWidth; wallHeight = wall.clientHeight;
    wallGap = getComputedStyle(wall).columnGap;
    syncMotion();
  }
  function render() {
    visible = entries.filter(entry => active === 'all' || entry.category === active);
    buildColumns(); updateCopy();
  }
  function showArtwork(index) {
    if (index < 0 || index >= visible.length) return;
    current = index; const entry = visible[current];
    title.textContent = label(entry); image.src = entry.src; image.alt = label(entry);
    image.width = Math.round(entry.width); image.height = Math.round(entry.height);
    position.textContent = `${current + 1} / ${visible.length}`;
    prev.disabled = current === 0; next.disabled = current === visible.length - 1;
    viewer.scrollTop = 0;
  }
  function open(index, trigger) {
    opener = trigger.closest('.archive-tile') ? more : trigger;
    showArtwork(index); viewer.showModal(); syncMotion(); close.focus({preventScroll:true});
  }
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    current = -1;
    (opener?.isConnected ? opener : more).focus({preventScroll:true});
    syncMotion();
  });
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
  more.addEventListener('click', () => { if (visible.length) open(0, more); });
  wall.addEventListener('click', event => {
    const tile = event.target.closest('.archive-tile');
    if (tile) open(Number(tile.dataset.index), tile);
  });
  wall.addEventListener('focusin', syncMotion);
  wall.addEventListener('focusout', () => queueMicrotask(syncMotion));
  pause.addEventListener('click', () => { paused = !paused; updateCount(); syncMotion(); });
  reducedMotion.addEventListener('change', () => { updateCount(); syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  if ('IntersectionObserver' in window) new IntersectionObserver(rows => {
    onScreen = rows.some(row => row.isIntersecting); syncMotion();
  }).observe(wall);
  else onScreen = true;
  function scheduleLayout() {
    if (!entries.length) return;
    const style = getComputedStyle(wall);
    const targetColumns = Math.min(visible.length, Number(style.getPropertyValue('--archive-columns')) || 4);
    if (wall.clientWidth === wallWidth && wall.clientHeight === wallHeight
      && targetColumns === columnCount && style.columnGap === wallGap) return;
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(buildColumns);
  }
  new ResizeObserver(scheduleLayout).observe(wall);
  // At the maximum page width a breakpoint can change column count or gaps
  // without changing the wall's own dimensions.
  addEventListener('resize', scheduleLayout, {passive:true});
  addEventListener('portfolio:language', () => {
    if (!entries.length) return;
    const scroll = scrollY; updateCopy(); buildColumns();
    if (viewer.open) showArtwork(current); else scrollTo({top:scroll,behavior:'instant'});
  });
  const catalogURL = new URL('../assets/works/design-skills/catalog.json', document.baseURI);
  const catalogRevision = new URL(scriptURL).searchParams.get('v');
  if (catalogRevision) catalogURL.searchParams.set('v', catalogRevision);
  fetch(catalogURL).then(response => {
    if (!response.ok) throw new Error('Archive unavailable'); return response.json();
  }).then(data => {
    entries = data.gallery; render();
    // Finish the initial deep link after both the vector placeholders and type
    // metrics are ready. Do not pull back a visitor who has already moved on.
    document.fonts.ready.then(() => {
      buildColumns();
      if (!userNavigated && location.hash === initialHash && initialHash) {
        let target;
        try { target = document.getElementById(decodeURIComponent(initialHash.slice(1))); } catch (_) {}
        target?.scrollIntoView({block:'start', behavior:'instant'});
      }
    });
  }).catch(() => {
    status.replaceChildren(document.createTextNode(tr('档案暂时未载入，请刷新重试。', 'The archive could not load. Please refresh.')));
    sentinel.hidden = true;
  });
});
