/* One real screenshot at a time. Source labels stay on the tabs in Chinese;
 * only the visible labels and the lightbox trigger are translated. */
(() => {
  'use strict';

  function init() {
    const gallery = document.getElementById('sudoku-gallery');
    const opener = document.getElementById('sudoku-active-open');
    const image = document.getElementById('sudoku-active-image');
    const caption = document.getElementById('sudoku-active-caption');
    if (!gallery || !opener || !image || !caption) return;

    gallery.setAttribute('data-i18n-ignore', '');
    const items = [...gallery.querySelectorAll('button.sudoku-screen-tab[data-screen]')]
      .filter(button => button.dataset.image)
      .map(button => ({
        button, id: button.dataset.screen, src: button.dataset.image,
        caption: button.dataset.caption || button.textContent.trim(),
        alt: button.dataset.alt || button.dataset.caption || button.textContent.trim(),
      }));
    if (!items.length) return;

    let status = gallery.querySelector('#sudoku-gallery-status');
    if (!status) {
      status = document.createElement('p');
      status.id = 'sudoku-gallery-status';
      status.className = 'sudoku-gallery-status';
      gallery.append(status);
    }
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const t = source => window.PortfolioI18n?.t(source) ?? source;
    const url = source => new URL(source, document.baseURI).href;
    const copy = ['#product-heading', '.sudoku-gallery-copy > p']
      .map(selector => gallery.querySelector(selector))
      .filter(Boolean)
      .map(element => ({ element, source: element.textContent.trim() }));
    const group = gallery.querySelector('.sudoku-screen-tabs');
    const groupLabel = group?.getAttribute('aria-label');
    let current = items.find(item => item.id === 'board') || items[0];
    let requested = null, generation = 0, failedCurrent = false, hasError = false;

    function setError(value) {
      hasError = value;
      status.hidden = !value;
      status.textContent = value
        ? (window.PortfolioI18n?.language === 'en'
          ? 'The image could not be loaded. Select a screen to try again.'
          : '图片未能加载，请选择页面标签重试。')
        : '';
    }

    function metadata() {
      const english = window.PortfolioI18n?.language === 'en';
      document.querySelectorAll('.sudoku-actions [data-label-zh]').forEach(label => {
        label.textContent = english ? label.dataset.labelEn : label.dataset.labelZh;
      });
      document.querySelector('.sudoku-actions')?.setAttribute('aria-label', english ? 'Product links' : '产品链接');
      copy.forEach(({ element, source }) => { element.textContent = t(source); });
      if (groupLabel) group.setAttribute('aria-label', t(groupLabel));
      items.forEach(item => {
        item.button.setAttribute('aria-pressed', String(item === current));
        const label = item.button.querySelector('[data-screen-label]') || item.button;
        label.textContent = t(item.caption);
      });
      opener.dataset.image = current.src;
      opener.dataset.caption = t(current.caption);
      opener.setAttribute('aria-label', t(`放大查看${current.caption}截图`));
      image.alt = t(current.alt);
      image.width = 1320;
      image.height = 2868;
      caption.textContent = t(current.caption);
      if (hasError) setError(true);
    }

    function settled() {
      requested = null;
      gallery.setAttribute('aria-busy', 'false');
      opener.classList.remove('is-switching');
    }

    function preload(src) {
      return new Promise((resolve, reject) => {
        const next = new Image();
        next.decoding = 'async';
        next.onload = async () => {
          try {
            if (typeof next.decode === 'function') await next.decode();
            if (!next.naturalWidth) throw new Error('Empty image');
            resolve();
          } catch (error) { reject(error); }
        };
        next.onerror = () => reject(new Error('Image load failed'));
        next.src = src;
      });
    }

    async function select(item) {
      if (item === requested) return;
      const token = ++generation;
      settled();
      setError(false);
      // Clicking the displayed image also cancels a different pending choice.
      if (item === current && !failedCurrent && url(image.getAttribute('src')) === url(item.src)) return;
      requested = item;
      gallery.setAttribute('aria-busy', 'true');
      try {
        await preload(item.src);
        if (token !== generation) return;
        if (!reduced.matches) {
          opener.classList.add('is-switching');
          await new Promise(resolve => setTimeout(resolve, 150));
          if (token !== generation) return;
        }
        current = item;
        failedCurrent = false;
        if (url(image.getAttribute('src')) !== url(item.src)) image.src = item.src;
        metadata();
        settled();
      } catch (_) {
        if (token !== generation) return;
        settled();
        setError(true); // The last successfully displayed image stays in place.
      }
    }

    items.forEach(item => item.button.addEventListener('click', () => select(item)));
    image.addEventListener('error', () => { failedCurrent = true; setError(true); });
    addEventListener('portfolio:language', metadata);
    addEventListener('pagehide', () => { generation++; settled(); });
    metadata();
    if (url(image.getAttribute('src')) !== url(current.src)) select(current);
    else if (image.complete && !image.naturalWidth) { failedCurrent = true; setError(true); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
