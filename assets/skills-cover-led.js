/* The homepage SKILL marquee, enlarged into a suspended shopfront sign.
 * Geometry consists only of individually drawn LED dots, without font assets. */
(() => {
  'use strict';
  const glyphs = {
    S: ['01110','11001','11000','01110','00011','10011','01110'],
    K: ['11001','11011','11110','11100','11110','11011','11001'],
    I: ['11111','00100','00100','00100','00100','00100','11111'],
    L: ['11000','11000','11000','11000','11000','11000','11111'],
  };
  const points = [];
  const point = (x, y, z, radius = 1, role = 1, alpha = 1, phase = -1) =>
    points.push({ x, y, z, radius, role, alpha, phase });
  function line(a, b, gap, radius, role, alpha = 1) {
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / gap);
    for (let i = 0; i <= count; i++) {
      const t = i / Math.max(count, 1);
      point(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t, radius, role, alpha);
    }
  }
  function perimeter(width, height, corner, z, role, radius, chasing = false) {
    const positions = [];
    const a = width / 2 - corner, b = height / 2 - corner;
    const corners = [[a, -b, -Math.PI / 2], [a, b, 0], [-a, b, Math.PI / 2], [-a, -b, Math.PI]];
    corners.forEach(([cx, cy, start], side) => {
      for (let i = 0; i < 4; i++) {
        const angle = start + i / 3 * Math.PI / 2;
        positions.push([cx + Math.cos(angle) * corner, cy + Math.sin(angle) * corner]);
      }
      const end = positions[positions.length - 1];
      const next = corners[(side + 1) % 4];
      const target = [next[0] + Math.cos(next[2]) * corner, next[1] + Math.sin(next[2]) * corner];
      const count = Math.floor(Math.hypot(target[0] - end[0], target[1] - end[1]) / 7.5);
      for (let i = 1; i < count; i++) positions.push([end[0] + (target[0] - end[0]) * i / count, end[1] + (target[1] - end[1]) * i / count]);
    });
    positions.forEach(([x, y], index) => point(x, y + 2, z, radius, role, 1, chasing ? index / positions.length : -1));
  }

  // Mounting plate, cantilever arm and a light triangular brace.
  for (const x of [151, 159]) line([x, -186, -28], [x, -121, -28], 5, .95, 2, .65);
  line([155, -174, -28], [-121, -174, -28], 5, 1.05, 1, .77);
  line([155, -148, -28], [53, -174, -28], 5, .9, 2, .55);
  line([-123, -171, -28], [-123, -110, -28], 5, 1, 1, .8);
  line([121, -171, -28], [121, -110, -28], 5, 1, 1, .8);
  for (const x of [-123, 121]) {
    for (let i = 0; i < 15; i++) {
      const angle = i / 15 * Math.PI * 2;
      point(x + Math.cos(angle) * 5.5, -101 + Math.sin(angle) * 10, 0, 1.05, 2, .85);
    }
    line([x, -91, 0], [x, -73, 13], 4, 1, 1, .8);
  }
  // Back shell, shallow extrusion and face matrix. The dots retain their gaps.
  perimeter(327, 155, 13, -13, 2, .8);
  for (let x = -153; x <= 153; x += 9) {
    line([x, -76, -12], [x, -76, 15], 6, .65, 2, .52);
    line([x, 79, -12], [x, 79, 15], 6, .65, 2, .46);
  }
  for (let y = -65; y <= 66; y += 8) {
    line([-163, y, -12], [-163, y, 15], 6, .7, 2, .4);
    line([163, y, -12], [163, y, 15], 6, .7, 2, .55);
  }
  for (let y = -54; y <= 57; y += 7.8) {
    for (let x = -143; x <= 145; x += 7.8) point(x, y + 2, 15, .65, 0, .38);
  }
  perimeter(327, 155, 13, 16, 1, 1.3);
  perimeter(305, 133, 9, 17, 2, .72);
  perimeter(343, 171, 17, 17, 2, 1.65, true);

  const pitch = 7.8, letterWidth = 5 * pitch, advance = 51.5;
  'SKILL'.split('').forEach((letter, index) => {
    glyphs[letter].forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '1') point(-122 + index * advance + x * pitch, -32 + y * pitch, 21,
          2.05, 1, 1, 2 + index);
      });
    });
  });
  // Three small signal bars echo the three work streams below, without new labels.
  for (let group = 0; group < 3; group++) {
    for (let x = 0; x < 5; x++) point(-41 + group * 34 + x * 4, 45, 20, .95, group === 1 ? 3 : 2, .8);
  }

  window.PortfolioCoverDots.register('skills', frame => {
    const { width, height, dot, reduced } = frame;
    if (width <= 0 || height <= 0) return;
    const time = reduced ? 0 : frame.time;
    const scale = Math.min(width / 395, height / 330);
    const yaw = .17 + Math.sin(time * .31) * .025;
    const roll = -.045 + Math.sin(time * .39) * .007;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
    const chase = (time * .075) % 1;
    const liveLetter = Math.floor(time * .45) % 5;
    for (const p of points) {
      const x = p.x * cy + p.z * sy;
      const depth = p.z * cy - p.x * sy;
      const y = p.y - depth * .12;
      const perspective = 850 / (850 + depth);
      const px = (x * cr - y * sr) * perspective;
      const py = (x * sr + y * cr) * perspective;
      let role = p.role, alpha = p.alpha, radius = p.radius;
      if (p.phase >= 0 && p.phase <= 1) {
        const distance = ((p.phase - chase) % 1 + 1) % 1;
        const lamp = distance < .1 ? 1 - distance / .1 : 0;
        role = lamp > .12 ? 3 : 2;
        alpha = .55 + lamp * .45;
        radius += lamp * .42;
      } else if (p.phase >= 2) {
        const letter = p.phase - 2;
        role = letter === liveLetter && !reduced ? 3 : 1;
        alpha = letter === liveLetter ? 1 : .9;
      }
      dot(width * .5 + px * scale, height * .62 + py * scale, Math.max(.45, radius * scale), role, alpha);
    }
  });
})();
