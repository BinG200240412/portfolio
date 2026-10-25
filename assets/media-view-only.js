/* Reduce ordinary media-saving entry points. Public web assets are not DRM. */
(() => {
  'use strict';
  const mediaSelector = 'img,picture,svg,canvas,video,audio';
  const surfaceSelector = `${mediaSelector},[data-media-zoomable]`;
  const filePattern = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp|mp4|m4v|mov|webm|og[gv]|mp3|m4a|wav|flac|aac|pdf|zip|7z|rar|obj|fbx|glb|gltf|ply|spz|stl|usdz)$/i;

  function fileLink(link) {
    if (link.hasAttribute('download')) return true;
    const href = link.getAttribute('href');
    if (!href) return false;
    if (/^(?:blob:|data:(?:image|video|audio|application)\/)/i.test(href)) return true;
    try { return filePattern.test(new URL(href, document.baseURI).pathname); }
    catch (_) { return false; }
  }
  function elements(event) {
    return (event.composedPath?.() || [event.target]).filter(node => node instanceof Element);
  }
  function mediaEvent(event) {
    return elements(event).some(node => node.closest(surfaceSelector) ||
      (node.closest('a[href],a[download]') && fileLink(node.closest('a[href],a[download]'))));
  }
  function blockFileNavigation(event) {
    const link = elements(event).map(node => node.closest('a[href],a[download]')).find(Boolean);
    // Do not stop propagation: existing in-page galleries may still handle a click.
    if (link && fileLink(link)) event.preventDefault();
  }
  document.addEventListener('contextmenu', event => {
    if (mediaEvent(event)) event.preventDefault();
  }, true);
  document.addEventListener('dragstart', event => {
    if (mediaEvent(event)) event.preventDefault();
  }, true);
  document.addEventListener('click', blockFileNavigation, true);
  document.addEventListener('auxclick', blockFileNavigation, true);

  function protect(media) {
    if (media.matches('img') && media.draggable) media.draggable = false;
    if (media.matches('video,audio')) {
      const controls = new Set((media.getAttribute('controlslist') || '').split(/\s+/).filter(Boolean));
      if (!controls.has('nodownload')) {
        controls.add('nodownload');
        media.setAttribute('controlslist', [...controls].join(' '));
      }
    }
  }
  function scan(root) {
    if (!(root instanceof Element)) return;
    if (root.matches('img,video,audio')) protect(root);
    root.querySelectorAll('img,video,audio').forEach(protect);
  }
  function init() {
    scan(document.documentElement);
    // Covers original images, inline previews and media added inside dialogs.
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'attributes') protect(record.target);
      else record.addedNodes.forEach(scan);
    })).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['controlslist', 'draggable']
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
