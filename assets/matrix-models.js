(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, n) => a.map(v => v * n);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => { const n = Math.hypot(...a); return n > 1e-9 ? mul(a, 1 / n) : [0, 1, 0]; };

  function mesh() {
    const vertices = [], faces = [];
    const vertex = p => { vertices.push(p); return vertices.length - 1; };
    const face = (indices, role) => faces.push({ indices, role });

    function box(cx, cy, cz, w, h, d, role, side) {
      const ids = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
        .map(p => vertex([cx + p[0] * w / 2, cy + p[1] * h / 2, cz + p[2] * d / 2]));
      const panels = [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]];
      panels.forEach((p, i) => face(p.map(j => ids[j]), i === 5 ? role : (side || role)));
    }

    function bridge(a, b, role, side) {
      for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        face([a[i], a[j], b[j], b[i]], side && i % 2 ? side : role);
      }
    }

    function prism(a, b, radius, role, cap, segments, side, aspect) {
      const n = segments || 12, dir = unit(sub(b, a));
      const reference = Math.abs(dir[2]) < 0.9 ? [0,0,1] : [0,1,0];
      const u = unit(cross(reference, dir)), v = unit(cross(dir, u));
      const rings = [a, b].map(center => Array.from({ length: n }, (_, i) => {
        const angle = i / n * TAU;
        return vertex(add(center, add(mul(u, Math.cos(angle) * radius), mul(v, Math.sin(angle) * radius * (aspect || 1)))));
      }));
      bridge(rings[0], rings[1], role, side);
      face(rings[0].slice().reverse(), cap || role);
      face(rings[1].slice(), cap || role);
    }

    function roundedPoints(w, h, r, count) {
      const corners = [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]];
      const points = [];
      corners.forEach(c => {
        for (let i = 0; i <= count; i++) {
          const a = c[2] + i / count * Math.PI / 2;
          points.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
        }
      });
      return points;
    }

    function roundedPrism(cx, cy, w, h, radius, back, front, role, side, corners) {
      const outline = roundedPoints(w, h, radius, corners || 6);
      const rings = [back, front].map(z => outline.map(p => {
        const x = cx + p[0], y = cy + p[1];
        return vertex([x, y, typeof z === 'function' ? z(x, y) : z]);
      }));
      bridge(rings[0], rings[1], side || role);
      face(rings[0].slice().reverse(), side || role);
      face(rings[1], role);
    }

    function band(points, width, thickness, role, side) {
      const rings = points.map((p, i) => {
        const dir = unit(sub(points[Math.min(points.length - 1, i + 1)], points[Math.max(0, i - 1)]));
        const u = Math.abs(dir[0]) < 0.9 ? [1,0,0] : [0,1,0];
        const v = unit(cross(dir, u));
        const across = unit(cross(v, dir));
        return [[1,1],[-1,1],[-1,-1],[1,-1]].map(q =>
          vertex(add(p, add(mul(across, q[0] * width / 2), mul(v, q[1] * thickness / 2)))));
      });
      for (let i = 0; i < rings.length - 1; i++) bridge(rings[i], rings[i + 1], role, side);
      face(rings[0].slice().reverse(), role);
      face(rings[rings.length - 1], role);
    }

    return { vertices, faces, vertex, face, box, prism, roundedPoints, roundedPrism, bridge, band };
  }

  function variantPhase(variant) {
    if (typeof variant === 'number' && Number.isFinite(variant)) return variant * 1.61803398875;
    let value = 0;
    for (const c of String(variant || '')) value = (value * 31 + c.charCodeAt(0)) >>> 0;
    return (value % 6283) / 1000;
  }

  function robotDog(m, time, phase, reaction = 0, hover = 0, gaitPhase = time * .55) {
    m.box(-0.03, 0.32, 0, 1.37, 0.31, 0.55, 1, 6);
    m.box(-0.06, 0.496, 0, 1.12, 0.045, 0.43, 6, 1);
    m.box(-0.17, 0.524, 0, 0.56, 0.018, 0.28, 7);
    for (let i = 0; i < 4; i++) m.box(-0.34 + i * 0.115, 0.538, 0, 0.045, 0.012, 0.18, 3);
    m.box(0.39, 0.524, 0, 0.18, 0.018, 0.21, 4);
    m.box(-0.57, 0.34, 0, 0.10, 0.19, 0.59, 7);
    m.box(-0.12, 0.35, 0.283, 0.32, 0.065, 0.014, 4);
    m.box(-0.12, 0.35, -0.283, 0.32, 0.065, 0.014, 4);
    m.box(0.43, 0.36, 0.286, 0.045, 0.10, 0.019, 5);
    m.box(0.43, 0.36, -0.286, 0.045, 0.10, 0.019, 5);

    const headStart = m.vertices.length;
    m.box(0.69, 0.35, 0, 0.20, 0.12, 0.25, 7);
    m.box(0.83, 0.37, 0, 0.28, 0.24, 0.43, 6, 1);
    m.box(0.978, 0.37, 0, 0.022, 0.175, 0.35, 3);
    [-0.105, 0.105].forEach(z => {
      m.prism([0.986,0.385,z],[1.013,0.385,z],0.054,7,7,12);
      m.prism([1.014,0.385,z],[1.021,0.385,z],0.036,3,3,12);
      m.box(1.026, 0.399, z - 0.009, 0.006, 0.012, 0.012, 8);
    });
    m.box(0.999, 0.315, 0, 0.010, 0.019, 0.050, 4);
    // All neck, sensor and head vertices rotate together about the neck joint.
    const sway = hover * Math.sin(gaitPhase);
    const crouch = hover * (.025 + .045 * (.5 + .5 * Math.sin(gaitPhase * .8)));
    const raise = reaction * .38 + hover * (.08 + .09 * Math.sin(gaitPhase * .85)), c = Math.cos(raise), sn = Math.sin(raise);
    if (raise) for (let i=headStart;i<m.vertices.length;i++) {
      const v=m.vertices[i],x=v[0]-.63,y=v[1]-.35;
      v[0]=.63+x*c-y*sn;v[1]=.35+x*sn+y*c;
    }
    // The body rocks and the rear legs settle in place; no running stride.
    for (const v of m.vertices) { v[0] += sway * .035; v[1] -= crouch; }

    for (let front = 0; front < 2; front++) for (let side = 0; side < 2; side++) {
      const isFront = front === 1, sign = side === 0 ? -1 : 1;
      const x = isFront ? 0.47 : -0.49, z = sign * 0.355;
      const step = gaitPhase + phase + ((front + side) % 2) * Math.PI;
      const hip = [x + sway * .035,0.19 - crouch,z];
      const pawLift = isFront ? reaction * (side === 1 ? .25 : .06) : 0;
      const foot = [x + hover * Math.sin(step) * .022 + (isFront ? .07 : -.025) * reaction,
        -0.72 + hover * Math.max(0,Math.cos(step)) * .018 + pawLift, z];
      const dx = foot[0] - hip[0], dy = foot[1] - hip[1], distance = Math.hypot(dx, dy);
      const upper = 0.46, lower = 0.49;
      const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
      const bend = Math.sqrt(Math.max(0, upper * upper - along * along)) * (isFront ? 1 : -1);
      const knee = [hip[0] + dx / distance * along - dy / distance * bend,
        hip[1] + dy / distance * along + dx / distance * bend, z];

      m.prism([hip[0],hip[1],z-0.075],[hip[0],hip[1],z+0.075],0.106,1,7,12);
      m.prism(hip,knee,0.071,6,1,4,7);
      m.prism([knee[0],knee[1],z-0.071],[knee[0],knee[1],z+0.071],0.077,6,3,12);
      m.prism(knee,foot,0.047,1,7,4,6);
      const pistonA = add(add(hip,mul(sub(knee,hip),0.32)),[0,0,sign*0.062]);
      const pistonB = add(add(knee,mul(sub(foot,knee),0.44)),[0,0,sign*0.062]);
      const pistonMid = add(pistonA,mul(sub(pistonB,pistonA),0.60));
      m.prism(pistonA,pistonMid,0.025,7,7,6);
      m.prism(pistonMid,pistonB,0.013,8,6,6);
      m.box(foot[0]+0.025,foot[1]-0.025,z,0.22,0.075,0.17,3);
      m.box(foot[0]+0.025,foot[1]+0.019,z,0.14,0.014,0.13,6);
    }
  }

  function quest3(m) {
    const cy = 0.035;
    const surface = (x, y) => 0.415 - 0.17 * (x / 0.92) ** 2 - 0.035 * ((y - cy) / 0.44) ** 2;
    const outline = m.roundedPoints(1.84, 0.88, 0.265, 7);
    const back = outline.map(p => m.vertex([p[0]*0.945,cy+p[1]*0.925,-0.105-0.055*(p[0]/0.92)**2]));
    const edge = outline.map(p => m.vertex([p[0],cy+p[1],surface(p[0],cy+p[1])-0.018]));
    m.bridge(back,edge,6);
    let previous = edge;
    [0.94,0.65,0.32].forEach(scale => {
      const ring = outline.map(p => {
        const x = p[0] * scale, y = cy + p[1] * scale;
        return m.vertex([x,y,surface(x,y)]);
      });
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        m.face([previous[i],previous[j],ring[j],ring[i]],2);
      }
      previous = ring;
    });
    const center = m.vertex([0,cy,surface(0,cy)]);
    for (let i = 0; i < previous.length; i++) m.face([previous[i],previous[(i+1)%previous.length],center],2);
    m.face(back.slice().reverse(),7);

    [-0.56,0,0.56].forEach((x,index) => {
      const front = (px,py) => surface(px,py) + 0.035;
      m.roundedPrism(x,cy,0.176,0.485,0.085,
        (px,py)=>surface(px,py)+0.007,front,3,7,6);
      if (index !== 1) {
        [-0.105,0.105].forEach(y => {
          const z = front(x,cy+y);
          m.prism([x,cy+y,z+0.001],[x,cy+y,z+0.010],0.040,7,7,16);
          m.prism([x,cy+y,z+0.011],[x,cy+y,z+0.014],0.025,3,3,12);
          m.box(x-0.010,cy+y+0.012,z+0.017,0.010,0.010,0.005,8);
        });
      } else {
        m.roundedPrism(x,cy+0.092,0.052,0.087,0.018,
          front(x,cy+0.092)+0.001,front(x,cy+0.092)+0.009,6,7,3);
        m.prism([x,cy-0.105,front(x,cy-0.105)+0.001],
          [x,cy-0.105,front(x,cy-0.105)+0.010],0.029,4,4,12);
      }
    });

    m.roundedPrism(0,cy,1.69,0.775,0.245,-0.305,-0.125,3,7,7);
    [-0.38,0.38].forEach(x => {
      m.prism([x,cy+0.015,-0.345],[x,cy+0.015,-0.306],0.292,1,1,24,7,0.78);
      m.prism([x,cy+0.015,-0.351],[x,cy+0.015,-0.346],0.247,3,3,24,null,0.76);
      m.prism([x-0.085,cy+0.083,-0.356],[x-0.085,cy+0.083,-0.352],0.024,8,8,10);
    });

    [-1,1].forEach(sign => {
      m.prism([sign*0.805,cy+0.04,-0.045],[sign*0.922,cy+0.04,-0.045],0.123,6,2,16);
      m.box(sign*0.887,cy+0.04,-0.18,0.105,0.145,0.30,2,6);
    });
    const sideRings = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const angle = i / steps * Math.PI, y = 0.105 + Math.sin(angle) * 0.055;
      sideRings.push([[0.91,0.81,0.08],[0.91,0.81,-0.08],[0.85,0.75,-0.08],[0.85,0.75,0.08]].map(v =>
        m.vertex([Math.cos(angle)*v[0],y+v[2],-0.19-Math.sin(angle)*v[1]])));
    }
    for (let i = 0; i < steps; i++) m.bridge(sideRings[i],sideRings[i+1],2,6);
    m.face(sideRings[0].slice().reverse(),2);
    m.face(sideRings[steps],2);

    const controls = [[0,0.435,-0.06],[0,0.80,-0.23],[0,0.79,-0.87],[0,0.20,-0.97]];
    const arch = Array.from({ length: 21 },(_,i) => {
      const t = i / 20, s = 1 - t;
      return [0,1,2].map(k => controls[0][k]*s*s*s+3*controls[1][k]*s*s*t+3*controls[2][k]*s*t*t+controls[3][k]*t*t*t);
    });
    m.band(arch,0.145,0.043,2,6);
    m.box(0,0.207,-0.978,0.21,0.14,0.065,6,2);
    m.box(-0.47,-0.414,0.025,0.105,0.023,0.10,7);
    m.box(0.40,0.484,-0.025,0.14,0.027,0.075,6);
    m.box(0.0,0.27,surface(0,0.27)+0.006,0.025,0.012,0.012,8);
  }

  const ids = Object.freeze(['robot-dog','quest-3']);
  function build(id, time, variant, options = {}) {
    const m = mesh(), input = options || {};
    const active = Number.isFinite(input.active) ? Math.max(0,Math.min(1,input.active)) : 0;
    const hover = !input.reduced && Number.isFinite(input.hover) ? Math.max(0,Math.min(1,input.hover)) : 0;
    const seconds = input.reduced ? 0 : Number.isFinite(time) ? time : 0;
    const reaction = active > 0 ? input.reduced ? .72 : Math.sin(active * Math.PI * .85) : 0;
    if (id === 'robot-dog') robotDog(m,seconds,variantPhase(variant),reaction,hover,
      Number.isFinite(input.gaitPhase) ? input.gaitPhase : seconds * .55);
    if (id === 'quest-3') quest3(m);
    return { vertices: m.vertices, faces: m.faces };
  }

  global.PortfolioMatrixModels = Object.freeze({ ids, build });
})(window);
