/* Source images are displayed in the case and its viewer, without file links. */
(() => {
  'use strict';
  // Align a direct chapter link after snap layout. Leave scrolling alone
  // as soon as the reader interacts with the page.
  const hash = location.hash;
  const target = hash ? document.getElementById(hash.slice(1))?.closest('.q-panel') : null;
  if (target?.matches('.q-panel')) {
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    let interacted = false;
    const cancel = () => { interacted = true; };
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'];
    events.forEach(name => addEventListener(name, cancel, { once: true, passive: true }));
    const align = () => {
      if (!interacted && location.hash === hash) {
        (target.closest('.portfolio-snap-page') || target)
          .scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    };
    // The snap wrappers are already installed. Show the requested chapter now;
    // distant images and fonts must not delay navigation behind the cover.
    requestAnimationFrame(align);
    const finish = () => requestAnimationFrame(() => {
      // Browsers can restore a previous scroll position at load after the
      // first paint. Correct that once, unless the reader already took over.
      align();
      events.forEach(name => removeEventListener(name, cancel));
    });
    if (document.readyState === 'complete') finish();
    else addEventListener('load', finish, { once: true });
  }
  const dialog = document.getElementById('qianli-viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const previews = [...document.querySelectorAll('button.q-image[data-image]')];
  const image = dialog.querySelector('.q-viewer-content img');
  const caption = dialog.querySelector('#q-viewer-caption');
  // The original study is a vector asset, with an English text derivative.
  const study = document.querySelector('button.q-image[data-image$="/tonality-study.svg"]');
  function language() {
    if (study) {
      const name = window.PortfolioI18n?.language === 'en' ? 'tonality-study-en.svg' : 'tonality-study.svg';
      const url = new URL('../assets/works/qianli/case/' + name, document.baseURI).href;
      if (study.dataset.image !== url) study.dataset.image = url;
      if (study.querySelector('img').src !== url) study.querySelector('img').src = url;
    }
    if (dialog.open) show(current);
  }
  let current = 0, opener, savedOverflow;
  function show(index) {
    current = (index + previews.length) % previews.length;
    const preview = previews[current];
    const label = preview.getAttribute('data-caption') || preview.querySelector('img').alt;
    image.src = preview.dataset.image;
    image.alt = label;
    image.classList.toggle('q-on-paper', Boolean(preview.closest('.q-paper')));
    caption.textContent = label;
  }
  previews.forEach((preview, index) => preview.addEventListener('click', event => {
    event.preventDefault();
    opener = preview;
    show(index);
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }));
  dialog.querySelector('[data-q-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-q-prev]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-q-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = savedOverflow;
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
  addEventListener('portfolio:language', language);
  language();
})();
