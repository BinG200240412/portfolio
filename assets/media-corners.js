/* Shared media presentation. Existing galleries keep ownership of their actions. */
(() => {
  'use strict';
  const surfaces = new Set(), pressHosts = new WeakSet(), imageButtons = new WeakSet(), imageFrames = new WeakSet();
  const ignored = 'dialog,[data-media-corners-ignore],#icon-library,.il-artwork';
  const existingOpeners = '.gogo-zoom,.gogo-reel-visual,.q-image,.image-open,.archive-tile';
  const ordinarySurfaces = '.gogo-zoom,.gogo-reel-visual,.q-image,.practice-image,.screen,.mobile-screen,.hero-media,.fg-recording-stage';
  let viewer, fullImage, feedback, closeButton, opener;
  const english = () => window.PortfolioI18n?.language === 'en' || document.documentElement.lang === 'en';
  const label = image => image.alt || image.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';

  // Matching arc vertices let the browser deepen a notch without changing its curve.
  // Percentage anchors keep right/bottom edges attached even during layout changes.
  function cornerPath(radii) {
    const points = [], segments = 12;
    const px = value => `${value.toFixed(3)}px`;
    const edge = value => `calc(100% - ${px(value)})`;
    for (const corner of [1, 2, 3, 0]) {
      const reverse = corner === 0 || corner === 2;
      for (let step = 0; step <= segments; step++) {
        const angle = (reverse ? segments - step : step) / segments * Math.PI / 2;
        const cosine = Math.cos(angle), sine = Math.sin(angle);
        const x = radii[corner] * cosine, y = radii[corner] * sine;
        points.push(`${corner === 1 || corner === 2 ? edge(x) : px(x)} ${corner === 2 || corner === 3 ? edge(y) : px(y)}`);
      }
    }
    return `polygon(${points.join(',')})`;
  }

  function size(surface) {
    const short = Math.min(surface.clientWidth, surface.clientHeight);
    if (!short) return;
    const video = surface.matches('video') || surface.querySelector('video');
    const style = getComputedStyle(surface);
    const padding = Math.min(12, Math.max(parseFloat(style.paddingTop) || 0, parseFloat(style.paddingLeft) || 0));
    const radius = video ? Math.min(10, Math.max(5, short * .035)) : Math.min(short * .15, Math.max(8, Math.min(26, short * .055)) + padding);
    const active = video ? radius : Math.min(64, short * .22, radius * 2.1);
    surface.style.setProperty('--media-cut', `${radius.toFixed(2)}px`);
    surface.style.setProperty('--media-cut-active', `${active.toFixed(2)}px`);
    surface.style.setProperty('--media-corner-rest', cornerPath([radius, radius, radius, radius]));
    surface.style.setProperty('--media-corner-selected', cornerPath([active, radius, active, radius]));
  }
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => size(entry.target))) : null;

  function press(host) {
    if (pressHosts.has(host)) return;
    pressHosts.add(host);
    let timer;
    const clear = () => { clearTimeout(timer); delete host.dataset.mediaPress; };
    host.addEventListener('pointerdown', event => {
      if (event.button > 0) return;
      clearTimeout(timer); host.dataset.mediaPress = 'true';
    });
    host.addEventListener('pointerup', () => { timer = setTimeout(clear, 220); });
    host.addEventListener('pointercancel', clear);
    host.addEventListener('pointerleave', clear);
  }
  function decorate(surface, host) {
    surface.setAttribute('data-media-corners', '');
    if (!surfaces.has(surface)) { surfaces.add(surface); resize?.observe(surface); }
    size(surface);
    if (host) { host.setAttribute('data-media-zoomable', ''); press(host); }
  }
  function viewerLanguage() {
    if (!viewer) return;
    viewer.setAttribute('aria-label', english() ? 'Image detail' : '图片详情');
    closeButton.setAttribute('aria-label', english() ? 'Close image' : '关闭图片');
    if (!feedback.hidden) feedback.textContent = english() ? 'This image could not load.' : '图片暂时未能载入。';
  }
  function makeViewer() {
    if (viewer) return;
    viewer = document.createElement('dialog');
    viewer.id = 'portfolio-media-viewer'; viewer.className = 'media-viewer media-detail';
    viewer.setAttribute('data-i18n-ignore', '');
    closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'media-detail-close';
    closeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    const stage = document.createElement('div'); stage.className = 'media-detail-stage';
    fullImage = document.createElement('img'); fullImage.decoding = 'async';
    feedback = document.createElement('p'); feedback.className = 'media-detail-feedback'; feedback.setAttribute('role', 'status'); feedback.hidden = true;
    stage.append(fullImage, feedback); viewer.append(closeButton, stage); document.body.append(viewer);
    closeButton.addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer || event.target === stage) viewer.close(); });
    fullImage.addEventListener('error', () => { if (viewer.open) { feedback.hidden = false; viewerLanguage(); } });
    fullImage.addEventListener('load', () => { feedback.hidden = true; });
    viewer.addEventListener('close', () => {
      document.documentElement.classList.remove('media-detail-open');
      fullImage.removeAttribute('src'); feedback.hidden = true;
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
      opener = null;
    });
    viewerLanguage();
  }
  function open(image) {
    makeViewer();
    if (viewer.open) return;
    opener = image; feedback.hidden = true;
    fullImage.alt = label(image); fullImage.src = image.currentSrc || image.src;
    document.documentElement.classList.add('media-detail-open');
    viewer.showModal(); closeButton.focus({ preventScroll: true });
  }
  function imageButton(image) {
    image.setAttribute('role', 'button'); image.tabIndex = 0;
    image.setAttribute('aria-haspopup', 'dialog');
    image.setAttribute('aria-label', `${english() ? 'Enlarge image' : '放大查看'}${label(image) ? '：' + label(image) : ''}`);
    if (imageButtons.has(image)) return;
    imageButtons.add(image);
    image.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault(); event.stopPropagation(); open(image);
    });
    image.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
        event.preventDefault(); event.stopPropagation(); open(image);
      }
    });
  }
  function mount(media) {
    if (media.closest(ignored)) return;
    if (media.matches('video')) {
      const surface = media.closest('.fg-recording-stage') || media;
      decorate(surface, null);
      return;
    }
    // Hardware, transparent characters and inline SVG keep their own silhouettes.
    if (media.closest('.sudoku-device')) {
      const deviceWindow = media.closest('.case-evolution-window');
      if (deviceWindow) decorate(deviceWindow, deviceWindow);
      return;
    }
    const existing = media.closest(existingOpeners);
    const link = media.closest('a,button,[role="button"]');
    const surface = media.closest('.gogo-cover-panel,.about-portrait,.archive-paper') || media.closest(ordinarySurfaces) || media;
    let host = existing ? (surface.contains(existing) ? surface : existing) : null;
    if (!existing && (!link || imageButtons.has(media))) {
      imageButton(media); host = surface;
      if (surface !== media && !imageFrames.has(surface)) {
        imageFrames.add(surface);
        surface.addEventListener('click', event => { if (event.target === surface) open(media); });
      }
    }
    if (existing) existing.setAttribute('data-media-zoomable', '');
    // An ornamental portrait frame and printed sheets already own their edges.
    // Keep the existing/generic viewer bindings above, without cutting them.
    if (surface.matches('.about-portrait,.archive-paper')) {
      surface.setAttribute('data-media-corners-exempt', '');
      if (host) { host.setAttribute('data-media-zoomable', ''); press(host); }
      return;
    }
    decorate(surface, host);
  }
  function scan(root) {
    if (root.nodeType !== 1 || root.matches(ignored)) return;
    if (root.matches('img,video')) mount(root);
    root.querySelectorAll('img,video').forEach(mount);
  }
  function remove(root) {
    if (root.nodeType !== 1) return;
    const removed = root.matches('[data-media-corners]') ? [root] : [];
    removed.push(...root.querySelectorAll('[data-media-corners]'));
    removed.forEach(surface => { resize?.unobserve(surface); surfaces.delete(surface); });
  }
  function init() {
    scan(document.body);
    new MutationObserver(records => records.forEach(record => {
      record.removedNodes.forEach(remove); record.addedNodes.forEach(scan);
    })).observe(document.body, { childList: true, subtree: true });
    addEventListener('resize', () => surfaces.forEach(size), { passive: true });
    addEventListener('portfolio:language', () => {
      document.querySelectorAll('img[role="button"][aria-haspopup="dialog"]').forEach(image => {
        if (imageButtons.has(image)) imageButton(image);
      });
      viewerLanguage();
    });
    addEventListener('pagehide', () => { if (viewer?.open) viewer.close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
