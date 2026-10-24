/* The photograph opens from its screen-right hinge onto a stationary LED shadow. */
(() => {
  'use strict';
  const figure = document.querySelector('.gogo-hero-photo');
  const leaf = figure?.querySelector('.gogo-cover-leaf');
  const image = leaf?.querySelector('img');
  const shadow = figure?.querySelector('.gogo-image-fringe');
  const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  const reveal = () => document.documentElement.classList.remove('gogo-cover-pending');
  if (!figure || !leaf || !image || !window.gsap) { reveal(); return; }
  const gsap = window.gsap;
  let host = null;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  let ready = false, shown = true, timeline = null, started = false, settled = false;
  let replay = false, hostWasActive = !host || host.classList.contains('on');
  const visible = () => {
    const box = figure.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight;
  };
  function finish() {
    settled = true;
    if (timeline) timeline.progress(1).pause();
    gsap.set(leaf, { clearProps: 'transform' });
    if (shadow) gsap.set(shadow, { clearProps: 'transform,opacity' });
    figure.dataset.coverMotion = 'settled';
    reveal();
  }
  function prepare() {
    timeline?.kill();
    started = settled = false;
    figure.dataset.coverMotion = 'pending';
    gsap.set(leaf, { rotationY: 76, transformOrigin: '100% 50%' });
    if (shadow) gsap.set(shadow, { scaleX: .6, opacity: .18, transformOrigin: '100% 50%' });
    timeline = gsap.timeline({ paused: true, onComplete: finish });
    timeline.to(leaf, { rotationY: 0, duration: 1.55, ease: 'power2.inOut' }, 0);
    if (shadow) timeline.to(shadow, { scaleX: 1, opacity: 1, duration: 1.55, ease: 'power2.inOut' }, 0);
  }
  function sync() {
    if (reduced.matches) { finish(); return; }
    if (!ready) return;
    if (!shown || document.hidden || (host && !host.classList.contains('on'))) { timeline?.pause(); return; }
    if (!visible()) { finish(); return; }
    if (replay) { replay = false; prepare(); }
    if (settled) return;
    if (!started) {
      started = true;
      figure.dataset.coverMotion = 'opening';
      reveal();
    }
    timeline?.play();
  }
  function loaded() {
    if (ready) return;
    ready = true;
    if (reduced.matches || !image.naturalWidth) { finish(); return; }
    prepare();
    // The fringe renderer paints on the next frame; both layers start together.
    requestAnimationFrame(sync);
  }
  const observer = new IntersectionObserver(sync);
  observer.observe(figure);
  if (host) new MutationObserver(() => {
    const active = host.classList.contains('on');
    if (active && !hostWasActive && ready) replay = true;
    hostWasActive = active;
    sync();
  }).observe(host, { attributes: true, attributeFilter: ['class'] });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { shown = false; timeline?.pause(); });
  addEventListener('pageshow', event => { shown = true; if (event.persisted) finish(); else sync(); });
  image.addEventListener('error', finish, { once: true });
  if (image.complete) image.decode().catch(() => {}).then(loaded);
  else image.addEventListener('load', () => image.decode().catch(() => {}).then(loaded), { once: true });
})();
