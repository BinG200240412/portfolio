/* Inline films are previews. A separate native player owns viewing controls. */
(() => {
  'use strict';
  const previews = new Map(), savedTimes = new WeakMap();
  let dialog, stage, closeButton, feedback, active = null, frameHost = null;
  try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}
  const english = () => window.PortfolioI18n?.language === 'en' || document.documentElement.lang.startsWith('en');
  const available = () => !document.hidden && (!frameHost || frameHost.classList.contains('on'));
  const sourceURL = video => video.currentSrc || video.src || video.querySelector('source[src]')?.src || '';
  const sourceLabel = video => video.getAttribute('aria-label') || video.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';
  const finiteTime = value => Number.isFinite(value) && value >= 0;

  function language() {
    previews.forEach((host, video) => host.setAttribute('aria-label',
      `${english() ? 'Watch video' : '观看视频'}${sourceLabel(video) ? (english() ? ': ' : '：') + sourceLabel(video) : ''}`));
    if (!dialog) return;
    dialog.setAttribute('aria-label', english() ? 'Video player' : '视频播放器');
    closeButton.setAttribute('aria-label', english() ? 'Close video' : '关闭视频');
    if (active) active.player.setAttribute('aria-label', sourceLabel(active.source));
    feedback.textContent = english() ? 'This video could not play.' : '视频暂时无法播放。';
  }
  function announce(open, source) {
    document.dispatchEvent(new CustomEvent('portfolio:video-detail', {detail: {open, source}}));
  }
  function makeDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'portfolio-video-detail'; dialog.className = 'media-viewer video-detail';
    dialog.setAttribute('data-i18n-ignore', '');
    closeButton = document.createElement('button');
    closeButton.type = 'button'; closeButton.className = 'video-detail-close';
    closeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    stage = document.createElement('div'); stage.className = 'video-detail-stage';
    feedback = document.createElement('p'); feedback.className = 'video-detail-feedback';
    feedback.setAttribute('role', 'status'); feedback.hidden = true;
    dialog.append(closeButton, stage, feedback); document.body.appendChild(dialog);
    closeButton.addEventListener('click', () => close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target === stage) close();
    });
    dialog.addEventListener('close', () => finish());
    language();
  }
  function finish(options = {}) {
    if (!active) return;
    const state = active, {source, host, player} = state;
    active = null;
    // A quick open/close before metadata or the initial seek must not reset progress.
    if (state.canReturnTime && player.readyState > 0 && finiteTime(player.currentTime)) {
      savedTimes.set(source, {url: state.url, time: player.currentTime});
      if (source.isConnected) { try { source.currentTime = player.currentTime; } catch (_) {} }
    }
    player.pause();
    if (document.fullscreenElement === player) document.exitFullscreen?.().catch(() => {});
    if (document.pictureInPictureElement === player) document.exitPictureInPicture?.().catch(() => {});
    if (player.webkitDisplayingFullscreen) player.webkitExitFullscreen?.();
    player.removeAttribute('src'); player.load(); player.remove();
    feedback.hidden = true;
    document.documentElement.classList.remove('video-detail-open');
    announce(false, source);
    const rect = host.getBoundingClientRect();
    if (options.resume !== false && state.wasPlaying && source.isConnected && available() &&
        source.dataset.videoPreviewManaged !== 'true' && rect.bottom > 0 && rect.top < innerHeight) {
      source.play().catch(() => {});
    }
    if (options.restoreFocus !== false && host.isConnected && !host.closest('[inert]')) host.focus({preventScroll: true});
  }
  function close(options = {}) {
    if (dialog?.open) dialog.close();
    finish(options);
  }
  function open(source, host) {
    if (active || !available()) return;
    const url = sourceURL(source);
    if (!url) return;
    makeDialog();
    const cached = savedTimes.get(source);
    const startTime = source.readyState > 0 && finiteTime(source.currentTime) ? source.currentTime
      : cached?.url === url ? cached.time : finiteTime(source.currentTime) ? source.currentTime : 0;
    const player = document.createElement('video');
    player.className = 'video-detail-player'; player.dataset.videoDetailPlayer = '';
    player.controls = true; player.playsInline = true; player.preload = 'metadata';
    player.setAttribute('controlslist', 'nodownload');
    player.loop = source.loop;
    if (source.poster) player.poster = source.poster;
    const state = {source, host, player, url, startTime, wasPlaying: !source.paused, canReturnTime: false};
    active = state;
    player.addEventListener('loadedmetadata', () => {
      if (active !== state) return;
      const start = Number.isFinite(player.duration) && startTime >= player.duration - .05 ? 0 : startTime;
      if (start > 0) {
        try {
          player.currentTime = start;
          state.canReturnTime = !player.seeking && Math.abs(player.currentTime - start) < .1;
        } catch (_) {}
      } else state.canReturnTime = true;
    }, {once: true});
    player.addEventListener('seeked', () => { if (active === state) state.canReturnTime = true; });
    player.addEventListener('error', () => { if (active === state) { feedback.hidden = false; language(); } });
    stage.replaceChildren(player);
    feedback.hidden = true; language();
    document.documentElement.classList.add('video-detail-open');
    announce(true, source);
    document.querySelectorAll('video').forEach(video => { if (video !== player && !video.closest('dialog')) video.pause(); });
    player.src = url;
    dialog.showModal(); closeButton.focus({preventScroll: true});
    // Called in the opening gesture. Native controls remain available if play is blocked.
    player.play().then(() => { if (active !== state) player.pause(); }).catch(() => {});
  }
  function mount(video) {
    if (video.closest('dialog') || previews.has(video)) return;
    let host = video.closest('.fg-recording-stage');
    if (!host) {
      host = document.createElement('div');
      video.before(host); host.appendChild(video);
    }
    host.classList.add('video-preview');
    host.setAttribute('data-video-preview', ''); host.setAttribute('data-media-zoomable', '');
    host.setAttribute('role', 'button'); host.setAttribute('aria-haspopup', 'dialog'); host.tabIndex = 0;
    video.controls = false; video.removeAttribute('controls'); video.muted = true; video.playsInline = true;
    video.tabIndex = -1; video.setAttribute('aria-hidden', 'true');
    previews.set(video, host);
    host.addEventListener('click', event => {
      if (event.button > 0) return;
      event.preventDefault(); event.stopPropagation(); open(video, host);
    });
    host.addEventListener('keydown', event => {
      if (event.target === host && (event.key === 'Enter' || event.key === ' ') && !event.repeat) {
        event.preventDefault(); event.stopPropagation(); open(video, host);
      }
    });
    language();
  }
  function scan(root) {
    if (!(root instanceof Element) || root.closest('dialog')) return;
    if (root.matches('video')) mount(root);
    root.querySelectorAll('video').forEach(mount);
  }
  function init() {
    scan(document.body);
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(scan));
      previews.forEach((host, video) => { if (!video.isConnected) previews.delete(video); });
    }).observe(document.body, {childList: true, subtree: true});
    if (frameHost) new MutationObserver(() => {
      if (!frameHost.classList.contains('on')) close({resume: false, restoreFocus: false});
    }).observe(frameHost, {attributes: true, attributeFilter: ['class']});
  }
  document.addEventListener('play', event => {
    if (active && event.target instanceof HTMLVideoElement && event.target !== active.player && !event.target.closest('dialog')) event.target.pause();
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) active?.player.pause(); });
  addEventListener('pagehide', () => close({resume: false, restoreFocus: false}));
  addEventListener('portfolio:language', language);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
