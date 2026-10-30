/* A recording of the real Figma editor; no simulated canvas or measurements. */
/* Offscreen media starts near its section, after the first screen can render.
 * data-nearby-state records only initialization, not download completion. */
((target, scriptURL, initialize) => {
  'use strict';
  if (!target) return;
  target.dataset.nearbyState = 'waiting';
  let started = false, observer;
  function check() {
    if (started) return;
    const box = target.getBoundingClientRect();
    const viewport = window.innerHeight || 800;
    const lead = viewport * .8;
    const visible = box.top < viewport && box.bottom >= 0;
    const approaching = window.scrollY > 8 && box.top < viewport + lead && box.bottom > -lead;
    // A below-fold section may already lie inside the lookahead on first load.
    // Keep that work out of the opening; direct links already in view still run.
    if (!visible && !approaching) return;
    started = true;
    observer?.disconnect();
    ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => removeEventListener(type, check));
    target.dataset.nearbyState = 'started';
    initialize(scriptURL);
  }
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(check, {rootMargin: `${Math.round((window.innerHeight || 800) * .8)}px 0px`});
    observer.observe(target);
  }
  // Geometry checks also provide the fallback when IntersectionObserver is absent.
  ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => addEventListener(type, check, {passive: true}));
  check();
})(document.getElementById("figma-demo"), document.currentScript?.src || document.baseURI, scriptURL => {

  'use strict';
  const host = document.getElementById('figma-demo');
  if (!host) return;
  const base = new URL('works/design-skills/video/', scriptURL);
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
  if (typeof IntersectionObserver === 'function') new IntersectionObserver(rows => { visible = rows[0].isIntersecting; syncPlayback(); }, {threshold:.12}).observe(video);
  else { visible = true; syncPlayback(); }
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
});
