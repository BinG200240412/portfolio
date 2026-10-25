/* Run the relationship signals only while this page can actually be seen. */
(() => {
  'use strict';
  const page = document.querySelector('.gogo-relationship-page');
  if (!page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const dialog = document.getElementById('gogo-lightbox');
  let host = null, onScreen = false, shown = true;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  function sync() {
    const canAnimate = !reduced.matches && !forced.matches;
    page.classList.toggle('has-relation-motion', canAnimate);
    page.classList.toggle('is-relation-active', canAnimate && onScreen && shown
      && !document.hidden && !dialog?.open && (!host || host.classList.contains('on')));
  }
  new IntersectionObserver(entries => {
    onScreen = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .01);
    sync();
  }, { threshold: .01 }).observe(page);
  if (dialog) new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  if (host) new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  forced.addEventListener('change', sync);
  addEventListener('pagehide', () => { shown = false; sync(); });
  addEventListener('pageshow', () => { shown = true; sync(); });
  sync();
})();
