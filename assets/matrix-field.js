(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2, aspect = 1300 / 1086;
  const maskWidth = 160, maskHeight = Math.round(maskWidth * aspect);
  const pose = new Float32Array(maskWidth * maskHeight);
  const palette = ['#bcbcbc', '#9eae9f', '#b69589', '#97a7b7', '#b0a0b5'];
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  let width = 0, height = 0, pitch = 4, mobile = false, actorWidth = 260;
  let cloud = [], quiet = [], background = [], sprites = [];
  let dark = true, frame = 0, lastFrame = 0, elapsed = 0, pageShown = true;

  function clearance(x, y) {
    let alpha = 1;
    for (const box of quiet) {
      const dx = Math.max(0, Math.abs(x - box.x) - box.halfWidth);
      const dy = Math.max(0, Math.abs(y - box.y) - box.halfHeight);
      alpha *= smooth(0, box.feather, Math.hypot(dx, dy));
    }
    return alpha;
  }
  function updateQuietZones() {
    const title = stage.querySelector('.line').getBoundingClientRect();
    quiet = [{ x: width / 2, y: height / 2,
      halfWidth: Math.max(title.width / 2 + 30, Math.min(width * .38, 188)),
      halfHeight: Math.max(46, title.height / 2 + 28), feather: mobile ? 35 : 54 }];
    if (stage.classList.contains('works')) {
      const menu = document.getElementById('menu').getBoundingClientRect();
      quiet.push({ x: menu.x + menu.width / 2, y: menu.y + menu.height / 2,
        halfWidth: menu.width / 2 + 18, halfHeight: menu.height / 2 + 16, feather: 48 });
    }
    for (const dot of background) dot.clear = clearance(dot.x, dot.y);
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight;
    mobile = width < 700 || (width < 1000 && height > width);
    actorWidth = Math.max(80, Math.min(mobile ? 240 : 320, width * (mobile ? .62 : .28), height * .43));
    pitch = Math.max(mobile ? 2.7 : 3.4, actorWidth / 74);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    background = [];
    for (let y = pitch / 2; y < height; y += pitch * 4)
      for (let x = pitch / 2; x < width; x += pitch * 4) background.push({ x, y, clear: 1 });
    updateQuietZones(); draw(reduced.matches ? 2 : elapsed);
  }
  function makeSprites() {
    dark = document.documentElement.dataset.theme !== 'light';
    sprites = palette.map((hex, index) => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
      const paint = sprite.getContext('2d');
      const color = index === 0 ? (dark ? '#bcbcbc' : '#686868') : hex;
      const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
      const shade = factor => 'rgb(' + rgb.map(v => Math.round(v * factor)).join(',') + ')';
      const halo = paint.createRadialGradient(16, 16, 1, 16, 16, 15);
      halo.addColorStop(0, color + '38'); halo.addColorStop(.6, color + '07'); halo.addColorStop(1, color + '00');
      paint.fillStyle = halo; paint.fillRect(0, 0, 32, 32);
      const core = paint.createRadialGradient(14.5, 14.5, .4, 16, 16, 7);
      core.addColorStop(0, shade(1.14)); core.addColorStop(.48, color); core.addColorStop(1, shade(.78));
      paint.fillStyle = core; paint.beginPath(); paint.arc(16, 16, 7, 0, TAU); paint.fill();
      return sprite;
    });
  }
  function bead(x, y, color, alpha, size = pitch * 1.72) {
    alpha *= clearance(x, y);
    if (alpha < .018) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprites[color], x - size / 2, y - size / 2, size, size);
  }
  function joint(angle, x, y) { return { c: Math.cos(angle), s: Math.sin(angle), x: x / 1086, y: y / 1086 }; }

  // Skin the original outline first, then resample the new pose on fixed LEDs.
  function poseFigure(time, facing) {
    pose.fill(0);
    const gait = time * 5.3;
    const bones = [
      joint(-.09 + .12 * Math.sin(time * 1.7) + .055 * Math.sin(gait), 680, 390),
      joint(-.13 - .43 * (.5 + .5 * Math.sin(gait + .6)), 735, 475),
      joint(.23 * Math.sin(gait), 330, 970), joint(-.22 * Math.sin(gait), 605, 1030),
    ];
    const root = joint(.055 * Math.sin(gait + .8), 535, 790);
    for (const p of cloud) {
      let x = p.x, y = p.y;
      for (let i = 0; i < 4; i++) {
        const weight = p.weights[i]; if (!weight) continue;
        const b = bones[i], dx = p.x - b.x, dy = p.y - b.y;
        x += weight * (b.x + dx * b.c - dy * b.s - p.x);
        y += weight * (b.y + dx * b.s + dy * b.c - p.y);
      }
      const dx = x - root.x, dy = y - root.y;
      x = root.x + dx * root.c - dy * root.s; y = root.y + dx * root.s + dy * root.c;
      x = .5 + (x - .5) * facing;
      const px = (.08 + x * .84) * (maskWidth - 1), py = (.05 + y / aspect * .84) * (maskHeight - 1);
      const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
      if (ix < 0 || iy < 0 || ix >= maskWidth - 1 || iy >= maskHeight - 1) continue;
      const at = iy * maskWidth + ix, a = p.alpha;
      pose[at] += a * (1 - fx) * (1 - fy); pose[at + 1] += a * fx * (1 - fy);
      pose[at + maskWidth] += a * (1 - fx) * fy; pose[at + maskWidth + 1] += a * fx * fy;
    }
  }
  function samplePose(u, v) {
    const x = Math.max(0, Math.min(maskWidth - 1.001, u * (maskWidth - 1)));
    const y = Math.max(0, Math.min(maskHeight - 1.001, v * (maskHeight - 1)));
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, at = iy * maskWidth + ix;
    return Math.min(1, (pose[at] * (1 - fx) + pose[at + 1] * fx) * (1 - fy) +
      (pose[at + maskWidth] * (1 - fx) + pose[at + maskWidth + 1] * fx) * fy);
  }
  function route(time) {
    const points = mobile ? [[.5, .17], [1.02, .30], [1.02, .70], [.5, .83], [-.02, .70], [-.02, .30]]
      : [[.12, .5], [.28, .18], [.72, .18], [.88, .5], [.70, .81], [.27, .80]];
    const phase = time / 2.9, step = Math.floor(phase), t = phase - step;
    const p = [-1, 0, 1, 2].map(i => points[((step + i) % points.length + points.length) % points.length]);
    const component = axis => .5 * ((2 * p[1][axis]) + (-p[0][axis] + p[2][axis]) * t +
      (2 * p[0][axis] - 5 * p[1][axis] + 4 * p[2][axis] - p[3][axis]) * t * t +
      (-p[0][axis] + 3 * p[1][axis] - 3 * p[2][axis] + p[3][axis]) * t * t * t);
    return { x: component(0) * width, y: component(1) * height };
  }
  function drawFigure(time) {
    if (!cloud.length) return;
    const center = route(time), ahead = route(time + .08), before = route(time - .08);
    poseFigure(time, ahead.x >= before.x ? 1 : -1);
    const w = actorWidth * (1 + .035 * Math.sin(time * 1.4)), h = w * aspect;
    center.y = Math.max(h * .42 + 16, Math.min(height - h * .42 - 8, center.y));
    const left = center.x - w / 2, top = center.y - h / 2 - 15 * Math.abs(Math.sin(time * 2.65));
    const startX = Math.max(pitch / 2, Math.ceil((left - pitch / 2) / pitch) * pitch + pitch / 2);
    const startY = Math.max(pitch / 2, Math.ceil((top - pitch / 2) / pitch) * pitch + pitch / 2);
    for (let y = startY; y < Math.min(height, top + h); y += pitch) {
      for (let x = startX; x < Math.min(width, left + w); x += pitch) {
        const coverage = samplePose((x - left) / w, (y - top) / h);
        if (coverage >= .06) bead(x, y, 0, (dark ? .68 : .48) * coverage);
      }
    }
  }
  function inside(x, y, polygon) {
    let yes = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) yes = !yes;
    }
    return yes;
  }
  function drawStars(time) {
    const anchors = mobile ? [[.19, .13], [.83, .65], [.28, .87], [.84, .21]]
      : [[.43, .17], [.85, .23], [.78, .81], [.18, .80]];
    anchors.forEach(([ax, ay], index) => {
      const phase = time * (1.3 + index * .12) + index * 1.8;
      const x = ax * width + Math.sin(time * .48 + index) * (mobile ? 15 : 27), y = ay * height + Math.sin(phase) * 15;
      const radius = (mobile ? 27 : 38) * (index === 3 ? .7 : 1), angle = Math.sin(time * .8 + index) * .4;
      const c = Math.cos(angle), s = Math.sin(angle);
      const polygon = Array.from({ length: 10 }, (_, i) => {
        const outer = i % 2 === 0, limb = i / 2;
        const theta = -Math.PI / 2 + i * Math.PI / 5 + (outer ? .18 * Math.sin(phase + limb * 1.5) : 0);
        const r = radius * (outer ? 1 + .12 * Math.sin(phase + limb) : .44);
        return { x: Math.cos(theta) * r, y: Math.sin(theta) * r };
      });
      const reach = radius * 1.3, blink = Math.pow(Math.max(0, Math.cos(time * 1.2 + index * 2)), 24);
      const startX = Math.ceil((x - reach - pitch / 2) / pitch) * pitch + pitch / 2;
      const startY = Math.ceil((y - reach - pitch / 2) / pitch) * pitch + pitch / 2;
      for (let py = startY; py <= y + reach; py += pitch) {
        for (let px = startX; px <= x + reach; px += pitch) {
          if (px < 0 || px > width || py < 0 || py > height) continue;
          const dx = px - x, dy = py - y, u = dx * c + dy * s, v = -dx * s + dy * c;
          if (!inside(u, v, polygon)) continue;
          const eye = Math.min(Math.hypot(u - radius * .15, (v + radius * .05) / Math.max(.16, 1 - blink)),
            Math.hypot(u + radius * .15, (v + radius * .05) / Math.max(.16, 1 - blink))) < radius * .065;
          const smile = Math.abs(u) < radius * .17 && Math.abs(v - radius * (.14 - .9 * (u / radius) ** 2)) < radius * .035;
          if (!eye && !smile) bead(px, py, index + 1, dark ? .63 : .54);
        }
      }
    });
  }
  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    for (const dot of background) {
      const wave = Math.sin(dot.x * .011 + Math.sin(dot.y * .009 + time * .4) * 2 - time * .5);
      const alpha = Math.max(0, wave) ** 6 * (dark ? .05 : .045) * dot.clear;
      if (alpha < .018) continue;
      ctx.globalAlpha = alpha;
      const size = pitch * 1.15;
      ctx.drawImage(sprites[0], dot.x - size / 2, dot.y - size / 2, size, size);
    }
    drawStars(time); drawFigure(time); ctx.globalAlpha = 1;
  }
  function visible() { return pageShown && !document.hidden && !stage.classList.contains('gone') && !stage.classList.contains('faded') && !forcedColors.matches; }
  function tick(now) {
    frame = 0;
    if (!visible() || reduced.matches) return;
    if (!lastFrame || now - lastFrame >= 1000 / 24) {
      if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, .1);
      lastFrame = now; draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    if (!visible()) return;
    if (reduced.matches) draw(2); else frame = requestAnimationFrame(tick);
  }
  const artwork = new Image();
  artwork.onload = () => {
    const source = document.createElement('canvas'); source.width = 216; source.height = Math.round(216 * aspect);
    const paint = source.getContext('2d', { willReadFrequently: true }); if (!paint) return;
    const scale = source.width / 1086;
    paint.drawImage(artwork, 175 * scale, 90 * scale, 750 * scale, 1140 * scale);
    const rgba = paint.getImageData(0, 0, source.width, source.height).data;
    const exposure = (.84 * (maskWidth - 1) / source.width) * (.84 * (maskHeight - 1) / source.height);
    cloud = [];
    for (let row = 0; row < source.height; row++) {
      for (let column = 0; column < source.width; column++) {
        const alpha = rgba[(row * source.width + column) * 4 + 3] / 255; if (alpha < .03) continue;
        const x = column / source.width, v = row / source.height;
        const weights = [smooth(.46, .55, x) * (1 - smooth(.27, .35, v)),
          smooth(.61, .72, x) * smooth(.33, .41, v) * (1 - smooth(.78, .83, v)),
          (1 - smooth(.37, .44, x)) * smooth(.72, .78, v),
          smooth(.40, .46, x) * (1 - smooth(.68, .74, x)) * smooth(.76, .82, v)];
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum > 1) for (let i = 0; i < weights.length; i++) weights[i] /= sum;
        cloud.push({ x, y: row / source.width, weights, alpha: alpha * exposure });
      }
    }
    draw(reduced.matches ? 2 : elapsed);
  };
  artwork.src = 'assets/works/gorilla/bing-gorilla-figure.svg';
  makeSprites(); resize();
  const layout = new ResizeObserver(() => { updateQuietZones(); if (reduced.matches) draw(2); });
  layout.observe(stage.querySelector('.line')); layout.observe(document.getElementById('menu'));
  new MutationObserver(() => { updateQuietZones(); sync(); }).observe(stage, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => { makeSprites(); draw(reduced.matches ? 2 : elapsed); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('resize', resize, { passive: true }); document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); forcedColors.addEventListener('change', sync);
  addEventListener('pagehide', () => { pageShown = false; sync(); }); addEventListener('pageshow', () => { pageShown = true; sync(); });
  sync();
})();
