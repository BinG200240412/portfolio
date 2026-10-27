/* Native recordings run once, then hand their exact freeze frame to the
 * component analysis. The video is a narrative layer inside the Apple bezel,
 * not a second player or a reconstruction of the application UI. */
(() => {
  'use strict';
  const scriptURL = document.currentScript?.src;
  function init() {
    const gallery = document.getElementById('sudoku-gallery');
    const stage = document.getElementById('sudoku-anatomy');
    const image = document.getElementById('sudoku-active-image');
    const opener = document.getElementById('sudoku-active-open');
    const device = image?.closest('.sudoku-device');
    if (!gallery || !stage || !image || !opener || !device || !scriptURL) return;

    const rootURL = new URL('works/sudoku/demos/', scriptURL);
    const screens = new Set(['board', 'coach', 'settings', 'classics', 'walkthrough', 'share']);
    const ANALYSIS_LEAD = .45;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const forced = matchMedia('(forced-colors: active)');
    const viewer = document.getElementById('media-viewer');
    let frameHost = null;
    try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}
    const english = () => window.PortfolioI18n?.language === 'en' || document.documentElement.lang.startsWith('en');
    let session = null, serial = 0, onScreen = false, pageShown = true, playRequest = null;

    const video = document.createElement('video');
    video.className = 'sudoku-device-screen sudoku-demo-video';
    video.setAttribute('data-video-detail-ignore', '');
    video.setAttribute('data-media-corners-ignore', '');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('playsinline', '');
    video.setAttribute('controlslist', 'nodownload noremoteplayback');
    video.preload = 'none'; video.muted = true; video.defaultMuted = true;
    video.playsInline = true; video.controls = false; video.tabIndex = -1;
    video.disablePictureInPicture = true; video.disableRemotePlayback = true;
    device.append(video);

    const actions = document.createElement('div');
    actions.className = 'sudoku-demo-actions'; actions.setAttribute('data-i18n-ignore', '');
    const replay = document.createElement('button');
    replay.className = 'sudoku-demo-replay'; replay.type = 'button';
    replay.setAttribute('aria-controls', 'sudoku-anatomy');
    const feedback = document.createElement('span');
    feedback.className = 'sudoku-demo-feedback'; feedback.hidden = true;
    const status = document.createElement('span');
    status.className = 'case-sr-only'; status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    actions.append(replay, feedback, status); stage.after(actions);

    function available() {
      return onScreen && pageShown && !document.hidden && !viewer?.open &&
        !document.querySelector('#portfolio-video-detail[open]') &&
        Number(getComputedStyle(gallery).opacity) >= .98 &&
        (!frameHost || frameHost.classList.contains('on'));
    }
    function label() {
      return gallery.querySelector(`.sudoku-screen-tab[data-screen="${session?.screen}"] [data-screen-label]`)?.textContent.trim() ||
        gallery.querySelector(`.sudoku-screen-tab[data-screen="${session?.screen}"]`)?.textContent.trim() || '';
    }
    function copy() {
      if (!session) return;
      const skip = !session.completed;
      replay.textContent = english() ? (skip ? 'See the breakdown' : 'Replay the process') : (skip ? '直接看拆解' : '重看过程');
      replay.setAttribute('aria-label', english() ? `${skip ? 'See the breakdown' : 'Replay the process'}: ${label()}` :
        `${skip ? '直接看拆解' : '重看过程'}：${label()}`);
      feedback.hidden = session.state !== 'failed';
      feedback.textContent = english() ? 'The process could not play. The interface is shown.' : '过程暂时无法播放，已显示界面。';
    }
    function announce(state, reason = '') {
      if (!session) return;
      session.state = state; gallery.dataset.demoState = state;
      gallery.dataset.demoScreen = session.screen; copy();
      status.textContent = state === 'analysing'
        ? (english() ? `Opening the interface breakdown for ${label()}.` : `正在展开${label()}的界面拆解。`)
        : state === 'playing'
        ? (english() ? `Showing how to use ${label()}.` : `正在演示${label()}的操作过程。`)
        : (english() ? `Paused on ${label()} for the interface breakdown.` : `已定格在${label()}，可以查看界面拆解。`);
      gallery.dispatchEvent(new CustomEvent('sudoku:demo-state', { detail: {
        state, screen: session.screen, reason,
        time: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      } }));
    }
    function decodedImage(target) {
      return new Promise(resolve => {
        let settled = false;
        const done = ready => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          target.removeEventListener('load', loaded);
          target.removeEventListener('error', failed);
          resolve(Boolean(ready && target.naturalWidth));
        };
        const loaded = () => done(true), failed = () => done(false);
        const timer = setTimeout(failed, 5000);
        if (typeof target.decode === 'function') {
          try { target.decode().then(loaded, failed); } catch (_) { failed(); }
        } else if (target.complete) done(Boolean(target.naturalWidth));
        else {
          target.addEventListener('load', loaded, { once: true });
          target.addEventListener('error', failed, { once: true });
        }
      });
    }
    async function applyPoster(current) {
      if (session !== current || !current.posterReady) return false;
      if (image.src !== current.poster) image.src = current.poster;
      opener.dataset.image = current.poster;
      const ready = await decodedImage(image);
      return session === current && ready;
    }
    function poster(current) {
      return new Promise(resolve => {
        const still = new Image();
        let settled = false;
        const done = ready => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          still.onload = still.onerror = null;
          if (ready) {
            current.posterReady = true;
          } else still.removeAttribute('src');
          resolve(ready);
        };
        const timer = setTimeout(() => done(false), 5000);
        still.onload = async () => {
          const ready = await decodedImage(still);
          if (!settled) done(ready);
        };
        still.onerror = () => done(false);
        still.src = current.poster;
      });
    }
    function seekFinalFrame(current) {
      if (session !== current || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0 || video.error) {
        return Promise.resolve(false);
      }
      const end = Math.max(0, video.duration - Math.min(.04, video.duration / 2));
      return new Promise(resolve => {
        let settled = false;
        const done = ready => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          video.removeEventListener('seeked', seeked);
          video.removeEventListener('error', failed);
          video.removeEventListener('abort', failed);
          resolve(ready && session === current);
        };
        const seeked = () => {
          const ready = !video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - end) < .12;
          if (session === current) video.pause();
          done(ready);
        };
        const failed = () => done(false);
        const timer = setTimeout(failed, 2000);
        video.addEventListener('seeked', seeked);
        video.addEventListener('error', failed);
        video.addEventListener('abort', failed);
        try { video.currentTime = end; } catch (_) { failed(); }
      });
    }
    async function restoreStatic(current) {
      if (session !== current) return;
      if (current.fallbackImage && image.src !== current.fallbackImage) image.src = current.fallbackImage;
      opener.dataset.image = current.fallbackImage || image.src;
      if (!image.complete || !image.naturalWidth) await decodedImage(image);
    }
    async function finish(state = 'complete', reason = '') {
      const current = session;
      if (!current || current.completed) return;
      current.completed = true; current.wanted = false;
      video.pause(); playRequest = null;
      if (current.retryFrame) cancelAnimationFrame(current.retryFrame);
      current.retryFrame = 0;
      // A stalled image cannot hold the analysis indefinitely. If its terminal
      // still is unavailable, only a verified video end frame may remain visible.
      const ready = await current.posterPromise;
      if (session !== current) return;
      const decoded = ready && await applyPoster(current);
      if (session !== current) return;
      if (decoded) video.classList.remove('is-visible');
      else {
        const ended = reason === 'ended' && video.ended && video.readyState >= 2;
        const frozen = ended || (current.started && reason === 'skip' && await seekFinalFrame(current));
        if (session !== current) return;
        if (frozen) video.classList.add('is-visible');
        else {
          video.classList.remove('is-visible');
          await restoreStatic(current);
          if (session !== current) return;
          state = 'failed'; reason = 'freeze-unavailable';
        }
      }
      // Image load schedules the anatomy's measurement. Let that settle before
      // handing it the animation cue, so it grows from the new exact targets.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (session === current) {
        device.classList.remove('is-demo-loading');
        announce(state, reason);
      }
    }
    function start() {
      const current = session;
      if (!current || current.completed || !current.wanted || !available() || playRequest) return;
      if ((reduced.matches || forced.matches) && !current.manual) {
        finish('ready', reduced.matches ? 'reduced-motion' : 'forced-colors'); return;
      }
      if (!video.getAttribute('src')) {
        video.preload = 'auto'; video.src = current.video; video.load();
      }
      const request = { serial: current.serial }; playRequest = request;
      video.play().then(() => {
        // The shared element may already belong to a newer tab by now.
        if (session !== current) return;
        if (!current.wanted || !available()) video.pause();
      }).catch(error => {
        if (session !== current || !current.wanted || !available()) return;
        request.aborted = error.name === 'AbortError';
        if (!request.aborted) finish('failed', error.name || 'playback');
      }).finally(() => {
        if (playRequest === request) playRequest = null;
        if (session !== current || !current.wanted || !available() || !video.paused || current.retryFrame) return;
        if (request.aborted && current.abortRetried) return;
        if (request.aborted) current.abortRetried = true;
        current.retryFrame = requestAnimationFrame(() => {
          current.retryFrame = 0;
          if (session === current) start();
        });
      });
    }
    function sync() {
      if (!available()) { video.pause(); return; }
      start();
    }
    function cueAnalysis() {
      const current = session;
      if (!current?.started || !current.wanted || current.analysisCued || video.paused ||
        reduced.matches || forced.matches || !available() || !Number.isFinite(video.duration)) return;
      // The terminal still already occupies this exact layout underneath the
      // recording. Cue the analysis during its tail; keep playback at full speed.
      if (!current.posterReady || image.src !== current.poster || !image.complete || !image.naturalWidth) return;
      if (video.duration - video.currentTime > ANALYSIS_LEAD) return;
      current.analysisCued = true;
      announce('analysing', 'analysis-lead');
    }
    function prepare(screen, manual = false) {
      if (!screens.has(screen)) return;
      if (session?.retryFrame) cancelAnimationFrame(session.retryFrame);
      device.classList.add('is-demo-loading');
      video.pause(); video.classList.remove('is-visible');
      video.removeAttribute('src'); video.load(); playRequest = null;
      const overrides = window.SudokuDemoClips?.[screen] || {};
      session = {
        screen, serial: ++serial, manual, wanted: true, started: false,
        completed: false, posterReady: false, analysisCued: false, abortRetried: false, retryFrame: 0,
        fallbackImage: image.src || image.currentSrc,
        video: new URL(overrides.video || `${screen}.mp4`, rootURL).href,
        poster: new URL(overrides.poster || `${screen}.jpg`, rootURL).href,
        preview: new URL(overrides.preview || `${screen}-start.jpg`, rootURL).href,
      };
      const current = session;
      // Begin on this recording's first frame, never flash the old screenshot
      // or the ending before the operation has been shown.
      video.poster = current.preview;
      // Synchronous: analysis is held before loading or the next rendered frame.
      announce('playing', 'preparing');
      current.posterPromise = poster(current);
      if ((reduced.matches || forced.matches) && !manual) finish('ready', 'motion-preference');
      else start();
    }

    video.addEventListener('playing', () => {
      if (!session?.wanted || !available()) { video.pause(); return; }
      if (video.currentSrc !== session.video) return;
      session.started = true; video.classList.add('is-visible');
      device.classList.remove('is-demo-loading');
      if (!session.analysisCued) announce('playing');
    });
    video.addEventListener('timeupdate', cueAnalysis);
    video.addEventListener('ended', () => finish('complete', 'ended'));
    video.addEventListener('canplay', sync);
    video.addEventListener('error', () => {
      if (session?.wanted && video.getAttribute('src')) finish('failed', 'media-error');
    });
    replay.addEventListener('click', () => {
      if (!session) return;
      if (!session.completed) finish('complete', 'skip');
      else {
        prepare(session.screen, true);
        opener.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
      }
    });
    gallery.addEventListener('sudoku:screen', event => {
      const screen = event.detail?.screen || gallery.dataset.screen || 'board';
      if (session?.screen === screen) {
        const current = session;
        if (current.completed) applyPoster(current).then(() => {
          if (session === current) announce(current.state || 'complete', 'metadata');
        });
        else { applyPoster(current); announce(current.state || 'playing', 'metadata'); }
        return;
      }
      prepare(screen);
    });
    gallery.addEventListener('transitionend', event => {
      if (event.target === gallery && event.propertyName === 'opacity') sync();
    });
    gallery.addEventListener('transitioncancel', event => {
      if (event.target === gallery && event.propertyName === 'opacity') sync();
    });
    gallery.addEventListener('focusin', () => queueMicrotask(sync));
    const visibility = new IntersectionObserver(entries => {
      onScreen = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .45);
      sync();
    }, { threshold: [0, .25, .45, .7, 1] });
    visibility.observe(device);
    const modal = new MutationObserver(sync);
    if (viewer) modal.observe(viewer, { attributes: true, attributeFilter: ['open'] });
    const hostObserver = frameHost ? new MutationObserver(sync) : null;
    hostObserver?.observe(frameHost, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('portfolio:video-detail', sync);
    addEventListener('portfolio:language', copy);
    const motion = () => { if ((reduced.matches || forced.matches) && session?.wanted && !session.manual) finish('ready', 'motion-preference'); };
    reduced.addEventListener('change', motion); forced.addEventListener('change', motion);
    addEventListener('pagehide', () => { pageShown = false; video.pause(); visibility.disconnect(); });
    addEventListener('pageshow', () => { pageShown = true; visibility.observe(device); sync(); });
    prepare(gallery.dataset.screen || 'board');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
