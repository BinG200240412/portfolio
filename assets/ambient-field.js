/* A quiet light field shared by the shell and embedded/standalone cases.
 * Each LED is a flat circle; broad, warped waves change whole-dot brightness.
 */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const about = document.getElementById('resume');
  const section = document.getElementById('section');
  let parentSection = null;
  try { parentSection = window.frameElement?.closest('#section') || null; } catch (_) {}
  if (!stage) {
    document.body.classList.add('ambient-document');
    if (!document.getElementById('ambient-page')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'ambient-page';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('data-i18n-ignore', '');
      document.body.prepend(canvas);
    }
  }
  const targets = ['page', 'stage'].map(name => {
    const canvas = document.getElementById(`ambient-${name}`);
    const context = canvas?.getContext('2d', { alpha: true });
    return context ? { name, canvas, context, width: 0, height: 0, dots: [] } : null;
  }).filter(Boolean);
  if (!targets.length) return;

  const CONFIG = Object.freeze({ fps: 20, spacing: 14, maxDots: 22000, radius: .95,
    darkAlpha: .25, lightAlpha: .21, levels: 14 });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const buckets = Array.from({ length: CONFIG.levels }, () => []);
  let frame = 0, lastPaint = 0, elapsed = 0, pageShown = true, onScreen = true, active = null;
  let dark = document.documentElement.dataset.theme !== 'light';
  let pointer = { x: -1000, y: -1000, live: false };
  const smooth = (low, high, value) => {
    const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  function clear(target) {
    target.context.clearRect(0, 0, target.width, target.height);
    target.canvas.hidden = true;
    target.canvas.dataset.ambientState = 'paused';
  }
  function mode() {
    if (!pageShown || document.hidden || !onScreen || forced.matches) return null;
    if (parentSection && !parentSection.classList.contains('on')) return null;
    if (!stage) return 'page';
    if (section?.classList.contains('on')) return null;
    if (about?.classList.contains('live')) return 'page';
    return stage.classList.contains('gone') || stage.classList.contains('faded') ? null : 'stage';
  }
  function paint(target, time, still = false) {
    const { context: ctx, width: w, height: h } = target;
    if (!w || !h) return;
    target.canvas.hidden = false;
    target.canvas.dataset.ambientState = still ? 'static' : 'running';
    ctx.clearRect(0, 0, w, h);
    for (const bucket of buckets) bucket.length = 0;
    const scale = Math.min(w, h);
    for (const dot of target.dots) {
      const { x, y, u, v } = dot;
      // Domain warping makes bright regions join and separate organically.
      // No sprites, per-dot gradients, random blinking or image textures.
      const a = Math.sin(u * 6.4 + Math.sin(v * 5.1 - time * .13) * 1.7 + time * .23);
      const b = Math.cos(v * 8.2 + Math.sin(u * 4.8 + time * .17) * 1.9 - time * .19);
      const c = Math.sin((u - v) * 13.2 + time * .16);
      let light = smooth(.20, .94, .48 + a * .24 + b * .22 + c * .11);
      if (pointer.live && !still) {
        const distance = Math.hypot(x - pointer.x, y - pointer.y) / Math.max(150, scale * .22);
        light = Math.min(1, light + Math.max(0, 1 - distance) ** 2 * .18);
      }
      const level = Math.round(light * (CONFIG.levels - 1));
      if (level) buckets[level].push(dot);
    }
    ctx.fillStyle = dark ? 'rgb(190,193,181)' : 'rgb(77,91,80)';
    const maxAlpha = dark ? CONFIG.darkAlpha : CONFIG.lightAlpha;
    for (let level = 1; level < buckets.length; level++) {
      if (!buckets[level].length) continue;
      ctx.globalAlpha = maxAlpha * level / (CONFIG.levels - 1);
      ctx.beginPath();
      for (const dot of buckets[level]) {
        ctx.moveTo(dot.x + CONFIG.radius, dot.y);
        ctx.arc(dot.x, dot.y, CONFIG.radius, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function choose() {
    const next = targets.find(target => target.name === mode()) || null;
    if (next !== active) {
      for (const target of targets) clear(target);
      active = next;
    }
    return active;
  }
  function tick(now) {
    frame = 0;
    if (!choose() || reduced.matches) return;
    if (!lastPaint || now - lastPaint >= 1000 / CONFIG.fps) {
      if (lastPaint) elapsed += Math.min(.2, (now - lastPaint) / 1000);
      lastPaint = now;
      paint(active, elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastPaint = 0;
    if (!choose()) { for (const target of targets) clear(target); return; }
    paint(active, reduced.matches ? 14 : elapsed, reduced.matches);
    if (!reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    for (const target of targets) {
      const w = target.width = target.name === 'stage' ? stage.clientWidth : innerWidth;
      const h = target.height = target.name === 'stage' ? stage.clientHeight : innerHeight;
      target.canvas.width = Math.max(1, Math.round(w * ratio));
      target.canvas.height = Math.max(1, Math.round(h * ratio));
      target.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const spacing = Math.max(CONFIG.spacing, Math.ceil(Math.sqrt(w * h / CONFIG.maxDots)));
      target.dots = [];
      for (let y = spacing / 2; y < h; y += spacing) {
        for (let x = spacing / 2; x < w; x += spacing) {
          target.dots.push({ x, y, u: x / Math.min(w, h), v: y / Math.min(w, h) });
        }
      }
      target.canvas.dataset.ambientDots = String(target.dots.length);
    }
    sync();
  }
  const states = new MutationObserver(sync);
  for (const element of [stage, about, section]) if (element)
    states.observe(element, { attributes: true, attributeFilter: ['class'] });
  if(parentSection){
    const parentStates=new MutationObserver(sync);
    parentStates.observe(parentSection,{attributes:true,attributeFilter:['class']});
    window.PortfolioLifecycle?.trackParent(parentStates,parentSection,{attributes:true,attributeFilter:['class']});
  }
  new MutationObserver(() => { dark = document.documentElement.dataset.theme !== 'light'; sync(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (stage) new ResizeObserver(resize).observe(stage);
  // Embedded cases stop rendering while their parent frame is hidden.
  if (!stage && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      onScreen = entries.some(entry => entry.isIntersecting); sync();
    }).observe(document.documentElement);
  }
  addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY, live: event.pointerType !== 'touch' };
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.live = false; });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); forced.addEventListener('change', sync);
  addEventListener('pagehide', () => { pageShown = false; sync(); });
  addEventListener('pageshow', () => { pageShown = true; sync(); });
  window.PortfolioAmbient = Object.freeze({ config: CONFIG, status: () => ({
    active: active?.name || null, dots: active?.dots.length || 0,
    elapsed, animating: !!frame, reduced: reduced.matches, theme: dark ? 'dark' : 'light',
  }) });
  resize();
})();
