/* Samples BinG's original rear-view SVG, rather than redrawing the character.
 * Source copies are byte-identical to 银背大猩猩-矢量.svg (original double butt)
 * and BinG-银背猩猩品牌锁定稿-扁爱心屁股-v3.svg (heart mask reference only).
 * The latter's figure, surrounding glyphs and wordmark are never rendered.
 */
(function (global) {
  'use strict';

  const WIDTH = 96, HEIGHT = 128, SCALE = 4;
  const SW = WIDTH * SCALE, SH = HEIGHT * SCALE;
  const script = document.currentScript;
  const base = script?.src || new URL('assets/matrix-gorilla.js', document.baseURI).href;
  const sourceURL = new URL('works/gorilla/native-gorilla-rear.svg', base).href;
  const heartURL = new URL('works/gorilla/native-gorilla-heart-reference.svg', base).href;
  const empty = new Uint8Array(WIDTH * HEIGHT);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  let state = null;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  function phase(variant) {
    const text = String(variant ?? '');
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return hash % 6283 / 1000;
  }

  function load(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }

  function alpha(image) {
    const canvas = document.createElement('canvas');
    canvas.width = SW; canvas.height = SH;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, SW, SH);
    const rgba = context.getImageData(0, 0, SW, SH).data;
    const result = new Uint8Array(SW * SH);
    for (let i = 0; i < result.length; i++) result[i] = rgba[i * 4 + 3];
    return result;
  }

  function hole(ink, seedX, seedY, region) {
    const x0 = Math.floor(region[0] * SW), y0 = Math.floor(region[1] * SH);
    const x1 = Math.ceil(region[2] * SW), y1 = Math.ceil(region[3] * SH);
    const start = Math.round(seedY * SH) * SW + Math.round(seedX * SW);
    const mask = new Uint8Array(SW * SH);
    if (ink[start] > 110) throw new Error('Original gorilla negative-space seed is covered.');
    const queue = new Int32Array(SW * SH);
    let head = 0, tail = 1;
    queue[0] = start; mask[start] = 1;
    const box = { x0: SW, y0: SH, x1: 0, y1: 0 };
    while (head < tail) {
      const index = queue[head++], x = index % SW, y = Math.floor(index / SW);
      box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      for (const step of [-1, 1, -SW, SW]) {
        const next = index + step, nx = next % SW, ny = Math.floor(next / SW);
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || mask[next] || ink[next] > 110) continue;
        mask[next] = 1; queue[tail++] = next;
      }
    }
    // An open background region must never become a giant red rectangle.
    if (box.x0 <= x0 || box.x1 >= x1 || box.y0 <= y0 || box.y1 >= y1 || tail < 120) {
      throw new Error('Gorilla negative space is not an enclosed local shape.');
    }
    return { mask, box };
  }

  function distanceTo(mask, inside) {
    const field = new Float32Array(SW * SH);
    const diagonal = Math.SQRT2;
    for (let i = 0; i < field.length; i++) field[i] = Boolean(mask[i]) === inside ? 0 : 1e5;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      if (x) field[i] = Math.min(field[i], field[i - 1] + 1);
      if (y) {
        field[i] = Math.min(field[i], field[i - SW] + 1);
        if (x) field[i] = Math.min(field[i], field[i - SW - 1] + diagonal);
        if (x < SW - 1) field[i] = Math.min(field[i], field[i - SW + 1] + diagonal);
      }
    }
    for (let y = SH - 1; y >= 0; y--) for (let x = SW - 1; x >= 0; x--) {
      const i = y * SW + x;
      if (x < SW - 1) field[i] = Math.min(field[i], field[i + 1] + 1);
      if (y < SH - 1) {
        field[i] = Math.min(field[i], field[i + SW] + 1);
        if (x) field[i] = Math.min(field[i], field[i + SW - 1] + diagonal);
        if (x < SW - 1) field[i] = Math.min(field[i], field[i + SW + 1] + diagonal);
      }
    }
    return field;
  }

  function signedDistance(mask) {
    const outside = distanceTo(mask, true), inside = distanceTo(mask, false);
    for (let i = 0; i < outside.length; i++) outside[i] -= inside[i];
    return outside;
  }

  function alignHeart(original, reference) {
    const result = new Uint8Array(SW * SH), a = original.box, b = reference.box;
    for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
      const hx = Math.round(b.x0 + (x - a.x0) / (a.x1 - a.x0) * (b.x1 - b.x0));
      const hy = Math.round(b.y0 + (y - a.y0) / (a.y1 - a.y0) * (b.y1 - b.y0));
      result[y * SW + x] = reference.mask[hy * SW + hx];
    }
    return result;
  }

  function sample(field, x, y) {
    x = clamp(x, 0, SW - 1.001); y = clamp(y, 0, SH - 1.001);
    const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy;
    const i = iy * SW + ix;
    return (field[i] * (1 - dx) + field[i + 1] * dx) * (1 - dy) +
      (field[i + SW] * (1 - dx) + field[i + SW + 1] * dx) * dy;
  }

  function render(id, time, variant, options) {
    if (id !== 'gorilla' || !state) {
      return { width: WIDTH, height: HEIGHT, pixels: empty, ready: false,
        hitBox: { x0: 16, y0: 60, x1: 61, y1: 90 } };
    }
    const settings = options || {};
    const morph = clamp(finite(settings.morph, 0), 0, 1);
    const px = clamp(finite(settings.pointerX, 0), -1, 1);
    const py = clamp(finite(settings.pointerY, 0), -1, 1);
    const t = finite(time, 0), p = phase(variant);
    const yaw = Math.sin(t * 0.43 + p) * 0.035 + px * 0.05;
    const lean = Math.sin(t * 0.37 + p) * 0.17 + py * 0.46;
    const pixels = new Uint8Array(WIDTH * HEIGHT);
    const shades = new Uint8Array(WIDTH * HEIGHT);
    const box = state.box;

    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const nx = x / WIDTH, ny = y / HEIGHT;
      // The head sits slightly forward; peripheral glyphs sit behind the body.
      // Only subpixel depth offsets change, never the original composition.
      let depth = 0.18;
      if (nx > 0.17 && nx < 0.85 && ny > 0.1 && ny < 0.94) depth = 0.55;
      if (nx > 0.53 && nx < 0.87 && ny > 0.1 && ny < 0.38) depth = 0.95;
      if ((nx < 0.31 && ny < 0.54) || (nx > 0.76 && ny > 0.49)) depth = 0.18;
      const sx = (x + 0.5 - WIDTH / 2) / Math.cos(yaw) + WIDTH / 2 - depth * yaw * 10;
      const sy = y + 0.5 - lean * depth;
      const ax = sx * SCALE, ay = sy * SCALE;
      const ink = (sample(state.ink, ax - 0.85, ay - 0.85) + sample(state.ink, ax + 0.85, ay - 0.85) +
        sample(state.ink, ax - 0.85, ay + 0.85) + sample(state.ink, ax + 0.85, ay + 0.85)) / 4;
      const i = y * WIDTH + x;
      if (ink >= 33) {
        pixels[i] = 1;
        shades[i] = ink > 210 ? 4 : ink > 125 ? 3 : ink > 65 ? 2 : 1;
      }
      if (ax < box.x0 - 3 || ax > box.x1 + 3 || ay < box.y0 - 3 || ay > box.y1 + 3) continue;
      const before = sample(state.original, ax, ay);
      const after = sample(state.heart, ax, ay);
      const current = before * (1 - morph) + after * morph;
      if (morph > 0 && before < 0 && current >= 0) {
        // Restore body ink only where the old enclosed negative space closes.
        pixels[i] = 1; shades[i] = 4;
      }
      if (current < 0) {
        pixels[i] = 0; shades[i] = 0;
        // Ordered LED coverage brings in red without colouring the paper.
        const threshold = (bayer[(x & 3) + (y & 3) * 4] + 0.5) / 16;
        if (morph > threshold) { pixels[i] = 5; shades[i] = 4; }
      }
    }
    // Hit box is the changing butt/heart region, in this returned pixel space.
    const shiftX = 0.55 * yaw * 10, shiftY = lean * 0.55;
    return { width: WIDTH, height: HEIGHT, pixels, shades, ready: true,
      hitBox: { x0: box.x0 / SCALE + shiftX, y0: box.y0 / SCALE + shiftY,
        x1: (box.x1 + 1) / SCALE + shiftX, y1: (box.y1 + 1) / SCALE + shiftY } };
  }

  global.PortfolioGorillaMotif = { ids: ['gorilla'], render };

  Promise.all([load(sourceURL), load(heartURL)]).then(([source, heart]) => {
    const ink = alpha(source), reference = alpha(heart);
    const originalHole = hole(ink, 0.40, 0.59, [0.14, 0.45, 0.66, 0.74]);
    const targetHole = hole(reference, 0.40, 0.56, [0.14, 0.42, 0.66, 0.70]);
    state = { ink, box: originalHole.box, original: signedDistance(originalHole.mask),
      heart: signedDistance(alignHeart(originalHole, targetHole)) };
    global.dispatchEvent(new CustomEvent('portfolio:gorilla-ready', {
      detail: { id: 'gorilla', width: WIDTH, height: HEIGHT, hitBox: render('gorilla', 0, 0).hitBox }
    }));
  }).catch(error => {
    console.warn('Original gorilla motif could not be sampled.', error);
  });
})(window);
