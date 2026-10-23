(() => {
  'use strict';

  function init() {
    const gallery = document.getElementById('identity-gallery');
    const resume = document.getElementById('resume');
    if (!gallery || !resume || gallery.dataset.identityReady) return;
    const grid = gallery.querySelector('.identity-grid') || gallery;
    const cards = Array.from(gallery.querySelectorAll('[data-identity-card],.identity-card'))
      .filter(card => card.tagName === 'BUTTON');
    if (!cards.length) return;
    gallery.dataset.identityReady = 'true';
    const hint = gallery.querySelector('[data-identity-hint]');
    const arrange = gallery.querySelector('[data-identity-arrange]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const jobs = new Map();
    let active = false, mode = 'assembled', measureFrame = 0;
    let audioContext = null, soundToken = 0;
    const voices = new Set();

    function language() {
      return (window.PortfolioI18n?.language || document.documentElement.dataset.language || document.documentElement.lang).startsWith('en') ? 'en' : 'zh';
    }

    function updateLanguage() {
      const en = language() === 'en';
      gallery.setAttribute('aria-label', en ? 'Interactive portraits' : '互动肖像');
      if (hint) hint.textContent = en ? 'Click. Snap.' : '点一下，咔嚓。';
      cards.forEach((card, index) => {
        const label = en ? card.dataset.identityLabelEn : card.dataset.identityLabelZh;
        card.setAttribute('aria-label', label || (en
          ? `Portrait ${index + 1}: toggle pixel and original photo`
          : `肖像 ${index + 1}：切换像素与原照片`));
      });
      if (arrange) {
        arrange.textContent = mode === 'assembled' ? (en ? 'Spread ↗' : '展开 ↗') : (en ? 'Gather ↙' : '收拢 ↙');
        arrange.setAttribute('aria-expanded', String(mode !== 'assembled'));
      }
    }

    function cancel(name) {
      const job = jobs.get(name);
      if (job) clearTimeout(job.handle);
      jobs.delete(name);
    }
    function arm(name, job) {
      if (document.hidden) return;
      job.due = performance.now() + job.remaining;
      job.handle = setTimeout(() => {
        jobs.delete(name);
        job.fn();
      }, job.remaining);
    }
    function schedule(name, fn, delay) {
      cancel(name);
      const job = { fn, remaining: delay, due: 0, handle: 0 };
      jobs.set(name, job);
      arm(name, job);
    }
    function pauseJobs() {
      const now = performance.now();
      jobs.forEach(job => {
        if (!job.handle) return;
        clearTimeout(job.handle);
        job.handle = 0;
        job.remaining = Math.max(0, job.due - now);
      });
    }
    function resumeJobs() {
      jobs.forEach((job, name) => { if (!job.handle) arm(name, job); });
    }
    function clearJobs() { Array.from(jobs.keys()).forEach(cancel); }

    function visibleCards() {
      return cards.filter(card => getComputedStyle(card).display !== 'none' && card.offsetWidth > 0 && card.offsetHeight > 0);
    }
    function updateAccess() {
      const visible = visibleCards();
      cards.forEach(card => {
        const shown = active && visible.includes(card) && (mode !== 'assembled' || card === visible[0]);
        card.tabIndex = shown ? 0 : -1;
        card.inert = !shown;
        card.setAttribute('aria-hidden', String(!shown));
      });
      if (arrange) arrange.disabled = !active;
    }
    function layoutPosition(element) {
      let x = 0, y = 0;
      for (let node = element; node; node = node.offsetParent) { x += node.offsetLeft; y += node.offsetTop; }
      return { x, y };
    }
    function measure() {
      if (!active || document.hidden) return;
      const visible = visibleCards();
      if (!visible.length) return;
      const origin = layoutPosition(grid);
      const anchorX = grid.clientWidth / 2;
      const anchorY = visible[0].offsetHeight / 2;
      visible.forEach((card, index) => {
        const position = layoutPosition(card);
        card.style.setProperty('--index', String(index));
        card.style.setProperty('--card-x', `${(anchorX - (position.x - origin.x + card.offsetWidth / 2)).toFixed(2)}px`);
        card.style.setProperty('--card-y', `${(anchorY - (position.y - origin.y + card.offsetHeight / 2)).toFixed(2)}px`);
      });
      updateAccess();
    }
    function queueMeasure() {
      if (!active || document.hidden || measureFrame) return;
      measureFrame = requestAnimationFrame(() => { measureFrame = 0; measure(); });
    }
    function setMode(next) {
      mode = next;
      gallery.classList.remove('assembled', 'spreading', 'spread');
      gallery.classList.add(next);
      updateAccess();
      updateLanguage();
    }
    function spread() {
      if (!active) return;
      cancel('auto-spread');
      cancel('spread-complete');
      measure();
      if (reduced.matches) { setMode('spread'); return; }
      void grid.offsetWidth;
      setMode('spreading');
      schedule('spread-complete', () => { if (active) setMode('spread'); }, 1100);
    }
    function assemble() {
      cancel('auto-spread');
      cancel('spread-complete');
      measure();
      setMode('assembled');
    }
    function stopAudio() {
      soundToken++;
      voices.forEach(source => { try { source.stop(); } catch (_) {} });
      voices.clear();
      if (audioContext?.state === 'running') audioContext.suspend().catch(() => {});
    }
    async function shutter(event) {
      if (!event.isTrusted || !active || document.hidden) return;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const token = ++soundToken;
      try {
        audioContext ||= new Context();
        await audioContext.resume();
        if (token !== soundToken || !active || document.hidden) return;
        const length = Math.ceil(audioContext.sampleRate * 0.065);
        const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
        const samples = buffer.getChannelData(0);
        let seed = 137;
        for (let i = 0; i < length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const t = i / audioContext.sampleRate;
          const envelope = Math.exp(-t * 155) + (t >= 0.026 ? 0.55 * Math.exp(-(t - 0.026) * 220) : 0);
          samples[i] = (seed / 2147483648 - 1) * envelope;
        }
        const source = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const gain = audioContext.createGain();
        filter.type = 'highpass'; filter.frequency.value = 850;
        gain.gain.value = 0.035;
        source.buffer = buffer;
        source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination);
        voices.add(source);
        source.onended = () => {
          voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect();
          if (!voices.size && audioContext.state === 'running') audioContext.suspend().catch(() => {});
        };
        source.start();
      } catch (_) {}
    }
    function resetViews() {
      cards.forEach(card => {
        card.classList.remove('is-photo', 'is-flashing');
        card.setAttribute('aria-pressed', 'false');
      });
    }
    function syncActive() {
      const next = resume.classList.contains('live');
      if (next === active) return;
      active = next;
      clearJobs(); stopAudio(); resetViews();
      if (measureFrame) { cancelAnimationFrame(measureFrame); measureFrame = 0; }
      setMode('assembled');
      if (!active) return;
      measure(); queueMeasure();
      if (reduced.matches) setMode('spread');
      else schedule('auto-spread', spread, 900);
    }

    cards.forEach((card, index) => {
      card.addEventListener('click', event => {
        if (!active || card.inert || document.hidden) return;
        const photo = card.getAttribute('aria-pressed') !== 'true';
        card.setAttribute('aria-pressed', String(photo));
        card.classList.toggle('is-photo', photo);
        card.classList.remove('is-flashing');
        void card.offsetWidth;
        card.classList.add('is-flashing');
        schedule(`flash-${index}`, () => card.classList.remove('is-flashing'), reduced.matches ? 60 : 100);
        shutter(event);
      });
    });
    arrange?.addEventListener('click', () => {
      if (!active) return;
      mode === 'assembled' ? spread() : assemble();
      gallery.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
    });
    new MutationObserver(syncActive).observe(resume, { attributes: true, attributeFilter: ['class'] });
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(queueMeasure);
      resizeObserver.observe(grid); resizeObserver.observe(cards[0]);
    }
    addEventListener('resize', queueMeasure, { passive: true });
    addEventListener('portfolio:language', updateLanguage);
    document.fonts?.ready.then(queueMeasure).catch(() => {});
    reduced.addEventListener('change', () => {
      if (!active || !reduced.matches) return;
      cancel('auto-spread'); cancel('spread-complete');
      setMode('spread'); queueMeasure();
    });
    document.addEventListener('visibilitychange', () => {
      gallery.classList.toggle('is-paused', document.hidden);
      if (document.hidden) {
        pauseJobs(); stopAudio();
        cards.forEach((card, index) => { cancel(`flash-${index}`); card.classList.remove('is-flashing'); });
        if (measureFrame) { cancelAnimationFrame(measureFrame); measureFrame = 0; }
      } else if (active) { measure(); resumeJobs(); }
    });
    addEventListener('pagehide', () => { pauseJobs(); stopAudio(); });
    addEventListener('pageshow', () => { syncActive(); if (active) { queueMeasure(); resumeJobs(); } });
    window.PortfolioIdentityCards = Object.freeze({ spread, assemble, refresh: queueMeasure, get state() { return mode; } });
    resetViews(); setMode('assembled'); syncActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
