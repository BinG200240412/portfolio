/* Original Liangzhu points, with fixed particle parameters and gesture controls. */
(() => {
  'use strict';
  const root = document.querySelector('[data-particle-cover]');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const status = root.querySelector('[data-cover-status]');
  const statusLabel = status.querySelector('[data-cover-label]');
  const retry = status.querySelector('[data-cover-retry]');
  window.PortfolioLoading?.mount(status);
  const assetURL = new URL('liangzhu-village.ply', document.currentScript.src);
  const compressedAssetURL = new URL('liangzhu-village.ply.gz', document.currentScript.src);
  const previewURL = new URL('liangzhu-village-preview.ply', document.currentScript.src);
  const compressedPreviewURL = new URL('liangzhu-village-preview.ply.gz', document.currentScript.src);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = {
    zh: { loading: '正在载入场景', preparing: '正在点亮场景', failed: '场景暂时未能载入。', unavailable: '当前浏览器无法显示三维场景。', lost: '正在恢复场景', retry: '重试', refining: '正在载入完整细节', detailRetry: '重试完整细节', canvas: '可交互的良渚粒子封面。拖动旋转，滚轮、触控板双指滑动或捏合缩放，双击循环切换近景、环绕、俯瞰和远景。也可使用方向键、加减键及数字键 1 至 4。' },
    en: { loading: 'Loading the scene', preparing: 'Lighting up the scene', failed: 'The scene could not load.', unavailable: '3D rendering is unavailable in this browser.', lost: 'Restoring the scene', retry: 'Retry', refining: 'Loading full detail', detailRetry: 'Retry full detail', canvas: 'Interactive Liangzhu particle cover. Drag to rotate; scroll or pinch to zoom; double-click to cycle close-up, orbit, overhead and wide views. Keyboard: arrows, plus/minus, and 1–4.' }
  };
  // A small subset appears first; the final scene retains every original point.
  // Both use identical coordinates, camera and zero drift/scatter.
  // Start at the farthest distance. Idle motion stays around the chosen front view.
  const subject = [0, -.3, 1.85];
  const home = Object.freeze({ yaw: -.035, pitch: .18, distance: 4 });
  const presets = [
    { name: 'wide', ...home },
    { name: 'close', yaw: -.035, pitch: .18, distance: 1.75 },
    { name: 'orbit', yaw: .28, pitch: .28, distance: 2.2 },
    { name: 'overhead', yaw: -.08, pitch: .68, distance: 2.25 }
  ];
  const limits = { yaw: [-.7, .7], pitch: [-.05, .9], distance: [1.15, 4] };
  const target = { ...home };
  const camera = { ...target };
  const renderedCamera = { ...camera };
  const idleMotion = { yaw: .055, pitch: .008, zoom: .03, resumeDelay: 3500 };
  let idleTime = 0, idleBlend = 0, resumeAt = 0, idleTimer = 0;
  let presetIndex = 0, viewName = 'wide';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const tr = key => words[(window.PortfolioI18n?.language || document.documentElement.dataset.language) === 'en' ? 'en' : 'zh'][key];
  let quality = 'none', fullState = 'idle', hasPresented = false, disposed = false;
  let statusKey = 'loading';
  // Only the initial load covers the scene. Full detail refines an already
  // usable preview, with a small LED fan and an accessible retry target.
  const detailStatus = document.createElement('div');
  detailStatus.className = 'cover-detail-loader';
  detailStatus.setAttribute('data-i18n-ignore', '');
  detailStatus.hidden = true;
  window.PortfolioLoading?.mount(detailStatus);
  const detailRetry = document.createElement('button');
  detailRetry.type = 'button'; detailRetry.hidden = true;
  detailStatus.appendChild(detailRetry); root.appendChild(detailStatus);
  function syncDetailStatus() {
    const loading = fullState === 'loading', failed = fullState === 'error';
    detailStatus.hidden = !hasPresented || quality === 'full' || (!loading && !failed);
    detailStatus.dataset.loadingState = failed ? 'error' : 'loading';
    detailStatus.setAttribute('aria-label', tr(failed ? 'detailRetry' : 'refining'));
    detailRetry.setAttribute('aria-label', tr('detailRetry'));
    detailRetry.hidden = !failed;
    root.dataset.detailState = quality === 'full' ? 'ready' : fullState;
  }
  detailRetry.addEventListener('click', event => {
    event.stopPropagation();
    if (fullState !== 'error') return;
    fullState = 'idle'; loadFull('high');
  });
  function notifyParent(state) {
    if (disposed) return;
    if (parent !== window) parent.postMessage({ type: 'portfolio:cover-state', state }, location.origin);
  }
  function syncLabels() {
    canvas.setAttribute('aria-label', tr('canvas'));
    statusLabel.textContent = tr(statusKey);
    retry.textContent = tr('retry');
    syncDetailStatus();
  }
  function setStatus(key) {
    statusKey = key;
    status.hidden = false;
    status.dataset.state = key;
    const failed = key === 'failed' || key === 'unavailable';
    status.dataset.loadingState = failed ? 'error' : 'loading';
    canvas.setAttribute('aria-busy', String(!failed));
    canvas.dataset.ready = 'false';
    retry.hidden = !failed;
    syncLabels();
    notifyParent(failed ? 'error' : 'loading');
  }
  addEventListener('portfolio:language', syncLabels);
  retry.addEventListener('click', () => { if (!gl) location.reload(); else loadPoints(); });
  setStatus('loading');

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) { setStatus('unavailable'); return; }
  let ready = false, lost = false, onScreen = true, raf = 0, last = 0;
  let presented = false, presentationFrame = 0, pageShown = true, generation = 0;
  let previewController = null, fullController = null;
  const observers = [];
  let host = null;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  const mayFetch = () => !disposed && root.isConnected && pageShown && !document.hidden && (!host || host.classList.contains('on'));
  const active = () => mayFetch() && onScreen;
  let width = 1, height = 1, dpr = 1, frame = 0;
  let points, program, uniforms, buffers = [], shaders = [];
  let dragPointer = null, previousX = 0, previousY = 0;
  let safariPinching = false, pinchDistance = home.distance;

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

  async function parsePLY(buffer, signal) {
    const beginning = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1024)));
    const end = beginning.indexOf('end_header\n');
    const match = beginning.match(/element vertex (\d+)\n/);
    const properties = 'property float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nproperty uchar alpha\n';
    if (end < 0 || !match || !beginning.startsWith('ply\nformat binary_little_endian 1.0\n') || !beginning.includes(properties)) throw new Error('Unsupported Liangzhu PLY layout');
    const count = Number(match[1]), offset = end + 'end_header\n'.length;
    if (!Number.isSafeInteger(count) || count <= 0 || count > 500000 || buffer.byteLength !== offset + count * 16) throw new Error('Invalid Liangzhu point data');
    const stride = Number(beginning.match(/comment source_stride (\d+)\n/)?.[1]) || 1;
    const regular = Number(beginning.match(/comment source_regular_count (\d+)\n/)?.[1]) || count;
    const extrema = (beginning.match(/comment source_extrema ([\d,]*)\n/)?.[1] || '').split(',').filter(Boolean).map(Number);
    if (stride !== 1 && (regular > count || extrema.length !== count - regular)) throw new Error('Invalid preview source indices');
    const source = new DataView(buffer), bytes = new Uint8Array(buffer);
    const positions = new Float32Array(count * 3), colors = new Uint8Array(count * 4), seeds = new Float32Array(count);
    let budget = performance.now() + 5;
    for (let i = 0; i < count; i++) {
      if ((i & 4095) === 0) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (performance.now() >= budget) {
          // Keep scroll and input responsive while retaining all original points.
          if (globalThis.scheduler?.yield) await scheduler.yield();
          else await new Promise(resolve => setTimeout(resolve, 0));
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          budget = performance.now() + 5;
        }
      }
      const at = offset + i * 16;
      const x = source.getFloat32(at, true), y = source.getFloat32(at + 4, true), z = source.getFloat32(at + 8, true);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error('Invalid point coordinate');
      const pi = i * 3, ci = i * 4;
      positions[pi] = x; positions[pi + 1] = -y; positions[pi + 2] = z;
      colors[ci] = bytes[at + 12]; colors[ci + 1] = bytes[at + 13];
      colors[ci + 2] = bytes[at + 14]; colors[ci + 3] = bytes[at + 15];
      const sourceIndex = i < regular ? i * stride : extrema[i - regular];
      seeds[i] = ((sourceIndex * 16807) % 2147483647) / 2147483647;
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
    buffers = [];
    // Geometry refinement uses the same shaders and camera. Reuse the program
    // instead of recompiling it and clearing the canvas for a second scene.
    if (!program) {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    }
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
  function disposePointBuffers() {
    if (!gl.isContextLost()) buffers.forEach(buffer => gl.deleteBuffer(buffer));
    buffers = [];
  }
  function disposeGPU() {
    disposePointBuffers();
    if (!gl.isContextLost()) {
      shaders.forEach(shader => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program);
    }
    buffers = []; shaders = []; program = null;
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
    const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestRender();
  }
  function requestRender() {
    if (ready && !lost && !raf && active()) {
      clearTimeout(idleTimer); idleTimer = 0;
      raf = requestAnimationFrame(render);
    }
  }
  function suspend() {
    cancelAnimationFrame(raf); cancelAnimationFrame(presentationFrame);
    clearTimeout(idleTimer); idleTimer = 0;
    raf = 0; presentationFrame = 0; last = 0;
  }
  function takeControl() {
    // Start the gesture at the pose actually on screen, without snapping back
    // from the idle offset or dropping accumulated input between frames.
    if (idleBlend > 0) {
      Object.assign(camera, renderedCamera); Object.assign(target, renderedCamera);
    }
    idleTime = 0; idleBlend = 0; resumeAt = performance.now() + idleMotion.resumeDelay;
    clearTimeout(idleTimer); idleTimer = 0;
    requestRender();
  }
  function render(now) {
    raf = 0;
    if (!ready || lost || !active()) return;
    const idle = !reducedMotion.matches && dragPointer === null && !safariPinching && now >= resumeAt;
    // A slow camera needs only 30 draws/second; direct gestures remain unthrottled.
    if (idle && last && now - last < 1000 / 30) { requestRender(); return; }
    const dt = last ? Math.min((now - last) / 1000, .06) : 0; last = now;
    const ease = reducedMotion.matches ? 1 : Math.min(1, 1 - Math.exp(-Math.max(dt, 1 / 60) * 9));
    let settling = false;
    for (const key of ['yaw', 'pitch', 'distance']) {
      camera[key] += (target[key] - camera[key]) * ease;
      if (Math.abs(target[key] - camera[key]) > .0001) settling = true;
      else camera[key] = target[key];
    }
    if (idle) { idleTime += dt; idleBlend = Math.min(1, idleBlend + dt / 1.2); }
    // All offsets are bounded oscillations, never a cumulative orbit. Keep the
    // farthest initial framing, then gently push in and return over 13 seconds.
    renderedCamera.yaw = clamp(camera.yaw + Math.sin(idleTime * Math.PI * 2 / 18) * idleMotion.yaw * idleBlend, ...limits.yaw);
    renderedCamera.pitch = clamp(camera.pitch + Math.sin(idleTime * Math.PI * 2 / 21) * idleMotion.pitch * idleBlend, ...limits.pitch);
    renderedCamera.distance = clamp(camera.distance * (1 - (1 - Math.cos(idleTime * Math.PI * 2 / 13)) * .5 * idleMotion.zoom * idleBlend), ...limits.distance);
    const { yaw, pitch, distance: r } = renderedCamera;
    const eye = [subject[0] + Math.sin(yaw) * Math.cos(pitch) * r, subject[1] + Math.sin(pitch) * r, subject[2] - Math.cos(yaw) * Math.cos(pitch) * r];
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.uView, false, lookAt(eye, subject));
    gl.uniformMatrix4fv(uniforms.uProjection, false, projection());
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, points.count);
    if (!presented) {
      if (gl.isContextLost()) return;
      if (gl.getError() !== gl.NO_ERROR) {
        ready = false; setStatus('unavailable'); return;
      }
      // One successful draw must reach the next presentation opportunity before
      // replacing the loading state. Downloads and iframe load are not ready.
      if (!presentationFrame) {
        const current = generation, paintedPoints = points;
        presentationFrame = requestAnimationFrame(() => {
          presentationFrame = 0;
          if (current !== generation || paintedPoints !== points || !ready || lost || !active() || gl.isContextLost()) return;
          presented = true; hasPresented = true; canvas.dataset.ready = 'true';
          canvas.dataset.quality = quality;
          status.dataset.state = 'ready'; status.dataset.loadingState = 'ready';
          canvas.setAttribute('aria-busy', 'false'); status.hidden = true;
          notifyParent('ready');
          if (quality === 'full') fullState = 'ready';
          syncDetailStatus();
          if (quality === 'preview' && fullState === 'idle') loadFull();
        });
      }
    }
    canvas.dataset.frames = String(++frame); canvas.dataset.points = String(points.count);
    canvas.dataset.view = viewName;
    canvas.dataset.distance = r.toFixed(3);
    canvas.dataset.yaw = yaw.toFixed(4); canvas.dataset.pitch = pitch.toFixed(4);
    canvas.dataset.motion = reducedMotion.matches ? 'reduced' : idle ? 'idle' : 'manual';
    if (settling || idle) requestRender();
    else {
      last = 0;
      if (!reducedMotion.matches && dragPointer === null && !safariPinching) {
        idleTimer = setTimeout(requestRender, Math.max(0, resumeAt - performance.now()));
      }
    }
  }
  function chooseView(index) {
    takeControl();
    presetIndex = index; viewName = presets[index].name;
    const { yaw, pitch, distance } = presets[index];
    Object.assign(target, { yaw, pitch, distance }); requestRender();
  }
  function rotate(yawDelta, pitchDelta = 0) {
    takeControl();
    target.yaw = clamp(target.yaw + yawDelta, ...limits.yaw);
    target.pitch = clamp(target.pitch + pitchDelta, ...limits.pitch);
    viewName = 'free'; requestRender();
  }
  function zoom(distance) {
    takeControl();
    const next = clamp(distance, ...limits.distance);
    if (Math.abs(next - target.distance) < .00001) return false;
    target.distance = next; viewName = 'free'; requestRender(); return true;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!ready || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    takeControl();
    dragPointer = event.pointerId; previousX = event.clientX; previousY = event.clientY;
    canvas.classList.add('is-dragging');
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== dragPointer) return;
    rotate(-(event.clientX - previousX) * .003, event.pointerType === 'touch' ? 0 : (event.clientY - previousY) * .0025);
    previousX = event.clientX; previousY = event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => {
    if (event.pointerId !== dragPointer) return;
    dragPointer = null; canvas.classList.remove('is-dragging');
    takeControl(); requestRender();
  });
  canvas.addEventListener('wheel', event => {
    if (!ready || lost || !event.cancelable) return;
    if (safariPinching) { event.preventDefault(); return; }
    takeControl();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const dx = event.deltaX * unit, dy = event.deltaY * unit;
    if (!event.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.2) {
      event.preventDefault(); rotate(-clamp(dx, -120, 120) * .002); return;
    }
    const changed = zoom(target.distance * Math.exp(clamp(dy, -120, 120) * (event.ctrlKey ? .008 : .0025)));
    // At either distance limit, ordinary scrolling returns to the article.
    if (changed || event.ctrlKey) event.preventDefault();
  }, { passive: false });
  // Safari on macOS exposes trackpad pinches as gesture events rather than ctrl-wheel.
  canvas.addEventListener('gesturestart', event => {
    if (!ready || lost || !matchMedia('(pointer: fine)').matches) return;
    takeControl();
    event.preventDefault(); safariPinching = true; pinchDistance = target.distance;
  }, { passive: false });
  canvas.addEventListener('gesturechange', event => {
    if (!safariPinching) return;
    event.preventDefault();
    if (Number.isFinite(event.scale) && event.scale > 0) zoom(pinchDistance / event.scale);
  }, { passive: false });
  canvas.addEventListener('gestureend', event => {
    if (!safariPinching) return;
    event.preventDefault(); safariPinching = false; takeControl(); requestRender();
  }, { passive: false });
  canvas.addEventListener('dblclick', event => {
    if (!ready || lost) return;
    event.preventDefault(); chooseView((presetIndex + 1) % presets.length);
  });
  canvas.addEventListener('keydown', event => {
    if (!ready || lost) return;
    const keys = {
      ArrowLeft: () => rotate(-.06), ArrowRight: () => rotate(.06),
      ArrowUp: () => rotate(0, .05), ArrowDown: () => rotate(0, -.05),
      '+': () => zoom(target.distance * .86), '=': () => zoom(target.distance * .86),
      '-': () => zoom(target.distance * 1.16),
      '1': () => chooseView(0), '2': () => chooseView(1), '3': () => chooseView(2), '4': () => chooseView(3),
      Home: () => chooseView(0)
    };
    if (!keys[event.key]) return;
    takeControl();
    event.preventDefault(); keys[event.key]();
    requestRender();
  });
  const syncActivity = () => {
    if (active()) requestRender(); else suspend();
    if (!active() && fullController) {
      fullState = 'paused'; fullController.abort(); fullController = null; syncDetailStatus();
    } else if (active() && fullState === 'paused' && quality !== 'full' && (hasPresented || !previewController)) {
      fullState = 'idle'; loadFull(quality === 'none' ? 'high' : 'low');
    }
  };
  function disposeCover() {
    if (disposed) return;
    disposed = true; pageShown = false; ++generation;
    previewController?.abort(); fullController?.abort();
    previewController = fullController = null;
    if (quality !== 'full') fullState = 'paused';
    suspend(); syncDetailStatus();
    observers.forEach(observer => observer.disconnect());
    observers.length = 0; disposeGPU(); points = null; ready = false;
  }
  document.addEventListener('visibilitychange', syncActivity);
  addEventListener('pagehide', event => {
    if (!event.persisted) { disposeCover(); return; }
    if (disposed) return;
    pageShown = false; ++generation;
    previewController?.abort(); fullController?.abort();
    previewController = fullController = null;
    if (quality !== 'full') fullState = 'paused';
    suspend(); syncDetailStatus();
  });
  addEventListener('pageshow', () => {
    if (disposed) return;
    pageShown = true;
    if (!points && !previewController && !fullController) loadPoints();
    else syncActivity();
  });
  if (host) {
    const observer = new MutationObserver(syncActivity);
    observer.observe(host, { attributes: true, attributeFilter: ['class'] }); observers.push(observer);
  }
  reducedMotion.addEventListener('change', () => { takeControl(); requestRender(); });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root); observers.push(resizeObserver);
  const coverObserver = new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    document.body.classList.toggle('liangzhu-cover-on', onScreen);
    window.frameElement?.toggleAttribute('data-particle-cover-on', onScreen);
    syncActivity();
  }, { threshold: 0, rootMargin: '-72px 0px 0px 0px' });
  coverObserver.observe(root); observers.push(coverObserver);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; ready = false; presented = false; suspend();
    // Context restoration invalidates the previous GPU handles. Clear them
    // while the context is lost, before a restored context can delete them.
    hasPresented = false; disposeGPU(); uniforms = null; setStatus('lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    if (points) installScene(points, quality);
    else if (previewController || fullController) setStatus('loading');
    else loadPoints();
  });
  function installScene(nextPoints, nextQuality) {
    const previous = points, previousQuality = quality;
    const keepPreview = hasPresented && previous && previousQuality === 'preview';
    points = nextPoints; quality = nextQuality;
    if (lost || gl.isContextLost()) { ready = false; setStatus('lost'); return true; }
    ready = false; presented = false; suspend();
    if (!hasPresented) setStatus('preparing');
    try {
      disposePointBuffers(); initializeGPU(); ready = true; requestRender(); return true;
    } catch (error) {
      console.error('Liangzhu scene:', error); disposeGPU();
      if (keepPreview && !gl.isContextLost()) {
        // GPU allocation for full detail may fail on a constrained device.
        // Restore the already usable preview and keep its camera unchanged.
        points = previous; quality = previousQuality;
        try { initializeGPU(); ready = true; requestRender(); return false; }
        catch (restoreError) { console.error('Liangzhu preview:', restoreError); }
      }
      ready = false; setStatus('unavailable'); return false;
    }
  }
  async function fetchPoints(url, signal, compressed = false, priority = 'high') {
    const response = await fetch(url, { signal, priority });
    if (!response.ok) throw new Error(`PLY request failed: ${response.status}`);
    if (!compressed) return response.arrayBuffer();
    if (!response.body) throw new Error('Compressed point stream is unavailable');
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
  async function transfer(rawURL, gzipURL, signal, priority) {
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, {once:true});
    if (signal.aborted) request.abort();
    const deadline = setTimeout(abort, priority === 'high' ? 15000 : 30000);
    try {
      if (typeof DecompressionStream === 'function') {
        try { return await fetchPoints(gzipURL, request.signal, true, priority); }
        catch (error) {
          if (request.signal.aborted || error.name === 'AbortError') throw error;
        }
      }
      return await fetchPoints(rawURL, request.signal, false, priority);
    } catch (error) {
      if (request.signal.aborted && !signal.aborted) throw new Error('Point cloud request timed out');
      throw error;
    } finally {
      clearTimeout(deadline); signal.removeEventListener('abort', abort);
    }
  }
  async function loadFull(priority = 'low') {
    if (quality === 'full' || fullState === 'loading') return;
    if (!active()) { fullState = 'paused'; syncDetailStatus(); return; }
    const current = generation, task = new AbortController();
    fullController?.abort(); fullController = task;
    fullState = 'loading'; syncDetailStatus();
    try {
      const buffer = await transfer(assetURL, compressedAssetURL, task.signal, priority);
      if (current !== generation || task.signal.aborted || !root.isConnected) return;
      const complete = await parsePLY(buffer, task.signal);
      if (current !== generation || task.signal.aborted || !active()) return;
      if (!installScene(complete, 'full')) {
        fullState = 'error'; syncDetailStatus();
      }
    } catch (error) {
      if (current !== generation || task.signal.aborted || error.name === 'AbortError') return;
      console.error('Liangzhu detail:', error); fullState = 'error';
      if (!hasPresented || !points) { ready = false; setStatus('failed'); }
      syncDetailStatus();
    } finally {
      if (fullController === task) {
        fullController = null;
        if (fullState === 'loading' && !active()) { fullState = 'paused'; syncDetailStatus(); }
      }
    }
  }
  async function loadPoints() {
    if (disposed) return;
    const current = ++generation;
    previewController?.abort(); fullController?.abort();
    const task = new AbortController(); previewController = task; fullController = null;
    ready = false; presented = false; hasPresented = false;
    points = null; quality = 'none'; fullState = 'idle';
    suspend(); disposeGPU(); setStatus('loading');
    try {
      const buffer = await transfer(previewURL, compressedPreviewURL, task.signal, 'high');
      if (current !== generation || task.signal.aborted || !root.isConnected) return;
      const preview = await parsePLY(buffer, task.signal);
      if (current !== generation || task.signal.aborted || !root.isConnected) return;
      if (!installScene(preview, 'preview')) throw new Error('Preview could not be drawn');
    } catch (error) {
      if (current !== generation || task.signal.aborted || error.name === 'AbortError') return;
      // A missing/corrupt small preview must not block the original scene.
      console.warn('Liangzhu preview:', error);
      if (!lost && !gl.isContextLost()) { ready = false; setStatus('loading'); }
      loadFull('high');
    } finally { if (previewController === task) previewController = null; }
  }
  window.PortfolioLifecycle?.onDispose(disposeCover);
  if (!disposed) loadPoints();
})();
