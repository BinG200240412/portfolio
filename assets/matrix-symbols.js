(() => {
  const W = 32, H = 32, TAU = Math.PI * 2;
  function painter() {
    const pixels = new Uint8Array(W * H);
    const put = (x, y, c = 1) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) pixels[y * W + x] = c; };
    const ellipse = (cx, cy, rx, ry, c = 1) => {
      for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(31, Math.ceil(cy + ry)); y++)
        for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(31, Math.ceil(cx + rx)); x++)
          if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1) put(x, y, c);
    };
    const line = (x1, y1, x2, y2, c = 1, thickness = 1) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
      for (let k = 0; k <= n; k++) ellipse(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n, thickness / 2, thickness / 2, c);
    };
    const poly = (points, c = 1) => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i], [xj, yj] = points[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) put(x, y, c);
      }
    };
    const rect = (x, y, w, h, c = 1) => poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]], c);
    return { pixels, put, ellipse, line, poly, rect };
  }
  function render(id, time, variant = 0) {
    const p = painter(), t = time + variant * .71;
    const { ellipse, line, poly, rect } = p;
    if (id === 'heart') {
      const pulse = 1 + .035 * Math.sin(t * 2);
      const vertices = [];
      for (let i = 0; i < 80; i++) {
        const a = i / 80 * TAU;
        vertices.push([16 + .77 * pulse * 16 * Math.sin(a) ** 3,
          16 - .77 * pulse * (13 * Math.cos(a) - 5 * Math.cos(2*a) - 2 * Math.cos(3*a) - Math.cos(4*a))]);
      }
      poly(vertices, 1);
      line(8, 11, 11, 8, 3, 2);
      line(26, 3, 26, 7, 2); line(24, 5, 28, 5, 2);
    } else if (id === 'star') {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5 + .12 * Math.sin(t * .8);
        const r = i % 2 ? 6 : 14;
        points.push([16 + r * Math.cos(a), 16 + r * Math.sin(a)]);
      }
      poly(points, 1);
      const blink = Math.sin(t * .7) > .97;
      rect(12, 13, 2, blink ? 1 : 3, 3); rect(19, 13, 2, blink ? 1 : 3, 3);
      line(14, 20, 18, 20, 2, 1);
    } else if (id === 'moon') {
      ellipse(14, 17, 12, 13, 1); ellipse(20, 12, 11, 12, 0);
      line(26, 15, 26, 21, 2); line(23, 18, 29, 18, 2);
      line(24, 3, 24, 7, 3); line(22, 5, 26, 5, 3);
      if (Math.sin(t) > -.4) { line(29, 26, 29, 30, 2); line(27, 28, 31, 28, 2); }
    } else if (id === 'spiral') {
      for (let i = 1; i <= 150; i++) {
        const a = i / 150 * Math.PI * 5.3 + t * .34;
        const b = (i - 1) / 150 * Math.PI * 5.3 + t * .34;
        const r = 1 + i / 150 * 12, r0 = 1 + (i - 1) / 150 * 12;
        line(16 + r0 * Math.cos(b), 16 + r0 * Math.sin(b), 16 + r * Math.cos(a), 16 + r * Math.sin(a), 1, 1.7);
      }
      ellipse(16, 16, 1.3, 1.3, 2);
    } else if (id === 'butterfly') {
      const wing = .62 + .38 * (.5 + .5 * Math.sin(t * 1.5));
      for (const side of [-1, 1]) {
        ellipse(16 + side * 7 * wing, 11, 7.5 * wing, 8, 1);
        ellipse(16 + side * 6 * wing, 22, 6 * wing, 6.5, 2);
        ellipse(16 + side * 8 * wing, 10, 2 * wing, 3, 3);
        ellipse(16 + side * 7 * wing, 22, 1.5 * wing, 2, 1);
      }
      ellipse(16, 17, 1.7, 10, 3);
      line(16, 8, 12, 3, 3); line(16, 8, 20, 3, 3);
    } else if (id === 'bolt') {
      poly([[17,2],[5,18],[13,18],[10,30],[27,12],[19,12],[24,2]], 1);
      line(3, 6, 7, 9, 2); line(26, 23, 30, 25, 2);
      if (Math.sin(t * 1.2) > 0) { line(4, 26, 7, 23, 3); line(27, 3, 29, 1, 3); }
    } else if (id === 'dice') {
      rect(4, 4, 24, 24, 1); rect(7, 7, 18, 18, 2);
      const value = 1 + Math.floor((time * .36 + variant) % 6);
      const pip = (x,y) => ellipse(x,y,1.8,1.8,3);
      if (value % 2) pip(16,16);
      if (value >= 2) { pip(11,11); pip(21,21); }
      if (value >= 4) { pip(21,11); pip(11,21); }
      if (value === 6) { pip(11,16); pip(21,16); }
    } else if (id === 'orbit') {
      ellipse(16, 16, 8, 8, 1); ellipse(13, 13, 2, 2, 2);
      const rot = -.45 + .08 * Math.sin(t * .5);
      for (let i = 0; i < 100; i++) {
        const a = i / 100 * TAU;
        const x = 14 * Math.cos(a), y = 5 * Math.sin(a);
        p.put(16+x*Math.cos(rot)-y*Math.sin(rot),16+x*Math.sin(rot)+y*Math.cos(rot),3);
      }
      const a = t * .55;
      ellipse(16+13*Math.cos(a),16+11*Math.sin(a),2,2,2);
    } else if (id === 'art') {
      const glyphs = ['01110/11011/11011/11111/11011/11011/11011',
        '11110/11011/11011/11110/11100/11010/11011','11111/11111/00100/00100/00100/00100/00100'];
      glyphs.forEach((g, k) => g.split('/').forEach((row,y) => [...row].forEach((bit,x) => {
        if (bit === '1') rect(3 + k * 9 + x * 1.4, 9 + y * 1.8 + Math.round(Math.sin(t * 1.2 - k * .9)), 1.5, 1.9, k % 2 ? 2 : 1);
      })));
      line(3, 26, 29, 26, 3, 1);
      line(5, 3, 5, 6, 2); line(3, 4.5, 7, 4.5, 2);
    } else if (id === 'seal') {
      const rot = t * .16;
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + rot;
        line(16 + 9*Math.cos(a),16+9*Math.sin(a),16+14*Math.cos(a),16+14*Math.sin(a),1,2);
      }
      ellipse(16,16,8,8,1); ellipse(16,16,6,6,0);
      poly([[16,9],[22,20],[10,20]],2);
      ellipse(16,16,1.4,1.4,3);
    }
    return { width: W, height: H, pixels: p.pixels };
  }
  window.PortfolioMatrixSymbols = { ids: ['heart','star','moon','spiral','butterfly','bolt','dice','orbit','art','seal'], render };
})();
