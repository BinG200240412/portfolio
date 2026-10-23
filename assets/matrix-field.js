(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const cycleSeconds = 16;
  const seed = 200240412;
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const stroke = (distance, width = .055) => Math.exp(-(distance * distance) / (width * width));
  const hash = (x, y) => {
    let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };

  let width = 0, height = 0, pitch = 14, mobile = false;
  let dots = [], slots = [], quiet = [];
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
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        dots.push({ x: offsetX + column * pitch, y: offsetY + row * pitch,
          phase: hash(column, row) * TAU, exposure: .76 + hash(row, column + 83) * .24 });
      }
    }
    const scale = Math.min(width * (mobile ? .64 : .29), height * (mobile ? .29 : .45));
    slots = mobile
      ? [{ x: width * .24, y: height * .19, scale }, { x: width * .84, y: height * .85, scale: scale * .88 }]
      : [{ x: width * .18, y: height * .25, scale }, { x: width * .83, y: height * .76, scale: scale * .94 }];
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

  // Original distance fields, sampled only at fixed matrix coordinates.
  function pattern(kind, x, y, time) {
    const r = Math.hypot(x, y);
    if (kind === 0) {
      // A globe made from three intersecting dotted hoops.
      return Math.max(stroke(r - .78),
        stroke(Math.hypot(x * 2.3, y) - .78) * .72,
        stroke(Math.hypot(x, y * 2.3) - .78) * .72);
    }
    if (kind === 1) {
      // Staggered square shells, with a slow breathing gap.
      const d = Math.max(Math.abs(x), Math.abs(y));
      const offset = .018 * Math.sin(time * .24);
      return Math.max(stroke(d - .32 - offset, .045),
        stroke(Math.max(Math.abs(x + .075), Math.abs(y - .075)) - .57, .045) * .8,
        stroke(d - .83 + offset, .045) * .65);
    }
    if (kind === 2) {
      // A six-lobed mechanical bloom and its small, hollow centre.
      const angle = Math.atan2(y, x);
      const edge = .59 + .18 * Math.cos(angle * 6 + .12 * Math.sin(time * .17));
      return Math.max(stroke(r - edge, .065), stroke(r - .19, .045) * .7);
    }
    // Broad wave ribbons inside a diamond-shaped aperture.
    const wave = y + Math.sin(x * 3.4 + time * .13) * .2;
    const envelope = 1 - smooth(.76, 1.06, Math.abs(x) + Math.abs(y) * .7);
    return Math.max(stroke(wave + .38, .065), stroke(wave, .065) * .8,
      stroke(wave - .38, .065) * .65) * envelope;
  }

  function draw(time) {
    if (!sprite || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const cycle = time / cycleSeconds;
    const current = Math.floor(cycle) % 4;
    const blend = smooth(.66, 1, cycle % 1);
    const next = (current + 1) % 4;
    const gain = dark ? .34 : .22;
    const beadSize = mobile ? 12 : 14;
    const breathe = .81 + .19 * Math.sin(time * .29) ** 2;
    for (const dot of dots) {
      if (dot.clear < .005) continue;
      let light = 0;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const x = (dot.x - slot.x) / slot.scale;
        const y = (dot.y - slot.y) / slot.scale;
        if (Math.abs(x) > 1.12 || Math.abs(y) > 1.12) continue;
        const a = pattern((current + i * 2) % 4, x, y, time);
        const b = blend > 0 ? pattern((next + i * 2) % 4, x, y, time) : 0;
        light = Math.max(light, a * (1 - blend) + b * blend);
      }
      const shimmer = .82 + .18 * Math.sin(time * .63 + dot.phase);
      const grid = dark ? .018 : .014;
      const alpha = (grid + gain * light * dot.exposure * shimmer * breathe) * dot.clear;
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
