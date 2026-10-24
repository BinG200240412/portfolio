/* Liangzhu's retained Marble point data, drawn as an animated particle cover. */
(() => {
  'use strict';
  const root = document.querySelector('[data-particle-cover]');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const status = root.querySelector('[data-cover-status]');
  const controls = root.querySelector('.cover-ui');
  const motionButton = root.querySelector('[data-cover-motion]');
  const assetURL = new URL('liangzhu-particles.ply', document.currentScript.src);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = {
    zh: { close: '近景', orbit: '环绕', overhead: '俯瞰', hint: '拖动旋转', settings: '粒子设置', density: '疏密', flow: '漂动', spread: '散开', zoom: '观察距离', closer: '靠近', farther: '远离', pause: '暂停', play: '播放', loading: '正在展开这片良渚', failed: '粒子暂时无法载入，请刷新页面重试。', unavailable: '当前浏览器未能启用三维渲染，请开启硬件加速后重试。', lost: '三维渲染已暂停，正在等待恢复。', canvas: '可交互的良渚粒子封面。拖动旋转，方向键调整视角，加减键缩放，空格暂停。', group: '调整粒子封面', views: '切换观察视角' },
    en: { close: 'Close-up', orbit: 'Orbit', overhead: 'Above', hint: 'Drag to rotate', settings: 'Particles', density: 'Density', flow: 'Drift', spread: 'Scatter', zoom: 'Distance', closer: 'Move closer', farther: 'Move away', pause: 'Pause', play: 'Play', loading: 'Unfolding Liangzhu', failed: 'The particles could not load. Refresh this page to try again.', unavailable: '3D rendering is unavailable. Enable hardware acceleration to view this cover.', lost: '3D rendering is paused, waiting for recovery.', canvas: 'Interactive Liangzhu particle cover. Drag to rotate, arrow keys to change view, plus and minus to zoom, space to pause.', group: 'Adjust particle cover', views: 'Choose a viewpoint' }
  };
  const state = { density: .7, flow: .55, spread: .24, playing: !reducedMotion.matches, view: 'orbit', yaw: -.3, pitch: .32, distance: 3.2, time: 0, burst: 0 };
  const camera = { yaw: state.yaw, pitch: state.pitch, distance: state.distance };
  const presets = {
    close: { yaw: 0, pitch: .22, distance: 2.9 },
    orbit: { yaw: -.3, pitch: .32, distance: 3.2 },
    overhead: { yaw: -.15, pitch: 1.12, distance: 4.8 }
  };
  const tr = key => words[window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'][key];
  let statusKey = 'loading';
  function syncLabels() {
    root.querySelectorAll('[data-cover-text]').forEach(el => { el.textContent = tr(el.dataset.coverText); });
    root.querySelectorAll('[data-cover-label]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.coverLabel)); });
    canvas.setAttribute('aria-label', tr('canvas'));
    motionButton.textContent = tr(state.playing ? 'pause' : 'play');
    motionButton.setAttribute('aria-pressed', String(state.playing));
    if (!status.hidden) status.textContent = tr(statusKey);
  }
  function setStatus(key) { statusKey = key; status.hidden = false; status.textContent = tr(key); }
  addEventListener('portfolio:language', syncLabels);
  syncLabels();

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) { setStatus('unavailable'); controls.hidden = true; return; }
  let ready = false, lost = false, onScreen = true, raf = 0, last = 0, lastDraw = 0;
  let width = 1, height = 1, dpr = 1, frame = 0;
  let points, program, uniforms, buffers = [], shaders = [];
  let dragging = false, previousX = 0, previousY = 0, hoverX = 0;

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition; attribute vec4 aColor; attribute float aSeed;
    uniform mat4 uView; uniform mat4 uProjection;
    uniform float uTime; uniform float uFlow; uniform float uSpread; uniform float uDpr; uniform float uBurst;
    varying vec4 vColor;
    void main() {
      vec3 p = aPosition;
      float phase = aSeed * 431.71;
      float distanceScale = .12 + min(length(p.xz), 15.) * .022;
      float drift = (.025 + uSpread * 1.7 + uBurst * 2.4) * distanceScale;
      float t = uTime * uFlow * .9;
      p += vec3(sin(phase + t), cos(phase * 1.7 + t * .8), sin(phase * .73 + t * .9)) * drift;
      p.y += sin(p.x * .8 + p.z * .6 + t) * uFlow * .025;
      vec4 view = uView * vec4(p, 1.);
      gl_Position = uProjection * view;
      gl_PointSize = clamp(1.2 * uDpr * (.85 + aSeed * .45) * clamp(6. / max(-view.z, .1), .65, 2.1), 1., 7. * uDpr);
      float heightFade = 1. - smoothstep(2.8, 11., aPosition.y);
      float farFade = 1. - smoothstep(20., 45., length(aPosition.xz));
      float pulse = .88 + .12 * sin(phase + t * .7);
      vColor = vec4(pow(aColor.rgb, vec3(.8)) * 1.15, (.35 + .65 * aColor.a) * heightFade * farFade * pulse);
    }`;
  const fragmentSource = `
    precision mediump float; varying vec4 vColor;
    void main() {
      float r = length(gl_PointCoord - .5);
      if (r > .5) discard;
      gl_FragColor = vec4(vColor.rgb, vColor.a * (1. - smoothstep(.25, .5, r)));
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
    uniforms = Object.fromEntries(['uView', 'uProjection', 'uTime', 'uFlow', 'uSpread', 'uDpr', 'uBurst'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.clearColor(6 / 255, 8 / 255, 8 / 255, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);
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
    const f = 1 / Math.tan(54 * Math.PI / 360), near = .08, far = 100;
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
  function suspend() { cancelAnimationFrame(raf); raf = 0; last = 0; lastDraw = 0; }
  function render(now) {
    raf = 0;
    // A cover has no need to consume a high-refresh display's full frame budget.
    if (lastDraw && now - lastDraw < 1000 / 40 && state.playing) { requestRender(); return; }
    lastDraw = now;
    const dt = last ? Math.min((now - last) / 1000, .06) : 0; last = now;
    if (state.playing) {
      state.time += dt;
      state.burst = Math.max(0, state.burst - dt * .65);
      if (state.view === 'orbit' && !dragging) state.yaw += dt * .045;
    }
    const ease = reducedMotion.matches ? 1 : Math.min(1, 1 - Math.exp(-Math.max(dt, 1 / 60) * 9));
    let settling = false;
    for (const key of ['yaw', 'pitch', 'distance']) {
      camera[key] += (state[key] - camera[key]) * ease;
      if (Math.abs(state[key] - camera[key]) > .001) settling = true;
    }
    const breath = state.playing && state.view === 'close' ? Math.sin(state.time * .08) * .075 : 0;
    const yaw = camera.yaw + breath + hoverX * .018, pitch = camera.pitch, r = camera.distance;
    const eye = [Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r + .15, -Math.cos(yaw) * Math.cos(pitch) * r];
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.uView, false, lookAt(eye, [0, .05, .8]));
    gl.uniformMatrix4fv(uniforms.uProjection, false, projection());
    for (const [name, value] of Object.entries({ uTime: state.time, uFlow: state.flow, uSpread: state.spread, uDpr: dpr, uBurst: state.burst })) gl.uniform1f(uniforms[name], value);
    const count = Math.floor(Math.min(points.count, width < 640 ? 100000 : points.count) * state.density);
    gl.drawArrays(gl.POINTS, 0, count);
    canvas.dataset.frames = String(++frame); canvas.dataset.points = String(count);
    canvas.dataset.view = state.view;
    if (state.playing || settling) requestRender();
  }
  function syncViewButtons() {
    root.querySelectorAll('[data-cover-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.coverView === state.view)));
  }
  function chooseView(view) {
    Object.assign(state, presets[view]); state.view = view; hoverX = 0;
    syncViewButtons(); requestRender();
  }
  function toggleMotion() { state.playing = !state.playing; last = 0; syncLabels(); requestRender(); }
  root.querySelectorAll('[data-cover-view]').forEach(button => button.addEventListener('click', () => chooseView(button.dataset.coverView)));
  root.querySelectorAll('[data-cover-param]').forEach(input => input.addEventListener('input', () => {
    const value = Number(input.value);
    state[input.dataset.coverParam] = value / 100;
    input.closest('label').querySelector('output').textContent = `${value}%`;
    requestRender();
  }));
  motionButton.addEventListener('click', toggleMotion);
  root.querySelectorAll('[data-cover-zoom]').forEach(button => button.addEventListener('click', () => {
    state.distance = Math.min(12, Math.max(1.4, state.distance * Number(button.dataset.coverZoom)));
    requestRender();
  }));
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    dragging = true; previousX = event.clientX; previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (dragging) {
      state.yaw -= (event.clientX - previousX) * .004;
      if (event.pointerType !== 'touch') state.pitch = Math.max(-.35, Math.min(1.3, state.pitch + (event.clientY - previousY) * .003));
      previousX = event.clientX; previousY = event.clientY;
      state.view = 'free'; syncViewButtons();
    } else if (event.pointerType === 'mouse') {
      const bounds = canvas.getBoundingClientRect(); hoverX = (event.clientX - bounds.left) / width - .5;
    }
    requestRender();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { dragging = false; });
  canvas.addEventListener('pointerleave', () => { hoverX = 0; requestRender(); });
  canvas.addEventListener('dblclick', () => { state.burst = state.playing ? 1 : 0; requestRender(); });
  canvas.addEventListener('keydown', event => {
    const keys = {
      ArrowLeft: () => { state.yaw -= .1; }, ArrowRight: () => { state.yaw += .1; },
      ArrowUp: () => { state.pitch = Math.min(1.3, state.pitch + .07); }, ArrowDown: () => { state.pitch = Math.max(-.35, state.pitch - .07); },
      '+': () => { state.distance = Math.max(1.4, state.distance - .3); }, '=': () => { state.distance = Math.max(1.4, state.distance - .3); },
      '-': () => { state.distance = Math.min(12, state.distance + .3); }, ' ': toggleMotion
    };
    if (!keys[event.key]) return;
    event.preventDefault(); keys[event.key]();
    if (event.key.startsWith('Arrow')) { state.view = 'free'; syncViewButtons(); }
    requestRender();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else requestRender(); });
  addEventListener('pagehide', suspend);
  addEventListener('pageshow', requestRender);
  reducedMotion.addEventListener('change', event => { state.playing = !event.matches; syncLabels(); requestRender(); });
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
    syncViewButtons(); requestRender();
  }).catch(error => {
    console.error('Liangzhu cover:', error);
    canvas.dataset.ready = 'false'; setStatus('failed'); controls.hidden = true;
  });
})();
