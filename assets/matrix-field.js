(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const seed = 200240412;
  const TAU = Math.PI * 2;
  // A finite illustration palette. Colour belongs to a moving shape, never to
  // an independent rainbow field, and never blends into its neighbour.
  const colours = [[155,158,150],[174,146,155],[137,158,177],
    [164,158,119],[135,163,148],[157,143,173]];
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
    quiet = [{ x: title.x + title.width / 2, y: title.y + title.height / 2,
      halfWidth: title.width / 2 + 18, halfHeight: title.height / 2 + 17 }];
    if (stage.classList.contains('works')) {
      const menu = document.getElementById('menu').getBoundingClientRect();
      quiet.push({ x: menu.x + menu.width / 2, y: menu.y + menu.height / 2,
        halfWidth: menu.width / 2 + 14, halfHeight: menu.height / 2 + 12 });
    }
  }

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    pitch = Math.max(width < 700 ? 9 : 12, Math.sqrt(width * height / 10000));
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const columns = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
    const offsetX = (width - (columns - 1) * pitch) / 2;
    const offsetY = (height - (rows - 1) * pitch) / 2;
    dots = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = offsetX + column * pitch, y = offsetY + row * pitch;
        dots.push({ x, y });
      }
    }
    updateQuietZones();
    draw(reduced.matches ? 6 : elapsed);
  }

  function makeSprites() {
    dark = document.documentElement.dataset.theme !== 'light';
    sprites = colours.map(rgb => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 32;
      const paint = sprite.getContext('2d');
      paint.fillStyle = 'rgb(' + rgb.map(value => Math.round(value * (dark ? 1 : .82))).join(',') + ')';
      paint.beginPath();
      paint.arc(16, 16, 8, 0, TAU);
      paint.fill();
      return sprite;
    });
  }

  // Every coloured body and every dark opening use this same rounded star.
  // The shared coordinate warp bends the entire illustration, including the
  // clearing around the text, instead of adding a separate central mask.
  function warp(x, y, time) {
    const unit = Math.min(width, height);
    return {
      x: x + unit * (.024 * Math.sin(y / unit * 5.1 - time * .31) +
        .012 * Math.sin(x / unit * 7.2 + y / unit * 2.8 + time * .24)),
      y: y + unit * (.024 * Math.sin(x / unit * 4.7 + time * .27) +
        .012 * Math.cos(y / unit * 6.4 - x / unit * 2.1 - time * .22)),
    };
  }
  function boundary(angle, phase, time) {
    return 1 + .17 * Math.cos(angle * 4 + phase + .35 * Math.sin(time * .34 + phase)) +
      .065 * Math.sin(angle * 3 - time * .29 + phase);
  }
  function shape(x, y, rx, ry, angle, phase, colour) {
    return { x, y, rx, ry, cos: Math.cos(angle), sin: Math.sin(angle), phase, colour, scale: 1 };
  }
  function prepare(body, time, feather = 0) {
    const a = body.phase + .35 * Math.sin(time * .34 + body.phase);
    const b = -time * .29 + body.phase;
    body.c4 = Math.cos(a); body.s4 = Math.sin(a);
    body.c3 = Math.cos(b); body.s3 = Math.sin(b);
    body.unit = Math.min(body.rx, body.ry);
    const reach = 1.235 * body.scale + feather / body.unit;
    body.bx = reach * Math.hypot(body.rx * body.cos, body.ry * body.sin);
    body.by = reach * Math.hypot(body.rx * body.sin, body.ry * body.cos);
    return body;
  }
  function localPoint(point, body) {
    const dx = point.x - body.x, dy = point.y - body.y;
    return { x: (dx * body.cos + dy * body.sin) / body.rx,
      y: (-dx * body.sin + dy * body.cos) / body.ry };
  }
  function distance(point, body) {
    if (Math.abs(point.x - body.x) > body.bx || Math.abs(point.y - body.y) > body.by) return -Infinity;
    const local = localPoint(point, body);
    const radius = Math.hypot(local.x, local.y);
    const c = radius ? local.x / radius : 1, s = radius ? local.y / radius : 0;
    // Polynomial harmonics equal boundary(atan2(y,x)), avoiding per-dot trig.
    const c2 = c * c, s2 = s * s;
    const cos4 = 1 - 8 * c2 * s2, sin4 = 4 * c * s * (c2 - s2);
    const cos3 = 4 * c * c2 - 3 * c, sin3 = 3 * s - 4 * s * s2;
    const edge = 1 + .17 * (cos4 * body.c4 - sin4 * body.s4) +
      .065 * (sin3 * body.c3 + cos3 * body.s3);
    return (edge * body.scale - radius) * body.unit;
  }

  function scene(time) {
    const unit = Math.min(width, height), step = Math.max(190, unit * .52);
    const bodies = [], openings = [];
    const columns = Math.ceil(width / step) + 2, rows = Math.ceil(height / step) + 2;
    for (let row = -1; row < rows; row++) {
      for (let column = -1; column < columns; column++) {
        const phase = hash(column + 30, row + 30) * TAU;
        const x = (column + .5) * step + step * .1 * Math.sin(time * .25 + phase);
        const y = (row + .5) * step + step * .1 * Math.cos(time * .28 + phase);
        const rx = step * (.83 + .06 * Math.sin(time * .32 + phase));
        const ry = step * (.78 + .08 * Math.cos(time * .26 + phase));
        bodies.push(shape(x, y, rx, ry, .18 * Math.sin(time * .21 + phase), phase,
          ((column + row * 3) % colours.length + colours.length) % colours.length));
      }
    }
    // These are cuts in the very same illustration. Their edges, motion and
    // stepped brightness use exactly the same function as the coloured bodies.
    const holes = [[-.1, .02, .24, .12, .3], [.73, -.1, .23, .13, 2.1],
      [1.11, .84, .25, .13, 4.4], [.21, 1.12, .24, .13, 5.8]];
    for (const [x, y, rx, ry, phase] of holes) {
      openings.push(shape(x * width + unit * .04 * Math.sin(time * .32 + phase),
        y * height + unit * .035 * Math.cos(time * .3 + phase), unit * rx, unit * ry,
        .18 * Math.sin(time * .22 + phase), phase, -1));
    }
    for (let i = 0; i < quiet.length; i++) {
      const box = quiet[i], centre = warp(box.x, box.y, time);
      const opening = shape(centre.x + 16 * Math.sin(time * .37 + i),
        centre.y + 12 * Math.cos(time * .33 + .6 + i), box.halfWidth, box.halfHeight,
        .045 * Math.sin(time * .28 + i), .7 + i * 2, -1);
      // Fit this star's own parameters around the text. No secondary guard or
      // alpha mask: all of its visible shore is generated by distance() above.
      let fit = 1;
      for (let gy = -1; gy <= 1; gy++) {
        for (let gx = -1; gx <= 1; gx++) {
          const point = warp(box.x + gx * box.halfWidth, box.y + gy * box.halfHeight, time);
          const local = localPoint(point, opening);
          fit = Math.max(fit, Math.hypot(local.x, local.y) /
            boundary(Math.atan2(local.y, local.x), opening.phase, time));
        }
      }
      opening.scale = fit + .08;
      openings.push(opening);
    }
    const cell = Math.max(80, unit * .24);
    const bucketColumns = Math.ceil(width / cell) + 2, bucketRows = Math.ceil(height / cell) + 2;
    const buckets = Array.from({ length: bucketColumns * bucketRows }, () => ({ bodies: [], openings: [] }));
    function place(body, kind, feather) {
      prepare(body, time, feather);
      const x0 = Math.max(0, Math.floor((body.x - body.bx) / cell) + 1);
      const x1 = Math.min(bucketColumns - 1, Math.floor((body.x + body.bx) / cell) + 1);
      const y0 = Math.max(0, Math.floor((body.y - body.by) / cell) + 1);
      const y1 = Math.min(bucketRows - 1, Math.floor((body.y + body.by) / cell) + 1);
      for (let row = y0; row <= y1; row++) {
        for (let column = x0; column <= x1; column++) buckets[row * bucketColumns + column][kind].push(body);
      }
    }
    for (const body of bodies) place(body, 'bodies', 0);
    for (const opening of openings) place(opening, 'openings', pitch * 6);
    return { buckets, bucketColumns, cell };
  }

  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const size = pitch * 1.2, feather = pitch * 6;
    const { buckets, bucketColumns, cell } = scene(time);
    for (const dot of dots) {
      const point = warp(dot.x, dot.y, time);
      const bucket = buckets[(Math.floor(point.y / cell) + 1) * bucketColumns + Math.floor(point.x / cell) + 1];
      let surface = -Infinity, colour = 0;
      for (const body of bucket.bodies) {
        const inside = distance(point, body);
        if (inside > surface) { surface = inside; colour = body.colour; }
      }
      for (const opening of bucket.openings) surface = Math.min(surface, -distance(point, opening));
      // A common signed surface drives every edge, central and peripheral.
      // Hue is a hard region ID. Only whole-LED brightness has discrete steps.
      const ramp = smooth(0, feather, surface);
      const brightness = Math.round(ramp * 24) / 24;
      if (!brightness) continue;
      ctx.globalAlpha = (dark ? .66 : .48) * brightness;
      ctx.drawImage(sprites[colour], dot.x - size / 2, dot.y - size / 2, size, size);
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
