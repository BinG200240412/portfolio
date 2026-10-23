(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const seed = 200240412;
  const TAU = Math.PI * 2;
  // Neighbouring colours have similar lightness. Every LED participates in the colour field.
  const colours = [[154,180,142],[128,176,164],[132,162,194],[170,150,195],[198,148,174],
    [204,151,129],[194,174,126],[171,182,132],[138,181,179],[161,158,191]];
  const shadesPerColour = 8;
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const hash = (x, y) => {
    let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };

  let width = 0, height = 0, pitch = 12, dots = [], quiet = [], sprites = [];
  let dark = true, frame = 0, lastFrame = 0, elapsed = 0, pageShown = true;

  function updateQuietZones() {
    const title = stage.querySelector('.line').getBoundingClientRect();
    quiet = [{ x: width / 2, y: height / 2,
      halfWidth: Math.max(80, title.width / 2 + (width < 700 ? 14 : 26)),
      halfHeight: Math.max(38, title.height * .78 + 16), power: 2 }];
    if (stage.classList.contains('works')) {
      const menu = document.getElementById('menu').getBoundingClientRect();
      quiet.push({ x: menu.x + menu.width / 2, y: menu.y + menu.height / 2,
        halfWidth: menu.width / 2 + 20, halfHeight: menu.height / 2 + 20, power: 4 });
    }
    for (const dot of dots) {
      dot.shore = quiet.map(box => {
        const dx = (dot.x - box.x) / box.halfWidth, dy = (dot.y - box.y) / box.halfHeight;
        return { radius: (Math.abs(dx) ** box.power + Math.abs(dy) ** box.power) ** (1 / box.power),
          angle: Math.atan2(dy, dx) };
      });
    }
  }

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    pitch = Math.max(width < 700 ? 9 : 12, Math.sqrt(width * height / 14000));
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const columns = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
    const offsetX = (width - (columns - 1) * pitch) / 2;
    const offsetY = (height - (rows - 1) * pitch) / 2;
    const unit = Math.max(1, Math.min(width, height));
    dots = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = offsetX + column * pitch, y = offsetY + row * pitch;
        dots.push({ x, y, u: (x - width / 2) / unit, v: (y - height / 2) / unit,
          exposure: .97 + hash(column, row) * .03, shore: [] });
      }
    }
    updateQuietZones();
    draw(reduced.matches ? 6 : elapsed);
  }

  function makeSprites() {
    dark = document.documentElement.dataset.theme !== 'light';
    sprites = [];
    for (let i = 0; i < colours.length * shadesPerColour; i++) {
      const index = Math.floor(i / shadesPerColour), amount = (i % shadesPerColour) / shadesPerColour;
      const first = colours[index], next = colours[(index + 1) % colours.length];
      const rgb = first.map((value, k) => (value + (next[k] - value) * amount) * (dark ? 1 : .92));
      const colour = factor => 'rgb(' + rgb.map(value => Math.round(Math.min(255, value * factor))).join(',') + ')';
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 32;
      const paint = sprite.getContext('2d');
      const halo = paint.createRadialGradient(16, 16, 5, 16, 16, 15.5);
      halo.addColorStop(0, 'rgba(' + rgb.map(Math.round).join(',') + ',.18)');
      halo.addColorStop(1, 'rgba(' + rgb.map(Math.round).join(',') + ',0)');
      paint.fillStyle = halo;
      paint.fillRect(0, 0, 32, 32);
      const core = paint.createRadialGradient(14.5, 14.5, .8, 16, 16, 8);
      core.addColorStop(0, colour(1.13));
      core.addColorStop(.5, colour(1));
      core.addColorStop(1, colour(.7));
      paint.fillStyle = core;
      paint.beginPath();
      paint.arc(16, 16, 8, 0, TAU);
      paint.fill();
      sprites.push(sprite);
    }
  }

  // The reference survives as broad arches and asymmetric elliptical pressure,
  // embedded in a continuous field rather than assembled into a complete figure.
  function field(x, y, time) {
    const u = x + .16 * Math.sin(y * 4 - time * .31) + .08 * Math.sin(x * 3 + y * 2 + time * .23);
    const v = y + .15 * Math.sin(x * 3.3 + time * .27) + .07 * Math.cos(y * 4.6 - x * 1.4 - time * .19);
    const arch = Math.hypot((u + .28 + .07 * Math.sin(time * .21)) * 1.08, (v + .23) * 1.5);
    const lens = Math.hypot((u - .42) * 1.45, (v - .19 + .08 * Math.cos(time * .25)) * 1.12);
    const morph = .5 + .5 * Math.sin(time * .16 + u * .8);
    const pressure = arch * (1 - morph) + lens * morph;
    const a = Math.sin(u * 5.6 + Math.sin(v * 4.2 - time * .37) * 1.55 - time * .51);
    const b = Math.cos(v * 6.1 - u * 1.3 + Math.sin(u * 3.2 + time * .28) - time * .39);
    const c = Math.cos(pressure * 10.5 - time * .46 + .75 * Math.sin(v * 2.4 + time * .22));
    const light = smooth(-.85, .86, a * .53 + b * .33 + c * .34);
    const colour = 5 + 2.5 * Math.sin(u * 2 + v * .8 + time * .13) +
      1.6 * Math.sin(v * 2.2 - u * .9 - time * .11) + 1.2 * Math.sin(u * 3.4 - v * 1.8 + time * .08);
    return { light, colour };
  }

  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const size = pitch * 1.2;
    for (const dot of dots) {
      const value = field(dot.u, dot.v, time);
      const colour = ((value.colour % colours.length) + colours.length) % colours.length;
      const index = Math.floor(colour * shadesPerColour) % sprites.length;
      // An irregular, moving shoreline dissolves the whole LED before the text.
      let clear = 1;
      for (const shore of dot.shore) {
        const edge = 1.25 + .14 * Math.sin(shore.angle * 3 + time * .22) +
          .08 * Math.sin(shore.angle * 5 - time * .18 + .8) +
          .045 * Math.sin(shore.angle * 9 + time * .29);
        clear *= smooth(edge, edge + .6, shore.radius);
      }
      ctx.globalAlpha = ((dark ? .115 : .085) + value.light * (dark ? .66 : .53)) * dot.exposure * clear;
      ctx.drawImage(sprites[index], dot.x - size / 2, dot.y - size / 2, size, size);
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

  makeSprites();
  resize();
  const layout = new ResizeObserver(() => { updateQuietZones(); if (reduced.matches) draw(6); });
  layout.observe(stage.querySelector('.line'));
  layout.observe(document.getElementById('menu'));
  new MutationObserver(() => { updateQuietZones(); sync(); })
    .observe(stage, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => { makeSprites(); draw(reduced.matches ? 6 : elapsed); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  forcedColors.addEventListener('change', sync);
  addEventListener('pagehide', () => { pageShown = false; sync(); });
  addEventListener('pageshow', () => { pageShown = true; sync(); });
  sync();
})();
