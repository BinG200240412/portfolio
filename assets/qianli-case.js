/* Original source images stay individually addressable and work without JS. */
(() => {
  'use strict';
  // Re-align a direct chapter link once fonts settle. Leave scrolling alone
  // as soon as the reader interacts with the page.
  const hash = location.hash;
  const target = hash && document.getElementById(hash.slice(1));
  if (target?.matches('.q-panel')) {
    let interacted = false;
    const cancel = () => { interacted = true; };
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'];
    events.forEach(name => addEventListener(name, cancel, { once: true, passive: true }));
    const align = () => document.fonts.ready.then(() => {
      if (!interacted && location.hash === hash) {
        (target.closest('.portfolio-snap-page') || target)
          .scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      events.forEach(name => removeEventListener(name, cancel));
    });
    if (document.readyState === 'complete') align();
    else addEventListener('load', align, { once: true });
  }
  const dialog = document.getElementById('qianli-viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const links = [...document.querySelectorAll('a.q-image')];
  const image = dialog.querySelector('.q-viewer-content img');
  const caption = dialog.querySelector('#q-viewer-caption');
  // The original study is a vector asset, with an English text derivative.
  const study = document.querySelector('a[href$="/tonality-study.svg"]');
  function language() {
    if (study) {
      const name = window.PortfolioI18n?.language === 'en' ? 'tonality-study-en.svg' : 'tonality-study.svg';
      const url = new URL('../assets/works/qianli/case/' + name, document.baseURI).href;
      if (study.href !== url) study.href = url;
      if (study.querySelector('img').src !== url) study.querySelector('img').src = url;
    }
    if (dialog.open) show(current);
  }
  let current = 0, opener, savedOverflow;
  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    const label = link.getAttribute('data-caption') || link.querySelector('img').alt;
    image.src = link.href;
    image.alt = label;
    image.classList.toggle('q-on-paper', Boolean(link.closest('.q-paper')));
    caption.textContent = label;
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
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
  const videos = [...document.querySelectorAll('.q-film video')];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting && !entry.target.paused) entry.target.pause();
  }), { threshold: 0 });
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video.pause());
  });
})();
