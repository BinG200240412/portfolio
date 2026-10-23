(function (global) {
  'use strict';

  const SIZE = 32;
  const TAU = Math.PI * 2;

  function raster() {
    const pixels = new Uint8Array(SIZE * SIZE);
    function dot(x, y, color) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) pixels[y * SIZE + x] = color;
    }
    function rect(x, y, w, h, color) {
      for (let j = Math.max(0, Math.ceil(y)); j < Math.min(SIZE, y + h); j++) {
        for (let i = Math.max(0, Math.ceil(x)); i < Math.min(SIZE, x + w); i++) pixels[j * SIZE + i] = color;
      }
    }
    function ellipse(cx, cy, rx, ry, color, angle) {
      if (rx <= 0 || ry <= 0) return;
      const a = angle || 0, c = Math.cos(a), s = Math.sin(a), reach = Math.max(rx, ry);
      for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(31, Math.ceil(cy + reach)); y++) {
        for (let x = Math.max(0, Math.floor(cx - reach)); x <= Math.min(31, Math.ceil(cx + reach)); x++) {
          const dx = x - cx, dy = y - cy, u = c * dx + s * dy, v = -s * dx + c * dy;
          if (u * u / (rx * rx) + v * v / (ry * ry) <= 1) pixels[y * SIZE + x] = color;
        }
      }
    }
    function circle(x, y, r, color) { ellipse(x, y, r, r, color); }
    function line(x0, y0, x1, y1, color, width) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      const radius = (width || 1) / 2;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (radius <= 0.5) dot(x, y, color); else circle(x, y, radius, color);
      }
    }
    function poly(points, color) {
      const ys = points.map(p => p[1]);
      for (let y = Math.max(0, Math.ceil(Math.min(...ys))); y <= Math.min(31, Math.floor(Math.max(...ys))); y++) {
        for (let x = 0; x < SIZE; x++) {
          let inside = false;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[i], b = points[j];
            if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
          }
          if (inside) pixels[y * SIZE + x] = color;
        }
      }
    }
    return { pixels, dot, rect, ellipse, circle, line, poly };
  }

  function phase(variant) {
    if (typeof variant === 'number' && Number.isFinite(variant)) return variant * 1.61803398875;
    const text = String(variant || '');
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return (h % 6283) / 1000;
  }
  function blink(t, p) {
    const q = ((t + p + 2.1) % 5.7 + 5.7) % 5.7;
    return q < 0.32 ? 1 - Math.sin(q / 0.32 * Math.PI) : 1;
  }

  function clock(r, t, p) {
    const x = 15.5, y = 15.5;
    r.circle(x, y, 13.5, 1);
    r.circle(x, y, 11.5, 3);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2;
      const inner = i % 3 === 0 ? 8.8 : 9.7;
      r.line(x + Math.cos(a) * inner, y + Math.sin(a) * inner,
        x + Math.cos(a) * 10.5, y + Math.sin(a) * 10.5, 2, 1);
    }
    const minute = t * 0.57 + p - 1.8, hour = t * 0.12 + p * 0.3 - 0.4;
    r.line(x, y, x + Math.cos(hour) * 5.7, y + Math.sin(hour) * 5.7, 1, 2.4);
    r.line(x, y, x + Math.cos(minute) * 8.8, y + Math.sin(minute) * 8.8, 1, 1.4);
    const second = t * 1.75 + p;
    r.line(x - Math.cos(second) * 2, y - Math.sin(second) * 2,
      x + Math.cos(second) * 8.2, y + Math.sin(second) * 8.2, 4, 1);
    r.circle(x, y, 1.4, 2);
  }

  function pharaohCat(r, t, p) {
    const turn = Math.sin(t * 0.58 + p) * 0.85, open = blink(t, p);
    r.poly([[8,6],[23,6],[27,11],[29,28],[23,30],[8,30],[3,28],[5,11]], 2);
    const hood = r.pixels.slice();
    for (let y = 11; y < 29; y += 4) {
      for (let j = y; j < y + 2; j++) for (let x = 0; x < SIZE; x++) {
        if (hood[j * SIZE + x] === 2 && (x < 11 || x >= 21)) r.pixels[j * SIZE + x] = 1;
      }
    }
    r.poly([[7 + turn,13],[6 + turn,1],[14 + turn,8]], 1);
    r.poly([[18 + turn,8],[26 + turn,1],[25 + turn,13]], 1);
    r.poly([[8 + turn,8],[8 + turn,4],[12 + turn,8]], 2);
    r.poly([[20 + turn,8],[24 + turn,4],[24 + turn,9]], 2);
    r.poly([[9 + turn,11],[12 + turn,7],[20 + turn,7],[23 + turn,11],
      [22 + turn,22],[19 + turn,27],[13 + turn,27],[10 + turn,22]], 3);
    r.line(10 + turn, 13, 14 + turn, 12, 1, 1);
    r.line(18 + turn, 12, 22 + turn, 13, 1, 1);
    if (open < 0.25) {
      r.line(11 + turn, 16, 14 + turn, 16, 1, 1);
      r.line(18 + turn, 16, 21 + turn, 16, 1, 1);
    } else {
      r.ellipse(12.5 + turn, 16, 2.2, 0.4 + open * 1.3, 1);
      r.ellipse(19.5 + turn, 16, 2.2, 0.4 + open * 1.3, 1);
      r.dot(12 + turn + Math.sin(t * 0.7 + p) * 0.7, 15, 2);
      r.dot(19 + turn + Math.sin(t * 0.7 + p) * 0.7, 15, 2);
    }
    r.poly([[14 + turn,20],[18 + turn,20],[16 + turn,22]], 2);
    r.line(16 + turn, 22, 16 + turn, 24, 1, 1);
    r.line(16 + turn, 24, 13 + turn, 23, 1, 1);
    r.line(16 + turn, 24, 19 + turn, 23, 1, 1);
    r.poly([[16,27],[18,29],[16,31],[14,29]], 4);
  }

  function gorilla(r, t, p) {
    const turn = Math.sin(t * 0.73 + p) * 1.25, open = blink(t, p + 1.3);
    const wave = Math.sin(t * 1.18 + p);
    r.poly([[8,19],[23,19],[27,24],[25,29],[21,31],[10,31],[6,28],[4,24]], 1);
    r.line(8, 21, 5, 24.5 - wave * 1.8, 1, 5);
    r.line(5, 24.5 - wave * 1.8, 4.5 + wave, 26.5 - wave * 1.7, 1, 4.5);
    r.line(23, 21, 26, 22.5 + wave * 1.8, 1, 5);
    r.line(26, 22.5 + wave * 1.8, 28, 24.5 + wave * 2.8, 1, 4.5);
    r.ellipse(4.5 + wave, 26.5 - wave * 1.7, 2.1, 1.8, 2);
    r.ellipse(28, 24.5 + wave * 2.8, 2.1, 1.8, 2);
    r.poly([[7 + turn,6],[11 + turn,2],[20 + turn,2],[24 + turn,6],
      [25 + turn,16],[22 + turn,21],[9 + turn,21],[6 + turn,16]], 1);
    r.ellipse(5.7 + turn, 13, 2.3, 2.8, 1);
    r.ellipse(25.3 + turn, 13, 2.3, 2.8, 1);
    r.ellipse(5.7 + turn, 13, 0.9, 1.2, 2);
    r.ellipse(25.3 + turn, 13, 0.9, 1.2, 2);
    r.poly([[8 + turn,11],[11 + turn,7],[20 + turn,7],[23 + turn,11],
      [23 + turn,17],[20 + turn,21],[11 + turn,21],[8 + turn,17]], 3);
    r.line(9 + turn, 10, 14 + turn, 11, 1, 2.4);
    r.line(17 + turn, 11, 22 + turn, 10, 1, 2.4);
    r.ellipse(11.5 + turn, 13, 1, 0.4 + open, 1);
    r.ellipse(19.5 + turn, 13, 1, 0.4 + open, 1);
    r.ellipse(15.5 + turn * 1.5, 17.5, 6, 4.1, 2);
    r.ellipse(13.5 + turn * 1.5, 16.5, 0.8, 1, 1);
    r.ellipse(17.5 + turn * 1.5, 16.5, 0.8, 1, 1);
    r.line(13 + turn * 1.5, 20, 18 + turn * 1.5, 20, 1, 1);
    r.poly([[13,25],[15.5,26.5],[18,25],[18,28],[15.5,30],[13,28]], 3);
  }

  function eye(r, t, p) {
    const open = blink(t, p), center = 16;
    r.line(7, 6, 5, 3, 2, 1);
    r.line(15.5, 4, 15.5, 1, 2, 1);
    r.line(24, 6, 26, 3, 2, 1);
    r.line(7, 26, 5, 29, 2, 1);
    r.line(15.5, 28, 15.5, 31, 2, 1);
    r.line(24, 26, 26, 29, 2, 1);
    const h = 0.6 + open * 7.6;
    r.poly([[1,center],[7,center-h*0.75],[12,center-h],[19,center-h],
      [25,center-h*0.75],[31,center],[25,center+h*0.75],[19,center+h],
      [12,center+h],[7,center+h*0.75]], 1);
    if (open > 0.15) {
      const inner = Math.max(0, h - 2);
      r.poly([[4,center],[9,center-inner*0.65],[14,center-inner],[18,center-inner],
        [23,center-inner*0.65],[28,center],[23,center+inner*0.65],[18,center+inner],
        [14,center+inner],[9,center+inner*0.65]], 3);
      const x = 15.5 + Math.sin(t * 0.83 + p) * 4.6, y = center + Math.sin(t * 0.47 + p) * 1.1;
      for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
        if (r.pixels[j * SIZE + i] !== 3) continue;
        const d = (i - x) ** 2 + (j - y) ** 2;
        if (d <= 25) r.pixels[j * SIZE + i] = d <= 5 ? 1 : 2;
      }
      if (open > 0.6) r.dot(x - 1, y - 2, 4);
    }
  }

  function hand(r, t, p) {
    const bend = Math.sin(t * 1.0 + p);
    r.rect(9, 16, 15, 10, 1);
    r.ellipse(16.5, 24, 8.5, 6, 1);
    r.poly([[11,25],[23,25],[22,31],[12,31]], 1);
    const fingers = [[10.5,17,10,11,9.4,6,0.7],[15.5,17,15.5,9,15.5,2,0],
      [20.5,17,21.5,11,22,5,1.4],[24,21,26,15,27,10,2.1]];
    fingers.forEach(f => {
      const curl = Math.sin(t * 1.0 + p + f[6]);
      r.line(f[0], f[1], f[2], f[3], 1, 3.8);
      r.line(f[2], f[3], f[4] + curl * 1.15, f[5] + (curl + 1) * 0.7, 1, 3.8);
    });
    r.line(10, 24, 6, 20, 1, 4.6);
    r.line(6, 20, 3 + bend * 0.9, 15.5 - bend, 1, 4.4);
    r.line(12, 28, 21, 28, 2, 1);
    r.poly([[11,22],[14,19],[19,19],[23,22],[19,25],[14,25]], 2);
    r.ellipse(17 + Math.sin(t * 0.63 + p), 22, 1.7, 2.0, 4);
    r.dot(17 + Math.sin(t * 0.63 + p), 21, 3);
  }

  function flower(r, t, p) {
    r.line(16, 22, 14.5 + Math.sin(t * 0.8 + p) * 0.7, 31, 1, 2);
    r.poly([[15,29],[9,28],[6,24],[11,24],[16,27]], 2);
    r.poly([[15,27],[20,23],[25,23],[23,27],[17,30]], 1);
    const rot = t * 0.13 + p * 0.5;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + rot;
      const spread = 7.4 + Math.sin(t * 1.1 + p + i * 0.7) * 0.65;
      r.ellipse(15.5 + Math.cos(a) * spread, 13.7 + Math.sin(a) * spread,
        5.5, 3.2 + Math.sin(t * 0.7 + i) * 0.25, i % 2 ? 1 : 2, a);
    }
    r.circle(15.5, 13.7, 4.2, 3);
    r.circle(15.5, 13.7, 2, 4);
    r.dot(15, 13, 1); r.dot(17, 14, 1);
  }

  const drawings = Object.freeze({ clock, 'pharaoh-cat': pharaohCat, gorilla, eye, hand, flower });
  function render(id, time, variant) {
    const r = raster(), t = Number.isFinite(time) ? time : 0;
    if (Object.prototype.hasOwnProperty.call(drawings, id)) drawings[id](r, t, phase(variant));
    return { width: SIZE, height: SIZE, pixels: r.pixels };
  }

  global.PortfolioMatrixMotifs = Object.freeze({ render, ids: Object.freeze(Object.keys(drawings)) });
})(window);
