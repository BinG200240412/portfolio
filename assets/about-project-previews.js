/* Small source-faithful work samples open in the resume's own document flow. */
(() => {
  'use strict';
  const resume = document.getElementById('resume');
  const lists = [...resume?.querySelectorAll('.about-project-list') || []];
  if (!lists.length) return;
  const items = lists.flatMap(list => [...list.querySelectorAll('[data-about-project]')]);
  let active = null, closeTimer = 0;
  function load(item, priority = 'low') {
    const image = item.querySelector('[data-about-preview-src]');
    if (!image || image.getAttribute('src')) return;
    const ready = () => { item.dataset.previewReady = 'true'; };
    image.addEventListener('load', ready, {once:true});
    image.loading = 'eager'; image.fetchPriority = priority;
    image.src = image.dataset.aboutPreviewSrc;
    if (image.complete && image.naturalWidth) ready();
  }
  function close() {
    clearTimeout(closeTimer);
    if (active) delete active.dataset.previewOpen;
    active = null;
  }
  function open(item) {
    clearTimeout(closeTimer);
    if (!resume.classList.contains('live')) return;
    if (active && active !== item) delete active.dataset.previewOpen;
    active = item; item.dataset.previewOpen = 'true'; load(item, 'high');
  }
  for (const item of items) {
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') open(item);
    });
    item.addEventListener('pointerleave', () => {
      if (item.querySelector(':focus-visible')) return;
      clearTimeout(closeTimer); closeTimer = setTimeout(close, 120);
    });
    item.addEventListener('focusin', event => {
      if (event.target.matches(':focus-visible')) open(item);
    });
    item.addEventListener('focusout', event => {
      if (item.contains(event.relatedTarget)) return;
      clearTimeout(closeTimer); closeTimer = setTimeout(close, 120);
    });
  }
  // No new thumbnail requests on the introductory homepage. Warm this small
  // set only once the actual resume list enters the viewport.
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      if (!resume.classList.contains('live')) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting || !entry.target.getClientRects().length) return;
        entry.target.querySelectorAll('[data-about-project]').forEach(item => load(item));
        observer.unobserve(entry.target);
      });
    });
    lists.forEach(list => observer.observe(list));
  }
  new MutationObserver(() => {
    if (!resume.classList.contains('live')) close();
  }).observe(resume, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
})();
