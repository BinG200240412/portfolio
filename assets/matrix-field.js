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

  let width = 0, height = 0, pitch = 6, mobile = false;
  let dots = [], quiet = [];
  let sprite, dark = true, frame = 0, lastFrame = 0, elapsed = 0;
  let art = {}, mask = null;
  const maskWidth = 264, maskHeight = 352;
  let pageShown = true;

  // The artwork moves through a fixed lattice. Individual beads stay in place.
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    mobile = width < 700 || (width < 1000 && height > width);
    const artWidth = mobile
      ? Math.max(72, Math.min(240, width * .64, (height / 2 - 108) * .75))
      : Math.max(120, Math.min(420, height * .74 * .75, width / 2 - 252));
    art = { width: artWidth, height: artWidth * 4 / 3 };
    art.x = mobile ? (width - art.width) / 2 : (width / 2 - 212 - art.width) / 2;
    art.y = mobile ? Math.max(24, (height / 2 - 84 - art.height) / 2) : (height - art.height) / 2;
    pitch = Math.max(mobile ? 2.8 : 3.8, art.width / (mobile ? 66 : 74));
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
        const u = (x - art.x) / art.width, v = (y - art.y) / art.height;
        const artCell = u > -.055 && u < 1.055 && v > -.055 && v < 1.055;
        // The distant field shares the same grid, with more space between beads.
        if (!artCell && (row % 3 || column % 3)) continue;
        dots.push({ x, y, nx: (x - width / 2) / unit, ny: (y - height / 2) / unit,
          u, v, artCell, exposure: .92 + hash(row, column + 83) * .08 });
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
    halo.addColorStop(0, `rgba(${color},.3)`);
    halo.addColorStop(.32, `rgba(${color},.1)`);
    halo.addColorStop(.7, `rgba(${color},.012)`);
    halo.addColorStop(1, `rgba(${color},0)`);
    paint.fillStyle = halo;
    paint.fillRect(0, 0, 32, 32);
    const core = paint.createRadialGradient(14.6, 14.4, .5, 16, 16, 6.8);
    core.addColorStop(0, dark ? '#fffef6' : '#78756a');
    core.addColorStop(.45, `rgb(${color})`);
    core.addColorStop(1, dark ? '#aba99d' : '#302f2a');
    paint.fillStyle = core;
    paint.beginPath();
    paint.arc(16, 16, 6.8, 0, TAU);
    paint.fill();
  }

  function updateQuietZones() {
    // Keep a stable space while the title types and changes width.
    const title = stage.querySelector('.line');
    const titleRect = title.getBoundingClientRect();
    quiet = [{ x: width / 2, y: height / 2,
      halfWidth: Math.max(titleRect.width / 2 + 34, Math.min(width * .43, 192)),
      halfHeight: Math.max(48, titleRect.height / 2 + 30), feather: mobile ? 38 : 58 }];
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

  function sampleArt(u, v) {
    if (!mask || u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const x = u * (maskWidth - 1), y = v * (maskHeight - 1);
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const right = Math.min(ix + 1, maskWidth - 1), bottom = Math.min(iy + 1, maskHeight - 1);
    const a = mask[iy * maskWidth + ix] * (1 - fx) + mask[iy * maskWidth + right] * fx;
    const b = mask[bottom * maskWidth + ix] * (1 - fx) + mask[bottom * maskWidth + right] * fx;
    return (a * (1 - fy) + b * fy) / 255;
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
    const gain = dark ? .58 : .43;
    const driftX = .015 * Math.sin(time * .28), driftY = .018 * Math.sin(time * .22 + .6);
    for (const dot of dots) {
      if (dot.clear < .005) continue;
      const field = flowField(dot.nx, dot.ny, time);
      let coverage = 0, light = field;
      if (dot.artCell) {
        // A sub-cell warp and travelling light bands keep the silhouette alive.
        const u = dot.u - driftX + .005 * Math.sin(dot.v * 9 - time * .7);
        const v = dot.v - driftY + .003 * Math.sin(dot.u * 8 + time * .6);
        coverage = sampleArt(u, v);
        const band = .5 + .5 * Math.sin(dot.v * 12 - dot.u * 6 - time * 1.35 + 1.8 * field);
        light = .36 + .64 * smooth(.06, .96, band);
      }
      // Preserve all of the original negative space, including the heart and type.
      const background = dot.artCell && mask ? 0 : field * .095;
      const strength = coverage * light;
      const alpha = (background + gain * strength * dot.exposure) * dot.clear;
      if (alpha < .012) continue;
      const beadSize = pitch * (coverage > .02 ? 1.25 + .55 * light : 1.2);
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
  const artwork = new Image();
  artwork.onload = () => {
    const source = document.createElement('canvas');
    source.width = maskWidth;
    source.height = maskHeight;
    const paint = source.getContext('2d', { willReadFrequently: true });
    if (!paint) return;
    paint.drawImage(artwork, 0, 0, maskWidth, maskHeight);
    const rgba = paint.getImageData(0, 0, maskWidth, maskHeight).data;
    mask = new Uint8Array(maskWidth * maskHeight);
    for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3];
    draw(reduced.matches ? 6 : elapsed);
  };
  artwork.src = 'assets/works/gorilla/bing-gorilla.svg';
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
