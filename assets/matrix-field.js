(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const seed = 200240412;
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const hash = (x, y) => {
    let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };

  let width = 0, height = 0, pitch = 14, mobile = false;
  let dots = [], quiet = [];
  let sprite, dark = true, frame = 0, lastFrame = 0, elapsed = 0;
  let pageShown = true;

  // Fixed positions and a seeded exposure give every bead a stable identity.
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    mobile = width < 620;
    pitch = mobile ? 12 : 14;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots = [];
    const columns = Math.ceil(width / pitch);
    const rows = Math.ceil(height / pitch);
    const offsetX = (width - (columns - 1) * pitch) / 2;
    const offsetY = (height - (rows - 1) * pitch) / 2;
    const unit = Math.min(width, height) * .56;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = offsetX + column * pitch;
        const y = offsetY + row * pitch;
        dots.push({ x, y, nx: (x - width / 2) / unit, ny: (y - height / 2) / unit,
          exposure: .82 + hash(row, column + 83) * .18 });
      }
    }
    updateQuietZones();
    draw(elapsed);
  }

  function beadSprite() {
    dark = document.documentElement.dataset.theme !== 'light';
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const paint = sprite.getContext('2d');
    const color = dark ? '236,233,219' : '64,63,57';
    const halo = paint.createRadialGradient(16, 16, 0, 16, 16, 15);
    halo.addColorStop(0, `rgba(${color},.32)`);
    halo.addColorStop(.24, `rgba(${color},.12)`);
    halo.addColorStop(.6, `rgba(${color},.025)`);
    halo.addColorStop(1, `rgba(${color},0)`);
    paint.fillStyle = halo;
    paint.fillRect(0, 0, 32, 32);
    paint.fillStyle = `rgb(${color})`;
    paint.beginPath();
    paint.arc(16, 16, 3.2, 0, TAU);
    paint.fill();
  }

  function updateQuietZones() {
    // Keep a stable space while the title types and changes width.
    const title = stage.querySelector('.line');
    const titleRect = title.getBoundingClientRect();
    quiet = [{ x: width / 2, y: height / 2,
      halfWidth: Math.max(titleRect.width / 2 + 65, Math.min(width * .43, 310)),
      halfHeight: Math.max(54, titleRect.height / 2 + 38), feather: mobile ? 48 : 100 }];
    if (stage.classList.contains('works')) {
      const menu = document.getElementById('menu').getBoundingClientRect();
      quiet.push({ x: menu.x + menu.width / 2, y: menu.y + menu.height / 2,
        halfWidth: menu.width / 2 + 24, halfHeight: menu.height / 2 + 22, feather: 65 });
    }
    for (const dot of dots) {
      let clear = 1;
      for (const box of quiet) {
        const dx = Math.max(0, Math.abs(dot.x - box.x) - box.halfWidth);
        const dy = Math.max(0, Math.abs(dot.y - box.y) - box.halfHeight);
        clear *= smooth(0, box.feather, Math.hypot(dx, dy));
      }
      dot.clear = clear;
    }
  }

  // Two advecting wave systems bend through one another. Every phase keeps
  // advancing: no held silhouettes, mode changes, or fade-only intervals.
  function flowField(x, y, time) {
    const u = x + .34 * Math.sin(y * 1.8 - time * .35) +
      .22 * Math.sin(x * 1.2 + y * 2.9 + time * .21);
    const v = y + .38 * Math.sin(x * 1.6 + time * .28) +
      .18 * Math.cos(y * 1.9 - x * .8 - time * .25);
    const a = Math.sin(u * 4.1 + v * 1.1 - time * .72);
    const b = Math.sin(v * 4.4 - u * 1.4 + time * .51);
    const c = Math.sin((u + v) * 2.6 + Math.sin(u * 1.7 + time * .24) - time * .33);
    const field = a + .64 * b + .28 * c;
    const ridge = Math.exp(-((field - .1) ** 2) / .09);
    const echo = .3 * Math.exp(-((field + .78) ** 2) / .16);
    const current = .76 + .24 * (.5 + .5 * Math.sin(u * 1.2 - v * .8 + time * .8));
    return Math.max(ridge, echo) * current;
  }

  function draw(time) {
    if (!sprite || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const gain = dark ? .32 : .21;
    const beadSize = mobile ? 12 : 14;
    for (const dot of dots) {
      if (dot.clear < .005) continue;
      const light = flowField(dot.nx, dot.ny, time);
      const alpha = (.004 + gain * light * dot.exposure) * dot.clear;
      if (alpha < .012) continue;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, dot.x - beadSize / 2, dot.y - beadSize / 2, beadSize, beadSize);
    }
    ctx.globalAlpha = 1;
  }

  function visible() {
    return pageShown && !document.hidden && !stage.classList.contains('gone') &&
      !stage.classList.contains('faded') && !forcedColors.matches;
  }

  function tick(now) {
    frame = 0;
    if (!visible() || reduced.matches) return;
    if (!lastFrame || now - lastFrame >= 1000 / 24) {
      if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, .1);
      lastFrame = now;
      draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    if (!visible()) return;
    if (reduced.matches) draw(6);
    else frame = requestAnimationFrame(tick);
  }

  beadSprite();
  resize();
  const layout = new ResizeObserver(() => { updateQuietZones(); if (reduced.matches) draw(6); });
  layout.observe(stage.querySelector('.line'));
  layout.observe(document.getElementById('menu'));
  const state = new MutationObserver(() => { updateQuietZones(); sync(); });
  state.observe(stage, { attributes: true, attributeFilter: ['class'] });
  const theme = new MutationObserver(() => { beadSprite(); draw(reduced.matches ? 6 : elapsed); });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  forcedColors.addEventListener('change', sync);
  addEventListener('pagehide', () => { pageShown = false; sync(); });
  addEventListener('pageshow', () => { pageShown = true; sync(); });
  sync();
})();
