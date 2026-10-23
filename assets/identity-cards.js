(() => {
  'use strict';

  function init() {
    const gallery = document.getElementById('identity-gallery');
    const resume = document.getElementById('resume');
    if (!gallery || !resume || gallery.dataset.identityReady) return;
    const grid = gallery.querySelector('.identity-grid') || gallery;
    const cards = Array.from(gallery.querySelectorAll('[data-identity-card],.identity-card'));
    if (!cards.length) return;
    gallery.dataset.identityReady = 'true';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let active = false, pageShown = true;
    let entryTimer = 0, settleTimer = 0, measureFrame = 0;

    function setMode(mode) {
      gallery.classList.remove('assembled', 'spreading', 'spread');
      gallery.classList.add(mode);
    }
    function clearPending() {
      clearTimeout(entryTimer); clearTimeout(settleTimer);
      entryTimer = 0; settleTimer = 0;
      if (measureFrame) cancelAnimationFrame(measureFrame);
      measureFrame = 0;
    }
    function layoutPosition(element) {
      let x = 0, y = 0;
      for (let node = element; node; node = node.offsetParent) {
        x += node.offsetLeft; y += node.offsetTop;
      }
      return { x, y };
    }
    function measure() {
      if (!active) return;
      const visible = cards.filter(card => card.offsetWidth > 0 && card.offsetHeight > 0);
      if (!visible.length) return;
      const origin = layoutPosition(grid);
      const anchorX = grid.clientWidth / 2;
      const anchorY = visible[0].offsetHeight / 2;
      visible.forEach((card, index) => {
        const position = layoutPosition(card);
        card.style.setProperty('--index', String(index));
        card.style.setProperty('--card-x', `${(anchorX - (position.x - origin.x + card.offsetWidth / 2)).toFixed(2)}px`);
        card.style.setProperty('--card-y', `${(anchorY - (position.y - origin.y + card.offsetHeight / 2)).toFixed(2)}px`);
      });
    }
    function queueMeasure() {
      if (!active || measureFrame) return;
      measureFrame = requestAnimationFrame(() => { measureFrame = 0; measure(); });
    }
    function spread() {
      entryTimer = 0;
      if (!active) return;
      measure();
      if (reduced.matches) { setMode('spread'); return; }
      void grid.offsetWidth;
      setMode('spreading');
      settleTimer = setTimeout(() => {
        settleTimer = 0;
        if (active) setMode('spread');
      }, 1100);
    }
    function syncActive() {
      const next = pageShown && !document.hidden && resume.classList.contains('live');
      if (next === active) return;
      active = next;
      clearPending();
      setMode('assembled');
      if (!active) return;
      measure(); queueMeasure();
      if (reduced.matches) setMode('spread');
      else entryTimer = setTimeout(spread, 900);
    }

    new MutationObserver(syncActive).observe(resume, { attributes: true, attributeFilter: ['class'] });
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(queueMeasure);
      observer.observe(grid); observer.observe(cards[0]);
    }
    addEventListener('resize', queueMeasure, { passive: true });
    document.fonts?.ready.then(queueMeasure).catch(() => {});
    reduced.addEventListener('change', () => {
      if (!active || !reduced.matches) return;
      clearPending(); setMode('spread'); queueMeasure();
    });
    document.addEventListener('visibilitychange', syncActive);
    addEventListener('pagehide', () => { pageShown = false; syncActive(); });
    addEventListener('pageshow', () => { pageShown = true; syncActive(); queueMeasure(); });
    setMode('assembled'); syncActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
