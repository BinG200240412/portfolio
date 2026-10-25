/* A recording of the real Figma editor; no simulated canvas or measurements. */
(() => {
  'use strict';
  const host = document.getElementById('figma-demo');
  if (!host) return;
  const base = new URL('works/design-skills/video/', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh';
  let userPaused = reduced.matches, visible = false;
  const words = {
    zh: {label:'Figma / 实际操作录屏',pause:'暂停',play:'播放录屏',replay:'重播',title:'真实画布中的缩放与间距测量',note:'缩放画布 → 选择原始图层 → 查看 Figma 原生尺寸与间距。',caption:'数独界面 / 原生标尺与图层边界',error:'录屏暂时未载入，请刷新重试。'},
    en: {label:'Figma / editor recording',pause:'Pause',play:'Play recording',replay:'Replay',title:'Zooming and measuring in the real canvas',note:'Zoom the canvas → select original layers → read Figma’s native dimensions and spacing.',caption:'Sudoku interface / native rulers and layer bounds',error:'The recording could not load. Please refresh.'}
  };
  const t = () => words[language];
  host.className = 'fg-recording';
  host.innerHTML = `<div class="fg-recording-head"><span class="fg-recording-label"></span></div><div class="fg-recording-stage"><video class="fg-recording-video" muted loop playsinline preload="metadata" controlslist="nodownload" disablepictureinpicture></video></div><div class="fg-recording-foot"><p class="fg-recording-caption"></p><div class="fg-recording-actions"><button class="fg-recording-replay" type="button"></button><button class="fg-recording-toggle" type="button"></button></div></div><p class="fg-recording-note"></p><p class="fg-recording-error" role="status" hidden></p>`;
  const $ = selector => host.querySelector(selector);
  const video = $('.fg-recording-video');
  const toggle = $('.fg-recording-toggle');
  const error = $('.fg-recording-error');
  video.src = new URL('figma-measurement-recording.mp4', base).href;
  video.poster = new URL('figma-measurement-poster.jpg', base).href;
  video.muted = true;
  video.controls = false;
  function updateCopy() {
    $('.fg-recording-label').textContent = t().label;
    $('.fg-recording-caption').textContent = t().caption;
    $('.fg-recording-note').textContent = t().note;
    $('.fg-recording-replay').textContent = t().replay;
    video.setAttribute('aria-label', t().title);
    toggle.textContent = video.paused ? t().play : t().pause;
    toggle.setAttribute('aria-pressed', String(!video.paused));
    error.textContent = t().error;
  }
  function syncPlayback() {
    if (visible && !document.hidden && !userPaused && !reduced.matches) video.play().catch(updateCopy);
    else video.pause();
    updateCopy();
  }
  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; video.play().catch(updateCopy); }
    else { userPaused = true; video.pause(); }
    updateCopy();
  });
  $('.fg-recording-replay').addEventListener('click', () => {
    video.currentTime = 0; userPaused = false; video.play().catch(updateCopy);
  });
  video.addEventListener('play', updateCopy);
  video.addEventListener('pause', updateCopy);
  video.addEventListener('error', () => { error.hidden = false; });
  new IntersectionObserver(rows => { visible = rows[0].isIntersecting; syncPlayback(); }, {threshold:.12}).observe(video);
  document.addEventListener('visibilitychange', syncPlayback);
  reduced.addEventListener('change', () => { userPaused = reduced.matches; syncPlayback(); });
  addEventListener('portfolio:language', () => { language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'; updateCopy(); });
  updateCopy();
})();
