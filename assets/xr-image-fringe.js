/* One coherent, edge-sampled LED shadow behind the hinged cover. */
(() => {
  'use strict';
  const forced = matchMedia('(forced-colors: active)');
  const entries = [];
  const TAU = Math.PI * 2;
  let pending = 0, shown = true, host = null;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const smooth = n => n * n * (3 - 2 * n);
  const hash = (x, y, seed) => {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967295;
  };
  function noise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), tx = smooth(x - ix), ty = smooth(y - iy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  }
  function colour(value) {
    const parts = value.match(/[\d.]+/g)?.map(Number);
    return parts && parts.length >= 3 ? parts : [17, 17, 16, 1];
  }
  function geometry(image, button) {
    const leaf = button.closest('.gogo-cover-leaf');
    const scene = button.closest('.gogo-hero-photo').getBoundingClientRect();
    // Layout dimensions remain stable while the leaf is rotating in 3D.
    const box = { width: image.clientWidth, height: image.clientHeight };
    const fit = getComputedStyle(image).objectFit;
    let width = box.width, height = box.height;
    let x = leaf.offsetLeft + button.offsetLeft + image.offsetLeft;
    let y = leaf.offsetTop + button.offsetTop + image.offsetTop;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (fit === 'contain') {
      const scale = Math.min(width / sw, height / sh), w = sw * scale, h = sh * scale;
      // The hero uses right alignment; other artwork is centred.
      x += (width - w) * (getComputedStyle(image).objectPosition.startsWith('100%') ? 1 : .5);
      y += (height - h) * .5; width = w; height = h;
    } else if (fit === 'cover') {
      const scale = Math.max(width / sw, height / sh);
      const cropW = width / scale, cropH = height / scale;
      sx = (sw - cropW) / 2; sy = (sh - cropH) / 2; sw = cropW; sh = cropH;
    }
    const desired = clamp(Math.min(width, height) * .13, 32, 90);
    // The right hinge is flush with the screen; its shadow ends on that edge.
    const bleed = Math.max(0, Math.floor(Math.min(desired, scene.left + x - 8)));
    return { width, height, x, y, sx, sy, sw, sh, bleed };
  }
  function sample(entry, g) {
    const key = [entry.image.currentSrc, g.sx, g.sy, g.sw, g.sh].join(':');
    if (entry.sample?.key === key) return entry.sample;
    const scale = Math.min(1, 420 / Math.max(g.width, g.height));
    const width = Math.max(1, Math.ceil(g.width * scale));
    const height = Math.max(1, Math.ceil(g.height * scale));
    const scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const matte = getComputedStyle(entry.image).backgroundColor;
    if (colour(matte)[3] !== 0) { ctx.fillStyle = matte; ctx.fillRect(0, 0, width, height); }
    ctx.drawImage(entry.image, g.sx, g.sy, g.sw, g.sh, 0, 0, width, height);
    entry.sample = { key, width, height, data: ctx.getImageData(0, 0, width, height).data };
    return entry.sample;
  }
  function clear(entry) {
    entry.canvas.width = entry.canvas.height = 1;
    Object.assign(entry.canvas.style, { width: '0px', height: '0px', left: '0px', top: '0px' });
    entry.canvas.dataset.fringeState = 'idle';
    entry.dirty = true;
  }
  function paint(entry) {
    const { image, button, canvas } = entry;
    if (!image.complete || !image.naturalWidth || !image.clientWidth) return;
    const g = geometry(image, button);
    if (g.width < 2 || g.height < 2 || g.bleed < 4) return;
    let pixels;
    try { pixels = sample(entry, g); } catch (_) {
      // A future cross-origin image retains its original rendering.
      entry.blocked = true; button.classList.remove('gogo-pixel-framed'); clear(entry); return;
    }
    if (!pixels) return;
    const { width: w, height: h, bleed } = g;
    const ratio = Math.min(devicePixelRatio || 1, 1.5, 4096 / (w + bleed), 4096 / (h + bleed * 2));
    canvas.width = Math.ceil((w + bleed) * ratio);
    canvas.height = Math.ceil((h + bleed * 2) * ratio);
    Object.assign(canvas.style, { width: `${w + bleed}px`, height: `${h + bleed * 2}px`,
      left: `${g.x - bleed}px`, top: `${g.y - bleed}px` });
    entry.figure.style.setProperty('--gogo-fringe-bleed', `${bleed}px`);
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, bleed * ratio, bleed * ratio);
    const bg = colour(getComputedStyle(document.body).backgroundColor);
    const pitch = innerWidth <= 720 ? 4 : 5.5, radius = pitch * .37;
    const seed = entry.seed;
    function dot(x, y, col, row) {
      const corner = Math.min(26, w / 2, h / 2);
      const qx = Math.abs(x - w / 2) - (w / 2 - corner);
      const qy = Math.abs(y - h / 2) - (h / 2 - corner);
      const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
        + Math.min(Math.max(qx, qy), 0) - corner;
      if (distance <= 0 || distance > bleed) return;
      const tide = noise(x / 220, y / 220, seed) * .7 + noise(x / 480, y / 480, seed + 17) * .3;
      const wave = .5 + .5 * Math.sin(x / 140 + y / 190 + (seed >>> 0) / 1e8);
      // A single joined silhouette, with smaller stepped inlets along its edge.
      const inlet = noise(x / 42, y / 42, seed + 37);
      const reach = pitch * Math.round(bleed * (.34 + .44 * (tide * .55 + wave * .45) + .22 * inlet) / pitch);
      const t = distance / reach;
      if (t >= 1) return;
      // Continue the neighbouring colour outwards; never invent a gold/grey frame.
      const u = clamp(x / w, 0, 1), v = clamp(y / h, 0, 1);
      const px = Math.round(u * (pixels.width - 1)), py = Math.round(v * (pixels.height - 1));
      const at = (py * pixels.width + px) * 4;
      if (pixels.data[at + 3] < 80) return;
      // Whole-dot colour terraces form two broad ripples; no random dropout.
      const band = Math.round(t * 10) / 10;
      const strength = Math.pow(1 - band, 1.12) * (.84 + .16 * Math.cos(band * TAU * 2));
      const mix = 1 - strength * .76;
      const rgb = [0, 1, 2].map(k => Math.round(pixels.data[at + k] * (1 - mix) + bg[k] * mix));
      ctx.fillStyle = `rgb(${rgb.join(',')})`;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    }
    // Only iterate the border strips, never every pixel of the full photograph.
    for (let row = Math.floor(-bleed / pitch); row <= Math.ceil((h + bleed) / pitch); row++) {
      const y = (row + .5) * pitch;
      if (y < 26 || y > h - 26) {
        for (let col = Math.floor(-bleed / pitch); col <= Math.ceil((w + bleed) / pitch); col++) dot((col + .5) * pitch, y, col, row);
      } else {
        for (let col = Math.floor(-bleed / pitch); col < 0; col++) dot((col + .5) * pitch, y, col, row);
        for (let col = Math.floor(w / pitch); col <= Math.ceil((w + bleed) / pitch); col++) dot((col + .5) * pitch, y, col, row);
      }
    }
    entry.dirty = false; canvas.dataset.fringeState = 'ready';
    entry.figure.dispatchEvent(new Event('gogo:cover-shadow-ready'));
  }
  function active() {
    return shown && !document.hidden && !forced.matches && (!host || host.classList.contains('on'));
  }
  function flush() {
    pending = 0;
    if (!active()) { entries.forEach(clear); return; }
    entries.forEach(entry => { if (entry.visible && entry.dirty && !entry.blocked) paint(entry); });
  }
  function queue() { if (!pending) pending = requestAnimationFrame(flush); }
  function refresh() { entries.forEach(entry => { entry.dirty = true; }); queue(); }
  const observer = new IntersectionObserver(changes => {
    changes.forEach(change => {
      const entry = entries.find(item => item.button === change.target);
      if (!entry) return;
      entry.visible = change.isIntersecting;
      if (!entry.visible) clear(entry);
    });
    queue();
  }, { rootMargin: '250px' });
  const resize = new ResizeObserver(changes => {
    changes.forEach(change => {
      const entry = entries.find(item => item.image === change.target);
      if (entry) entry.dirty = true;
    });
    queue();
  });
  document.querySelectorAll('.gogo-hero-photo .gogo-zoom').forEach(button => {
    const image = button.querySelector('img'), figure = button.closest('.gogo-figure');
    if (!image || !figure) return;
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('2d')) return;
    canvas.className = 'gogo-image-fringe'; canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('data-i18n-ignore', ''); canvas.width = canvas.height = 1;
    let seed = 2166136261;
    for (const letter of image.getAttribute('src').split('?')[0]) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
    const entry = { image, button, figure, canvas, seed, visible: false, dirty: true, sample: null, blocked: false };
    entries.push(entry); button.classList.add('gogo-pixel-framed'); figure.prepend(canvas);
    image.addEventListener('load', () => {
      entry.sample = null; entry.dirty = true; entry.blocked = false;
      button.classList.add('gogo-pixel-framed'); queue();
    });
    image.addEventListener('error', () => { entry.blocked = true; clear(entry); });
    observer.observe(button); resize.observe(image);
  });
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (host) new MutationObserver(refresh).observe(host, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', refresh);
  addEventListener('resize', refresh, { passive: true });
  forced.addEventListener('change', refresh);
  addEventListener('pagehide', () => { shown = false; if (pending) cancelAnimationFrame(pending); pending = 0; entries.forEach(clear); });
  addEventListener('pageshow', () => { shown = true; refresh(); });
  queue();
})();
