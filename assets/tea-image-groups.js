/* Expand image windows. Neighbouring artwork keeps its measured size and is clipped. */
(() => {
  'use strict';
  const eligible = matchMedia('(hover:hover) and (pointer:fine) and (min-width:760px)');
  const selectors = [
    '.tea-research-map-layout', '.tea-site-photos', '.tea-object-research',
    '.tea-additional-objects', '.tea-sketch-gallery', '.tea-design-principles',
    '.tea-process-pair', '.tea-archive-pair', '.tea-character-gallery', '.tea-collection-side',
    '.tea-poster-gallery', '.tea-unlock-grid', '.tea-vector-gallery',
    '.tea-original-behaviors', '.tea-original-form-language',
    '.tea-original-display-units', '.tea-original-display-family',
    '.tea-original-values', '.tea-original-merchandise', '.tea-original-reward-path',
    '.tea-action-path', '.tea-feedback-originals', '.tea-board-grid', '.tea-step-grid'
  ];
  const records = [...document.querySelectorAll(selectors.join(','))].map(group => ({
    group, items: [...group.children], rows: [], cleanups: [], width: 0
  })).filter(record => record.items.length > 1 && record.items.every(item => item.querySelector('img')));
  let queued = false;

  function clear(record) {
    record.cleanups.forEach(cleanup => cleanup());
    record.cleanups = [];
    record.items.forEach(item => {
      item.classList.remove('tea-image-cell', 'is-image-active');
      item.style.removeProperty('--tea-copy-width');
      item.querySelectorAll('.tea-image-copy').forEach(copy => copy.classList.remove('tea-image-copy'));
      item.querySelectorAll('.tea-image-window').forEach(frame => frame.replaceWith(...frame.childNodes));
      item.querySelectorAll('.tea-image-paint').forEach(img => {
        img.classList.remove('tea-image-paint', 'tea-image-photo');
        ['--tea-paint-width', '--tea-paint-height', '--tea-natural-width'].forEach(prop => img.style.removeProperty(prop));
      });
      item.querySelectorAll('.tea-image-surface').forEach(surface => surface.classList.remove('tea-image-surface'));
      record.group.append(item);
    });
    record.rows.forEach(row => { if (row !== record.group) row.remove(); });
    record.rows = [];
    record.group.classList.remove('tea-image-group', 'tea-image-row', 'has-image-active');
    record.group.style.removeProperty('grid-template-columns');
    record.group.style.removeProperty('--tea-row-gap');
  }

  function makeRow(record, rowItems, measurements, gap, list) {
    if (rowItems.length < 2) return;
    const row = list ? record.group : document.createElement('div');
    row.classList.add('tea-image-row');
    row.style.setProperty('--tea-row-gap', gap);
    if (!list) {
      record.group.insertBefore(row, rowItems[0]);
      rowItems.forEach(item => row.append(item));
    }
    const weights = rowItems.map(item => measurements.get(item).width);
    const total = weights.reduce((sum, width) => sum + width, 0);
    if (record.flex) {
      row.style.maxWidth = `${total + (parseFloat(gap) || 0) * (rowItems.length - 1)}px`;
      row.style.marginInline = 'auto';
      row.style.width = '100%';
    }
    const base = weights.map(width => `${width / total}fr`).join(' ');
    row.style.gridTemplateColumns = base;
    record.rows.push(row);
    const frames = [];
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const reset = () => {
      frames.forEach(frame => { frame.style.width = '100%'; frame.style.left = '0px'; });
      row.classList.remove('has-image-active');
      rowItems.forEach(item => item.classList.remove('is-image-active'));
    };
    const activate = index => {
      if (document.querySelector('dialog[open]')) return;
      const count = rowItems.length;
      const share = 4 / (count + 3);
      const spacing = parseFloat(getComputedStyle(row).columnGap) || 0;
      const available = row.clientWidth - spacing * (count - 1);
      const origin = row.getBoundingClientRect().left;
      let position = 0;
      rowItems.forEach((item, i) => {
        const fraction = i === index ? share : (1 - share) * weights[i] / (total - weights[index]);
        const width = available * fraction;
        frames[i].style.left = `${position - (item.getBoundingClientRect().left - origin)}px`;
        frames[i].style.width = `${width}px`;
        position += width + spacing;
      });
      row.classList.add('has-image-active');
      rowItems.forEach((item, i) => item.classList.toggle('is-image-active', index === i));
    };
    rowItems.forEach((item, index) => {
      const measured = measurements.get(item);
      const img = item.querySelector('img');
      const surface = img.closest('button,a') || img;
      const frame = document.createElement('div');
      frame.className = 'tea-image-window';
      frame.style.height = `${measured.height}px`;
      frames.push(frame);
      surface.before(frame); frame.append(surface);
      item.classList.add('tea-image-cell');
      item.style.setProperty('--tea-copy-width', `${measured.width}px`);
      item.querySelectorAll('figcaption,.tea-object-note,.tea-merch-note,h3').forEach(copy => copy.classList.add('tea-image-copy'));
      surface.classList.add('tea-image-surface');
      img.classList.add('tea-image-paint');
      if (measured.imageWidth / measured.imageHeight >= 1.2 && !item.closest('.tea-cutout,.tea-character-gallery,.tea-unlock-grid,.tea-action-path,.tea-step-grid')) img.classList.add('tea-image-photo');
      img.style.setProperty('--tea-paint-width', `${measured.imageWidth}px`);
      img.style.setProperty('--tea-paint-height', `${measured.imageHeight}px`);
      img.style.setProperty('--tea-natural-width', `${img.naturalWidth || Number(img.getAttribute('width')) || measured.imageWidth}px`);
      frame.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') activate(index); }, options);
      item.addEventListener('focusin', event => { if (event.target.matches(':focus-visible')) activate(index); }, options);
    });
    row.addEventListener('pointerleave', () => {
      if (!row.contains(document.activeElement) || !document.activeElement.matches(':focus-visible')) reset();
    }, options);
    row.addEventListener('focusout', event => { if (!row.contains(event.relatedTarget)) reset(); }, options);
    row.addEventListener('keydown', event => {
      if (event.key === 'Escape') { reset(); return; }
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const index = rowItems.findIndex(item => item.contains(event.target));
      if (index < 0) return;
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + rowItems.length) % rowItems.length;
      const button = rowItems[next].querySelector('button,[role="button"],[tabindex]');
      if (button) { event.preventDefault(); button.focus({ preventScroll: true }); }
    }, options);
    document.addEventListener('click', () => { if (document.querySelector('dialog[open]')) reset(); }, options);
    record.cleanups.push(() => controller.abort());
  }

  function build(record) {
    clear(record);
    record.width = record.group.clientWidth;
    if (!eligible.matches) return;
    const style = getComputedStyle(record.group);
    record.flex = style.display === 'flex';
    const columns = style.gridTemplateColumns === 'none'
      ? record.items.length : style.gridTemplateColumns.split(/\s+/).length;
    if (columns < 2) return;
    const list = record.group.matches('ol,ul');
    // Lists remain valid, direct-child lists; responsive multirow lists use their native layout.
    if (list && columns < record.items.length) return;
    const measurements = new Map(record.items.map(item => {
      const image = item.querySelector('img');
      const surface = image.closest('button,a') || image;
      const rect = image.getBoundingClientRect();
      const naturalWidth = image.naturalWidth || Number(image.getAttribute('width'));
      const naturalHeight = image.naturalHeight || Number(image.getAttribute('height'));
      const imageWidth = rect.width || Math.min(naturalWidth, surface.getBoundingClientRect().width || item.clientWidth);
      const imageHeight = rect.height || imageWidth * naturalHeight / naturalWidth;
      return [item, { width: item.getBoundingClientRect().width, height: surface.getBoundingClientRect().height || imageHeight,
        imageWidth, imageHeight }];
    }));
    if ([...measurements.values()].some(value => !value.width || !value.height)) return;
    record.group.style.setProperty('--tea-row-gap', style.rowGap === 'normal' ? '30px' : style.rowGap);
    if (!list) record.group.classList.add('tea-image-group');
    for (let i = 0; i < record.items.length; i += columns) {
      makeRow(record, record.items.slice(i, i + columns), measurements,
        style.columnGap === 'normal' ? '24px' : style.columnGap, list);
    }
    record.width = record.group.clientWidth;
  }

  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; records.forEach(build); });
  }
  const resize = new ResizeObserver(entries => {
    if (entries.some(entry => {
      const record = records.find(value => value.group === entry.target);
      return record && Math.abs(record.width - entry.target.clientWidth) > 2;
    })) refresh();
  });
  // Reparenting a lazy image can postpone its native intersection check in WebKit.
  // Warm only nearby groups, retaining lazy loading for the rest of the case study.
  const warm = record => record.items.forEach(item => item.querySelectorAll('img').forEach(image => {
    if (!image.complete || !image.naturalWidth) image.loading = 'eager';
  }));
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const record = records.find(value => value.group === entry.target);
      if (record) warm(record);
      visibility.unobserve(entry.target);
    });
  }, { rootMargin: '1000px 0px' });
  document.fonts.ready.then(() => {
    records.forEach(build);
    records.forEach(record => {
      resize.observe(record.group);
      visibility.observe(record.group);
      const rect = record.group.getBoundingClientRect();
      if (rect.top < innerHeight + 1000 && rect.bottom > -1000) warm(record);
    });
  });
  eligible.addEventListener('change', refresh);
  addEventListener('resize', refresh, { passive: true });
  addEventListener('portfolio:language', refresh);
})();
