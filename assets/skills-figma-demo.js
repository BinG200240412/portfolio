/* A recording of the real Figma editor; no simulated canvas or measurements. */
(() => {
  'use strict';
  const host = document.getElementById('figma-demo');
  if (!host) return;
  const base = new URL('works/design-skills/video/', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh';
  let userPaused = reduced.matches, visible = false, detailOpen = false, shown = true, frameHost = null;
  try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}
  const words = {
    zh: {label:'Figma / 实际操作录屏',title:'真实画布中的缩放与间距测量',note:'缩放画布 → 选择原始图层 → 查看 Figma 原生尺寸与间距。',caption:'数独界面 / 原生标尺与图层边界',error:'录屏暂时未载入，请刷新重试。'},
    en: {label:'Figma / editor recording',title:'Zooming and measuring in the real canvas',note:'Zoom the canvas → select original layers → read Figma’s native dimensions and spacing.',caption:'Sudoku interface / native rulers and layer bounds',error:'The recording could not load. Please refresh.'}
  };
  const t = () => words[language];
  host.className = 'fg-recording';
  host.innerHTML = `<div class="fg-recording-head"><span class="fg-recording-label"></span></div><div class="fg-recording-stage"><video class="fg-recording-video" muted loop playsinline preload="metadata" controlslist="nodownload" disablepictureinpicture></video></div><div class="fg-recording-foot"><p class="fg-recording-caption"></p></div><p class="fg-recording-note"></p><p class="fg-recording-error" role="status" hidden></p>`;
  const $ = selector => host.querySelector(selector);
  const video = $('.fg-recording-video');
  const error = $('.fg-recording-error');
  video.src = new URL('figma-measurement-recording.mp4', base).href;
  video.poster = new URL('figma-measurement-poster.jpg', base).href;
  video.muted = true;
  video.controls = false;
  video.dataset.videoPreviewManaged = 'true';
  function updateCopy() {
    $('.fg-recording-label').textContent = t().label;
    $('.fg-recording-caption').textContent = t().caption;
    $('.fg-recording-note').textContent = t().note;
    video.setAttribute('aria-label', t().title);
    error.textContent = t().error;
  }
  function syncPlayback() {
    if (shown && visible && !document.hidden && !detailOpen && !userPaused && !reduced.matches &&
        (!frameHost || frameHost.classList.contains('on'))) video.play().catch(updateCopy);
    else video.pause();
    updateCopy();
  }
  video.addEventListener('error', () => { error.hidden = false; });
  new IntersectionObserver(rows => { visible = rows[0].isIntersecting; syncPlayback(); }, {threshold:.12}).observe(video);
  document.addEventListener('visibilitychange', syncPlayback);
  document.addEventListener('portfolio:video-detail', event => {
    if (typeof event.detail?.open !== 'boolean') return;
    detailOpen = event.detail.open;
    host.dataset.videoDetailOpen = String(detailOpen);
    syncPlayback();
  });
  reduced.addEventListener('change', () => { userPaused = reduced.matches; syncPlayback(); });
  if (frameHost) new MutationObserver(syncPlayback).observe(frameHost, {attributes: true, attributeFilter: ['class']});
  addEventListener('pagehide', () => { shown = false; syncPlayback(); });
  addEventListener('pageshow', () => { shown = true; syncPlayback(); });
  addEventListener('portfolio:language', () => { language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'; updateCopy(); });
  host.dataset.videoDetailOpen = 'false';
  updateCopy();
})();
