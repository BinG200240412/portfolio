/* Source studies use a zoomable reader; artwork remains a design presentation. */
(() => {
  'use strict';
  const viewer = document.getElementById('tea-board-viewer');
  const boardImage = viewer.querySelector('img');
  const scroller = viewer.querySelector('.tea-board-scroll');
  const zoomLabel = viewer.querySelector('output');
  const minus = viewer.querySelector('[data-board-minus]');
  const plus = viewer.querySelector('[data-board-plus]');
  let boardOpener, zoom = 1;
  function scale(value) {
    zoom = Math.max(1, Math.min(4, value));
    const available = scroller.clientWidth - (matchMedia('(max-width:600px)').matches ? 24 : 48);
    const width = Math.min(available, boardImage.naturalWidth || available);
    boardImage.style.setProperty('--board-width', `${width * zoom}px`);
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    minus.disabled = zoom === 1; plus.disabled = zoom === 4;
  }
  boardImage.addEventListener('load', () => { if (viewer.open) scale(zoom); });
  document.querySelectorAll('[data-board],[data-tea-detail]').forEach(button => button.addEventListener('click', () => {
    boardOpener = button;
    boardImage.src = button.dataset.board
      ? `../assets/works/tea/board-${button.dataset.board}-detail.webp`
      : button.querySelector('img').currentSrc || button.querySelector('img').src;
    boardImage.alt = button.querySelector('img').alt;
    viewer.querySelector('h2').textContent = button.closest('figure').querySelector('figcaption').textContent;
    document.documentElement.classList.add('tea-board-detail-open');
    viewer.showModal(); scale(1); scroller.scrollTo(0, 0);
    viewer.querySelector('[data-board-close]').focus();
  }));
  minus.addEventListener('click', () => scale(zoom - .5));
  plus.addEventListener('click', () => scale(zoom + .5));
  viewer.querySelector('[data-board-fit]').addEventListener('click', () => scale(1));
  viewer.querySelector('[data-board-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('tea-board-detail-open');
    boardImage.removeAttribute('src');
    boardOpener?.focus({ preventScroll: true });
  });
  addEventListener('resize', () => { if (viewer.open) scale(zoom); }, { passive: true });
  addEventListener('pagehide', () => { if (viewer.open) viewer.close(); });
  addEventListener('portfolio:language', () => {
    if (viewer.open && boardOpener) {
      viewer.querySelector('h2').textContent = boardOpener.closest('figure').querySelector('figcaption').textContent;
      boardImage.alt = boardOpener.querySelector('img').alt;
    }
  });
  // Preserve direct chapter links after local fonts have settled.
  const hash = location.hash;
  const target = hash ? document.getElementById(hash.slice(1))?.closest('.tea-page') : null;
  if (target?.matches('.tea-page')) {
    let interacted = false;
    const cancel = () => { interacted = true; };
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(name => addEventListener(name, cancel, { once: true, passive: true }));
    const align = () => document.fonts.ready.then(() => {
      if (!interacted && location.hash === hash) target.scrollIntoView({ behavior: 'instant' });
    });
    if (document.readyState === 'complete') align();
    else addEventListener('load', align, { once: true });
  }
})();
