/* GouGO's walking companions. Each field uses a uniform circular LED lattice;
 * every lit cell is a flat circular bead, including at the moving leg edges.
 * No image, font, sprite sheet, shader or third-party animation runtime.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('gogo-dog-matrix');
  const hero = canvas?.closest('.gogo-hero');
  const miniCanvas = document.getElementById('gogo-mini-matrix');
  const photo = hero?.querySelector('.gogo-hero-photo');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!hero || !context) return;
  const mask = document.createElement('canvas');
  const mainInk = mask.getContext('2d', { alpha: true, willReadFrequently: true });
  const miniContext = miniCanvas?.getContext('2d', { alpha: true });
  const miniMask = document.createElement('canvas');
  const miniInk = miniMask.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!mainInk || !miniInk) return;
  let ink = mainInk;
  const TAU = Math.PI * 2, FPS = 20, COMPANIONS = 5;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const dialog = document.getElementById('gogo-lightbox');
  let host = null;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  const palettes = {
    dark: ['#62665d', '#a5aa98', '#d2d1bd', '#c2944a'],
    // Deep pigments keep the open dot lattice distinct against light paper.
    light: ['#6b765f', '#34472c', '#152810', '#95630f'],
  };
  const roles = ['rgb(20,0,0)', 'rgb(75,0,0)', 'rgb(145,0,0)', 'rgb(235,0,0)'];
  let width = 1, height = 1, pitch = 7, ratio = 1, mainPitch = 7, coverTop = 0;
  let compact = false, miniWidth = 1, miniHeight = 1, miniPitch = 3, miniRatio = 1;
  let frame = 0, previous = 0, elapsed = 0;
  let onScreen = true, shown = true, colours = palettes.dark;

  function polygon(points, role) {
    ink.fillStyle = roles[role]; ink.beginPath();
    points.forEach(([x, y], index) => index ? ink.lineTo(x, y) : ink.moveTo(x, y));
    ink.closePath(); ink.fill();
  }
  function circle(x, y, radius, role) {
    ink.fillStyle = roles[role]; ink.beginPath();
    ink.arc(x, y, radius, 0, TAU); ink.fill();
  }
  function bar(x1, y1, x2, y2, thickness, role) {
    ink.strokeStyle = roles[role]; ink.lineWidth = thickness;
    ink.lineCap = 'round'; ink.beginPath();
    ink.moveTo(x1, y1); ink.lineTo(x2, y2); ink.stroke();
  }
  function cut(x1, y1, x2, y2, thickness) {
    ink.save(); ink.globalCompositeOperation = 'destination-out';
    bar(x1, y1, x2, y2, thickness, 1); ink.restore();
  }
  function ring(x, y, outer, inner, role, centreRole = 0) {
    circle(x, y, outer, role); circle(x, y, inner, centreRole);
  }

  // A planted foot travels backwards relative to the body. Only the recovery
  // part of its cycle rises off the ground; the knee follows two-link IK.
  function foot(phase, stride, lift) {
    const cycle = ((phase / TAU) % 1 + 1) % 1;
    if (cycle < .62) return { x: stride * (.5 - cycle / .62), y: 0 };
    const progress = (cycle - .62) / .38;
    return { x: stride * (progress - .5), y: -Math.sin(progress * Math.PI) * lift };
  }
  function leg(hipX, hipY, phase, far, front) {
    const target = foot(phase, front ? 100 : 92, front ? 39 : 32);
    const toe = { x: hipX + target.x + (front ? 8 : -3), y: -7 + target.y };
    const dx = toe.x - hipX, dy = toe.y - hipY;
    const distance = Math.min(198, Math.hypot(dx, dy));
    const upper = 103, lower = 112;
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
    const nx = dx / distance, ny = dy / distance;
    const knee = { x: hipX + nx * along - ny * bend, y: hipY + ny * along + nx * bend };
    const limb = far ? 0 : 2, motor = far ? 0 : 1;
    bar(hipX, hipY, knee.x, knee.y, far ? 17 : 19, limb);
    bar(knee.x, knee.y, toe.x, toe.y, far ? 12 : 14, limb);
    if (!far) {
      bar(hipX - 3, hipY + 5, knee.x - 2, knee.y - 3, 6, 1);
      bar(knee.x + 2, knee.y + 4, toe.x + 1, toe.y - 2, 5, 1);
    }
    ring(hipX, hipY, far ? 21 : 24, far ? 10 : 13, limb, motor);
    ring(knee.x, knee.y, far ? 13 : 16, far ? 6 : 8, limb, motor);
    circle(toe.x, toe.y, far ? 8 : 9, motor);
    bar(toe.x - 8, toe.y + 7, toe.x + 16, toe.y + 7, 8, limb);
    if (!far) circle(knee.x, knee.y, 3.5, 3);
  }

  function dog(x, ground, scale, phase, time, small) {
    const bob = Math.sin(phase * 2) * (small ? 2.8 : 4.2);
    ink.save(); ink.translate(x / pitch, ground / pitch); ink.scale(scale / pitch, scale / pitch);
    // The far legs are physically separate and out of phase with near legs.
    leg(-109 + 24, -174 + bob - 7, phase + .08, true, false);
    leg(121 + 24, -174 + bob - 7, phase + Math.PI + .08, true, true);
    ink.save(); ink.translate(0, bob); ink.rotate(Math.sin(phase) * .013);
    // Rigid chassis, raised battery housing, handle and articulated sensor neck.
    polygon([[-173,-258],[-142,-276],[102,-276],[153,-250],[159,-184],[131,-161],[-137,-161],[-172,-180]],1);
    polygon([[-150,-258],[-130,-268],[91,-268],[125,-250],[119,-229],[-148,-229]],2);
    polygon([[-130,-220],[111,-220],[128,-199],[107,-183],[-126,-183]],1);
    bar(-140,-226,126,-226,5,0);
    bar(-69,-266,-69,-184,5,0); bar(78,-265,78,-184,5,0);
    bar(-42,-285,37,-285,8,2); bar(-42,-285,-48,-270,7,2); bar(37,-285,43,-269,7,2);
    // Three side vents and a narrow ochre equipment status strip.
    [-109,-93,-77].forEach(v => cut(v,-208,v,-190,5));
    bar(38,-249,75,-249,6,3);
    polygon([[137,-250],[176,-257],[199,-231],[178,-200],[148,-211]],2);
    ring(171,-230,18,10,2,0);
    // A faceted horizontal sensor head makes this a machine, without ears.
    ink.save(); ink.translate(201,-246); ink.rotate(-.06 + Math.sin(time * 1.1) * .025);
    polygon([[-25,-43],[44,-47],[74,-25],[72,14],[43,29],[-29,17],[-40,-7]],1);
    polygon([[34,-37],[65,-22],[64,6],[39,15],[30,-1]],0);
    polygon([[-22,-36],[26,-39],[32,-17],[-29,-12]],2);
    bar(48,-19,61,-14,7,3); circle(52,1,4,3);
    bar(-17,12,21,17,4,0);
    ink.restore(); ink.restore();
    // Near-side diagonal pair: both the knees and feet change position.
    leg(-109, -174 + bob, phase + Math.PI, false, false);
    leg(121, -174 + bob, phase, false, true);
    ink.restore();
  }

  function draw(time) {
    ink = mainInk; pitch = mainPitch;
    ink.setTransform(1, 0, 0, 1, 0, 0); ink.clearRect(0, 0, mask.width, mask.height);
    const unit = Math.min(height * .00215, width / (compact ? 190 : 240), 3.6);
    // Withdraw slightly into the right edge of the cropped left-third field.
    const leadX = width * .98 - 276 * unit + Math.sin(time * .13) * unit * 5;
    // The sensor head rises to the cover's top, including on narrow screens.
    const ground = coverTop + 284 * unit;
    const gait = time * TAU / 2.15;
    dog(leadX, ground, unit, gait, time, false);
    paintMask(context, mask, mainInk, width, height, mainPitch, ratio);
    if (!miniContext) return;
    ink = miniInk; pitch = miniPitch;
    ink.setTransform(1, 0, 0, 1, 0, 0); ink.clearRect(0, 0, miniMask.width, miniMask.height);
    // The companions cross the open top of the same scrolling composition.
    const smallScale = compact ? Math.min(.10, miniWidth / (COMPANIONS * 560)) : .18;
    const smallWidth = 470 * smallScale;
    const runway = miniWidth;
    const start = runway * .1;
    for (let index = 0; index < COMPANIONS; index++) {
      const x = (start + index * runway / COMPANIONS + time * (compact ? 8 : 15)) % runway;
      const floor = miniHeight - (compact ? 17 : 15);
      dog(x, floor, smallScale, gait - index * .87, time + index * 2, true);
      // Wrap the same companion through the clipped edge without disappearing.
      if (x < smallWidth * .7) dog(x + runway, floor, smallScale, gait - index * .87, time + index * 2, true);
      if (x > runway - smallWidth * .7) dog(x - runway, floor, smallScale, gait - index * .87, time + index * 2, true);
    }
    paintMask(miniContext, miniMask, miniInk, miniWidth, miniHeight, miniPitch, miniRatio);
  }
  function paintMask(target, source, reader, fieldWidth, fieldHeight, fieldPitch, fieldRatio) {
    const data = reader.getImageData(0, 0, source.width, source.height).data;
    target.setTransform(fieldRatio, 0, 0, fieldRatio, 0, 0); target.clearRect(0, 0, fieldWidth, fieldHeight);
    const radius = fieldPitch * .319;
    for (let role = 0; role < 4; role++) {
      target.fillStyle = colours[role]; target.beginPath();
      for (let row = 0; row < source.height; row++) for (let col = 0; col < source.width; col++) {
        const offset = (row * source.width + col) * 4;
        if (data[offset + 3] < 130) continue;
        const r = data[offset], kind = r > 200 ? 3 : r > 110 ? 2 : r > 45 ? 1 : 0;
        if (kind !== role) continue;
        const x = (col + .5) * fieldPitch, y = (row + .5) * fieldPitch;
        target.moveTo(x + radius, y); target.arc(x, y, radius, 0, TAU);
      }
      target.fill();
    }
  }
  function active() {
    return onScreen && shown && !document.hidden && !forced.matches && !dialog?.open
      && (!host || host.classList.contains('on'));
  }
  function tick(now) {
    frame = 0;
    if (!active() || reduced.matches) return;
    if (!previous || now - previous >= 1000 / FPS) {
      if (previous) elapsed += Math.min(.12, (now - previous) / 1000);
      previous = now; draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    colours = palettes[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    canvas.style.visibility = forced.matches ? 'hidden' : '';
    if (miniCanvas) miniCanvas.style.visibility = forced.matches ? 'hidden' : '';
    if (!active()) return;
    draw(reduced.matches ? .31 : elapsed);
    if (!reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    coverTop = (photo?.getBoundingClientRect().top || 0) - canvas.getBoundingClientRect().top;
    compact = hero.clientWidth <= 720;
    mainPitch = compact ? 4.5 : 7;
    ratio = Math.min(devicePixelRatio || 1, 1.5, 4096 / width, 2160 / height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    mask.width = Math.ceil(width / mainPitch); mask.height = Math.ceil(height / mainPitch);
    if (miniCanvas) {
      miniWidth = Math.max(1, miniCanvas.clientWidth); miniHeight = Math.max(1, miniCanvas.clientHeight);
      miniPitch = compact ? Math.min(2.5, Math.max(1, miniWidth / (COMPANIONS * 22))) : 3;
      miniRatio = Math.min(devicePixelRatio || 1, 1.5, 4096 / miniWidth);
      miniCanvas.width = Math.round(miniWidth * miniRatio); miniCanvas.height = Math.round(miniHeight * miniRatio);
      miniMask.width = Math.ceil(miniWidth / miniPitch); miniMask.height = Math.ceil(miniHeight / miniPitch);
    }
    sync();
  }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (host) new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ['class'] });
  if (dialog) new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); sync(); }, { threshold: 0 }).observe(hero);
  new ResizeObserver(resize).observe(hero);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); forced.addEventListener('change', resize);
  addEventListener('pagehide', () => { shown = false; sync(); });
  addEventListener('pageshow', () => { shown = true; sync(); });
  resize();
})();
