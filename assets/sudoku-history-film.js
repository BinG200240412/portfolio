/* Real native history recordings follow the page language and viewing state. */
(() => {
  'use strict';
  function init() {
    const video = document.querySelector('[data-history-loop]');
    if (!video) return;
    const figure = video.closest('figure');
    const posterImage = figure.querySelector('[data-history-poster-image]');
    const feedback = figure.querySelector('[data-history-feedback]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false, departed = false, frameHost = null;
    try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}
    const english = () => window.PortfolioI18n?.language === 'en' || /^en\b/i.test(document.documentElement.lang);
    const available = () => inView && !departed && !document.hidden && !motion.matches &&
      (!frameHost || frameHost.classList.contains('on')) && !document.querySelector('dialog[open]');
    function sync() {
      if (!available()) {
        video.pause();
        if (figure.dataset.historyState !== 'failed') figure.dataset.historyState = 'paused';
        return;
      }
      video.play().then(() => {
        if (!available()) { video.pause(); return; }
        figure.dataset.historyState = 'playing';
      }).catch(() => {
        if (figure.dataset.historyState !== 'failed') figure.dataset.historyState = 'poster';
      });
    }
    function language() {
      const locale = english() ? 'en' : 'zh';
      document.querySelectorAll('.sudoku-actions [data-label-zh]').forEach(label => {
        label.textContent = locale === 'en' ? label.dataset.labelEn : label.dataset.labelZh;
      });
      document.querySelector('.sudoku-actions')?.setAttribute('aria-label', locale === 'en' ? 'Product links' : '产品链接');
      const source = video.getAttribute(`data-history-src-${locale}`);
      const poster = video.getAttribute(`data-history-poster-${locale}`);
      video.setAttribute('aria-label', english() ? 'The history of Sudoku, complete native scroll recording' : '数独的历史，完整原生滚动录屏');
      if (feedback) feedback.textContent = english() ? 'The recording could not play. The opening frame is shown.' : '录屏暂时无法播放，先显示开头画面。';
      if (figure.dataset.historyLanguage === locale) return;
      const detail = document.querySelector('#portfolio-video-detail[open]');
      const player = detail?.querySelector('video');
      if (player && player.getAttribute('src') === (video.currentSrc || video.src)) detail.close();
      video.pause();
      figure.dataset.historyLanguage = locale;
      figure.dataset.historyState = 'loading';
      figure.dataset.historyReady = 'false';
      if (feedback) feedback.hidden = true;
      if (posterImage) {
        posterImage.style.visibility = 'hidden';
        posterImage.src = poster;
        posterImage.decode().then(() => {
          if (figure.dataset.historyLanguage === locale) posterImage.style.visibility = '';
        }).catch(() => {});
      }
      video.poster = poster;
      video.src = source;
      video.load();
      sync();
    }
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.addEventListener('loadeddata', () => {
      if (video.readyState < 2) return;
      if (feedback) feedback.hidden = true;
      figure.dataset.historyReady = 'true';
      figure.dataset.historyState = 'ready';
      sync();
    });
    video.addEventListener('error', () => {
      figure.dataset.historyReady = 'false';
      figure.dataset.historyState = 'failed';
      if (feedback) feedback.hidden = false;
    });
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, {threshold: .1}).observe(figure);
    new MutationObserver(sync).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['open']});
    if (frameHost) new MutationObserver(sync).observe(frameHost, {attributes: true, attributeFilter: ['class']});
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('portfolio:video-detail', sync);
    motion.addEventListener('change', sync);
    addEventListener('pagehide', () => { departed = true; sync(); });
    addEventListener('pageshow', () => { departed = false; sync(); });
    addEventListener('portfolio:language', language);
    language();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
