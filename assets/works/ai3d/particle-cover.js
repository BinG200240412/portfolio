/* Original Liangzhu points, with a fixed composition and pointer-controlled view. */
(() => {
  'use strict';
  const root = document.querySelector('[data-particle-cover]');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const status = root.querySelector('[data-cover-status]');
  const assetURL = new URL('liangzhu-village.ply', document.currentScript.src);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = {
    zh: { loading: '正在展开这片良渚', failed: '粒子暂时无法载入，请刷新页面重试。', unavailable: '当前浏览器未能启用三维渲染，请开启硬件加速后重试。', lost: '三维渲染已暂停，正在等待恢复。', canvas: '可交互的良渚粒子封面。移动鼠标调整视角，触屏横向拖动，或使用方向键。' },
    en: { loading: 'Unfolding Liangzhu', failed: 'The particles could not load. Refresh this page to try again.', unavailable: '3D rendering is unavailable. Enable hardware acceleration to view this cover.', lost: '3D rendering is paused, waiting for recovery.', canvas: 'Interactive Liangzhu particle cover. Move the pointer to change the view, drag horizontally on touchscreens, or use the arrow keys.' }
  };
  // Full density, zero drift/scatter, and the previous zoom control's farthest distance.
  // Point positions stay unchanged; only the camera angle responds to input.
  const subject = [0, -.3, 1.85];
  const home = Object.freeze({ yaw: -.035, pitch: .18, distance: 4 });
  const target = { yaw: home.yaw, pitch: home.pitch };
  const camera = { ...target };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const tr = key => words[window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'][key];
  let statusKey = 'loading';
  function syncLabels() {
    canvas.setAttribute('aria-label', tr('canvas'));
    if (!status.hidden) status.textContent = tr(statusKey);
  }
  function setStatus(key) { statusKey = key; status.hidden = false; status.textContent = tr(key); }
  addEventListener('portfolio:language', syncLabels);
  syncLabels();

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) { setStatus('unavailable'); return; }
  let ready = false, lost = false, onScreen = true, raf = 0, last = 0;
  let width = 1, height = 1, dpr = 1, frame = 0;
  let points, program, uniforms, buffers = [], shaders = [];
  let dragging = false, previousX = 0;

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition; attribute vec4 aColor; attribute float aSeed;
    uniform mat4 uView; uniform mat4 uProjection;
    uniform float uDpr;
    varying vec4 vColor;
    void main() {
      vec4 view = uView * vec4(aPosition, 1.);
      gl_Position = uProjection * view;
      gl_PointSize = clamp(1.8 * uDpr * (.85 + aSeed * .3) * clamp(2.5 / max(-view.z, .1), .55, 1.65), 1., 5. * uDpr);
      float heightFade = 1. - smoothstep(2.8, 11., aPosition.y);
      float farFade = 1. - smoothstep(20., 45., length(aPosition.xz));
      vColor = vec4(aColor.rgb * 1.04, (.88 + .12 * aColor.a) * heightFade * farFade);
    }`;
  const fragmentSource = `
    precision mediump float; varying vec4 vColor;
    void main() {
      float r = length(gl_PointCoord - .5);
      float alpha = vColor.a * (1. - smoothstep(.35, .5, r));
      if (r > .5 || alpha < .25) discard;
      gl_FragColor = vec4(vColor.rgb, alpha);
    }`;

  function parsePLY(buffer) {
    const beginning = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1024)));
    const end = beginning.indexOf('end_header\n');
    const match = beginning.match(/element vertex (\d+)\n/);
    const properties = 'property float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nproperty uchar alpha\n';
    if (end < 0 || !match || !beginning.startsWith('ply\nformat binary_little_endian 1.0\n') || !beginning.includes(properties)) throw new Error('Unsupported Liangzhu PLY layout');
    const count = Number(match[1]), offset = end + 'end_header\n'.length;
    if (!Number.isSafeInteger(count) || count <= 0 || count > 500000 || buffer.byteLength !== offset + count * 16) throw new Error('Invalid Liangzhu point data');
    const source = new DataView(buffer), bytes = new Uint8Array(buffer);
    const positions = new Float32Array(count * 3), colors = new Uint8Array(count * 4), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const at = offset + i * 16;
      const x = source.getFloat32(at, true), y = source.getFloat32(at + 4, true), z = source.getFloat32(at + 8, true);
      if (![x, y, z].every(Number.isFinite)) throw new Error('Invalid point coordinate');
      positions.set([x, -y, z], i * 3);
      colors.set(bytes.subarray(at + 12, at + 16), i * 4);
      seeds[i] = ((i * 16807) % 2147483647) / 2147483647;
    }
    return { count, positions, colors, seeds };
  }
  function compile(type, source) {
    const shader = gl.createShader(type); shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function attribute(name, values, size, type, normalized) {
    const buffer = gl.createBuffer(); buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
    const index = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, size, type, normalized, 0, 0);
  }
  function initializeGPU() {
    buffers = []; shaders = [];
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    attribute('aPosition', points.positions, 3, gl.FLOAT, false);
    attribute('aColor', points.colors, 4, gl.UNSIGNED_BYTE, true);
    attribute('aSeed', points.seeds, 1, gl.FLOAT, false);
    uniforms = Object.fromEntries(['uView', 'uProjection', 'uDpr'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.clearColor(6 / 255, 8 / 255, 8 / 255, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    resize();
  }
  function lookAt(eye, target) {
    const z = eye.map((n, i) => n - target[i]);
    let length = Math.hypot(...z); z.forEach((_, i) => { z[i] /= length; });
    const x = [z[2], 0, -z[0]]; length = Math.hypot(...x); x.forEach((_, i) => { x[i] /= length; });
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const dot = a => a.reduce((sum, n, i) => sum + n * eye[i], 0);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1]);
  }
  function projection() {
    const f = 1 / Math.tan((width < 640 ? 52 : 44) * Math.PI / 360), near = .06, far = 100;
    return new Float32Array([f / (width / height), 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
  }
  function resize() {
    width = Math.max(1, root.clientWidth); height = Math.max(1, root.clientHeight);
    dpr = Math.min(devicePixelRatio || 1, width < 640 ? 1.4 : 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestRender();
  }
  function requestRender() {
    if (ready && !lost && !raf && onScreen && !document.hidden) raf = requestAnimationFrame(render);
  }
  function suspend() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function render(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .06) : 0; last = now;
    const ease = reducedMotion.matches ? 1 : Math.min(1, 1 - Math.exp(-Math.max(dt, 1 / 60) * 9));
    let settling = false;
    for (const key of ['yaw', 'pitch']) {
      camera[key] += (target[key] - camera[key]) * ease;
      if (Math.abs(target[key] - camera[key]) > .0001) settling = true;
      else camera[key] = target[key];
    }
    const { yaw, pitch } = camera, r = home.distance;
    const eye = [subject[0] + Math.sin(yaw) * Math.cos(pitch) * r, subject[1] + Math.sin(pitch) * r, subject[2] - Math.cos(yaw) * Math.cos(pitch) * r];
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.uView, false, lookAt(eye, subject));
    gl.uniformMatrix4fv(uniforms.uProjection, false, projection());
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, points.count);
    canvas.dataset.frames = String(++frame); canvas.dataset.points = String(points.count);
    if (settling) requestRender();
    else last = 0;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse') return;
    dragging = true; previousX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') {
      const bounds = canvas.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / width, 0, 1) - .5;
      const y = clamp((event.clientY - bounds.top) / height, 0, 1) - .5;
      target.yaw = home.yaw + x * .32;
      target.pitch = home.pitch + y * .14;
    } else if (dragging) {
      target.yaw = clamp(target.yaw - (event.clientX - previousX) * .0015, home.yaw - .16, home.yaw + .16);
      previousX = event.clientX;
    }
    requestRender();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { dragging = false; });
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    Object.assign(target, { yaw: home.yaw, pitch: home.pitch }); requestRender();
  });
  canvas.addEventListener('keydown', event => {
    const keys = {
      ArrowLeft: () => { target.yaw = clamp(target.yaw - .04, home.yaw - .16, home.yaw + .16); },
      ArrowRight: () => { target.yaw = clamp(target.yaw + .04, home.yaw - .16, home.yaw + .16); },
      ArrowUp: () => { target.pitch = clamp(target.pitch + .025, home.pitch - .07, home.pitch + .07); },
      ArrowDown: () => { target.pitch = clamp(target.pitch - .025, home.pitch - .07, home.pitch + .07); }
    };
    if (!keys[event.key]) return;
    event.preventDefault(); keys[event.key]();
    requestRender();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else requestRender(); });
  addEventListener('pagehide', suspend);
  addEventListener('pageshow', requestRender);
  reducedMotion.addEventListener('change', requestRender);
  new ResizeObserver(resize).observe(root);
  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    if (!onScreen) suspend(); else requestRender();
  }, { threshold: 0 }).observe(root);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; canvas.dataset.ready = 'false'; suspend(); setStatus('lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!points) return;
    try { initializeGPU(); lost = false; canvas.dataset.ready = 'true'; status.hidden = true; requestRender(); }
    catch (error) { console.error('Liangzhu cover:', error); setStatus('unavailable'); }
  });
  fetch(assetURL).then(response => {
    if (!response.ok) throw new Error(`PLY request failed: ${response.status}`);
    return response.arrayBuffer();
  }).then(buffer => {
    points = parsePLY(buffer); initializeGPU(); ready = true;
    canvas.dataset.ready = 'true'; status.hidden = true;
    requestRender();
  }).catch(error => {
    console.error('Liangzhu cover:', error);
    canvas.dataset.ready = 'false'; setStatus('failed');
  });
})();
