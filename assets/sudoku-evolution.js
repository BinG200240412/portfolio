/* Chronological native horizontal scroll, with optional slow playback.
   No wheel/touch cancellation and no page scroll interception. */
(() => {
  'use strict';
  function init() {
    const root = document.querySelector('[data-iteration-gallery]');
    if (!root) return;
    const rail = root.querySelector('.iteration-rail');
    const stages = [...root.querySelectorAll('[data-iteration-stage]')];
    const steps = [...root.querySelectorAll('[data-iteration-step]')];
    const notes = [...root.querySelectorAll('[data-iteration-note]')];
    const prev = root.querySelector('[data-iteration-prev]');
    const next = root.querySelector('[data-iteration-next]');
    const play = root.querySelector('[data-iteration-play]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let stops = [], active = -1, frame = 0, last = 0, visible = false;
    let paused = false, modal = false, shown = true, host = null, controlState = '';
    try { host = window.frameElement?.closest('#section'); } catch (_) {}
    const english = () => window.PortfolioI18n?.language === 'en';
    const end = () => rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
    function controls() {
      const en = english();
      const staticMode = reduced.matches;
      const key = [en, staticMode, paused, end(), active].join(':');
      if (key === controlState) return;
      controlState = key;
      const label = staticMode ? (en ? 'Static' : '静态') : end() ? (en ? 'Replay' : '重播') :
        paused ? (en ? 'Play' : '播放') : (en ? 'Pause' : '暂停');
      play.textContent = label;
      play.disabled = staticMode;
      play.setAttribute('aria-pressed', String(paused || staticMode || end()));
      play.setAttribute('aria-label', en ? `${label} timeline` : `${label}迭代展示`);
      prev.setAttribute('aria-label', en ? 'Previous stage' : '上一阶段');
      next.setAttribute('aria-label', en ? 'Next stage' : '下一阶段');
      prev.disabled = active <= 0;
      next.disabled = active >= stages.length - 1;
    }
    function select(index) {
      if (index !== active) {
        active = index;
        root.dataset.iterationActive = String(index);
        steps.forEach((step, i) => {
          if (i === index) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
          stages[i].dataset.current = String(i === index);
          notes[i].hidden = i !== index;
        });
      }
      controls();
    }
    function update() {
      const x = rail.scrollLeft;
      let closest = 0;
      stops.forEach((point, i) => { if (Math.abs(x - point) < Math.abs(x - stops[closest])) closest = i; });
      select(closest);
    }
    function measure() {
      const bounds = rail.getBoundingClientRect();
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      stops = stages.map(stage => {
        const box = stage.getBoundingClientRect();
        return Math.max(0, Math.min(max, box.left - bounds.left + rail.scrollLeft + box.width / 2 - rail.clientWidth / 2));
      });
      update();
    }
    function canPlay() {
      return visible && shown && !document.hidden && !paused && !modal && !reduced.matches &&
        !root.querySelector('.iteration-note:not([hidden]) .iteration-record[open]') && !rail.contains(document.activeElement) &&
        (!host || host.classList.contains('on')) && !end();
    }
    function tick(now) {
      frame = 0;
      if (!canPlay()) { last = 0; root.dataset.iterationMotion = 'paused'; return; }
      root.dataset.iterationMotion = 'running';
      if (last) rail.scrollLeft += Math.min(now - last, 50) * .026;
      last = now;
      update();
      if (canPlay()) frame = requestAnimationFrame(tick);
      else { last = 0; controls(); }
    }
    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; last = 0;
      root.dataset.iterationMotion = canPlay() ? 'running' : 'paused';
      if (canPlay()) frame = requestAnimationFrame(tick);
      controls();
    }
    function hold() { paused = true; sync(); }
    function go(index) {
      hold();
      const target = Math.max(0, Math.min(stages.length - 1, index));
      rail.scrollTo({left:stops[target], behavior:reduced.matches ? 'instant' : 'smooth'});
    }
    steps.forEach((step, i) => step.addEventListener('click', () => go(i)));
    prev.addEventListener('click', () => go(active - 1));
    next.addEventListener('click', () => go(active + 1));
    play.addEventListener('click', () => {
      if (end()) { rail.scrollTo({left:0, behavior:'instant'}); paused = false; update(); }
      else paused = !paused;
      sync();
    });
    rail.addEventListener('scroll', update, {passive:true});
    rail.addEventListener('wheel', hold, {passive:true});
    rail.addEventListener('pointerdown', hold, {passive:true});
    rail.addEventListener('keydown', hold);
    rail.addEventListener('focusin', sync);
    rail.addEventListener('focusout', () => requestAnimationFrame(sync));
    root.querySelectorAll('.iteration-record').forEach(detail => detail.addEventListener('toggle', sync));
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting && entries[0].intersectionRatio > .35; sync(); }, {threshold:[0,.35,1]});
    observer.observe(rail);
    const resize = new ResizeObserver(measure); resize.observe(rail);
    new MutationObserver(() => {
      modal = Boolean(document.querySelector('dialog[open]'));
      sync();
    }).observe(document.getElementById('media-viewer'), {attributes:true,attributeFilter:['open']});
    if(host){const parentObserver=new MutationObserver(sync);parentObserver.observe(host,{attributes:true,attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,host,{attributes:true,attributeFilter:['class']});}
    addEventListener('portfolio:language', () => { measure(); controls(); });
    document.addEventListener('visibilitychange', sync);
    addEventListener('pagehide', () => { shown = false; sync(); });
    addEventListener('pageshow', () => { shown = true; sync(); });
    reduced.addEventListener('change', sync);
    document.fonts?.ready.then(measure);
    measure(); sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
