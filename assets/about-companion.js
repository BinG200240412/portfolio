/* A tiny, local companion. The empty track owns all of its movement. */
(() => {
  'use strict';

  const script = document.currentScript;
  const spriteURL = new URL('portraits/caizhengyang-sprite-v2.png', script?.src || document.baseURI).href;

  function init() {
    const resume = document.getElementById('resume');
    const canvas = document.getElementById('about-companion');
    const track = canvas?.closest('.about-companion-track');
    if (!resume || !canvas || !track || canvas.dataset.companionReady) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.dataset.companionReady = 'true';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const W = 28;
    const H = 72;
    const baseline = 91;
    const frameInterval = 1000 / 20;
    let parts = null;
    let ready = false;
    let near = false;
    let pageHidden = false;
    let wasLive = false;
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let phase = 0;
    let x = 6;
    let minX = 6;
    let maxX = 6;
    let direction = 1;
    let waiting = 0;

    function makeLayer() {
      const layer = document.createElement('canvas');
      layer.width = W;
      layer.height = H;
      return layer;
    }

    function prepare(image) {
      const source = document.createElement('canvas');
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      const sourceContext = source.getContext('2d', { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0);
      const data = sourceContext.getImageData(0, 0, source.width, source.height);
      let left = source.width;
      let top = source.height;
      let right = -1;
      let bottom = -1;
      // The source includes faint isolated alpha outside the actual sprite.
      for (let py = 0; py < source.height; py += 1) {
        for (let px = 0; px < source.width; px += 1) {
          const alpha = (py * source.width + px) * 4 + 3;
          if (data.data[alpha] < 24) {
            data.data[alpha] = 0;
            continue;
          }
          left = Math.min(left, px);
          right = Math.max(right, px);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py);
        }
      }
      if (right < left || bottom < top) return false;
      sourceContext.putImageData(data, 0, 0);
      const small = makeLayer();
      const smallContext = small.getContext('2d', { willReadFrequently: true });
      smallContext.imageSmoothingEnabled = false;
      smallContext.drawImage(source, left, top, right - left + 1, bottom - top + 1, 0, 0, W, H);
      const pixels = smallContext.getImageData(0, 0, W, H);
      const names = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
      parts = Object.fromEntries(names.map(name => [name, makeLayer()]));
      const buffers = Object.fromEntries(names.map(name => [name, new ImageData(W, H)]));
      for (let py = 0; py < H; py += 1) {
        for (let px = 0; px < W; px += 1) {
          let part = py < 29 ? 'head' : 'body';
          if (py >= 32 && py < 52 && px < 7) part = 'leftArm';
          else if (py >= 32 && py < 52 && px >= 21) part = 'rightArm';
          else if (py >= 49) part = px < 14 ? 'leftLeg' : 'rightLeg';
          const offset = (py * W + px) * 4;
          buffers[part].data.set(pixels.data.subarray(offset, offset + 4), offset);
        }
      }
      for (const name of names) parts[name].getContext('2d').putImageData(buffers[name], 0, 0);
      return true;
    }

    function draw(walking) {
      if (!parts) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.save();
      context.translate(canvas.width / 2, baseline - H);
      context.scale(direction < 0 ? -1 : 1, 1);
      const swing = walking ? Math.sin(phase) : 0;
      const bob = walking ? -Math.round(Math.abs(Math.sin(phase * 2))) : 0;
      const leg = (layer, amount) => {
        const stride = Math.round(amount);
        const lift = -Math.round(Math.max(0, amount) * 2);
        // Fixed hips with an alternating lower leg keep this a walk, not a glide.
        context.drawImage(layer, 0, 49, W, 7, -W / 2, 49 + bob, W, 7);
        context.drawImage(layer, 0, 55, W, H - 55, -W / 2 + stride, 55 + lift, W, H - 55);
      };
      leg(parts.leftLeg, swing);
      leg(parts.rightLeg, -swing);
      context.drawImage(parts.leftArm, -W / 2 - Math.round(swing), bob + Math.round(swing * 2));
      context.drawImage(parts.rightArm, -W / 2 + Math.round(swing), bob - Math.round(swing * 2));
      context.drawImage(parts.body, -W / 2, bob);
      const look = !walking && waiting > 0 && waiting < 1 ? 1 : 0;
      context.drawImage(parts.head, -W / 2 + look, bob);
      context.restore();
    }

    function position() {
      // Whole CSS pixels preserve the source's square pixel edges.
      canvas.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
    }

    function bounds() {
      const width = track.clientWidth;
      if (!width) return;
      minX = Math.min(6, Math.max(0, (width - canvas.clientWidth) / 2));
      maxX = Math.max(minX, width - canvas.clientWidth - 6);
      x = Math.max(minX, Math.min(maxX, x));
      position();
    }

    function measureNear() {
      const rect = track.getBoundingClientRect();
      near = rect.width > 0 && rect.height > 0 && rect.bottom > -100 && rect.top < window.innerHeight + 100;
    }

    function cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
      lastTime = 0;
      canvas.classList.remove('is-walking');
    }

    function tick(now) {
      frame = 0;
      if (!running) return;
      if (!lastTime) lastTime = now;
      const elapsed = now - lastTime;
      if (elapsed >= frameInterval) {
        const dt = Math.min(elapsed / 1000, 0.1);
        lastTime = now;
        const canWalk = maxX - minX > 2;
        if (waiting > 0) {
          waiting = Math.max(0, waiting - dt);
          if (!waiting) direction *= -1;
        } else if (canWalk) {
          phase += dt * Math.PI * 2 / 0.72;
          x += direction * 21 * dt;
          if (x <= minX || x >= maxX) {
            x = Math.max(minX, Math.min(maxX, x));
            waiting = 2;
          }
        }
        const walking = canWalk && !waiting;
        canvas.classList.toggle('is-walking', walking);
        position();
        draw(walking);
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      const live = resume.classList.contains('live');
      if (wasLive && !live) {
        cancel();
        x = minX;
        direction = 1;
        waiting = 0;
        phase = 0;
        position();
      }
      wasLive = live;
      if (live) {
        bounds();
        measureNear();
      }
      const visible = ready && live && near && !document.hidden && !pageHidden;
      canvas.classList.toggle('is-visible', visible);
      if (!visible || reduced.matches) {
        cancel();
        if (visible) draw(false);
        return;
      }
      if (!running) {
        running = true;
        draw(false);
        frame = requestAnimationFrame(tick);
      }
    }

    new MutationObserver(sync).observe(resume, { attributes: true, attributeFilter: ['class'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(() => sync(), { rootMargin: '100px' }).observe(track);
    } else {
      window.addEventListener('scroll', sync, { passive: true });
    }
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
    window.addEventListener('resize', sync, { passive: true });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { pageHidden = true; sync(); });
    window.addEventListener('pageshow', () => { pageHidden = false; sync(); });
    if (reduced.addEventListener) reduced.addEventListener('change', sync);
    else reduced.addListener(sync);
    document.fonts?.ready.then(sync);

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      try { ready = prepare(image); } catch (_) { ready = false; }
      sync();
    };
    image.onerror = () => { ready = false; sync(); };
    image.src = spriteURL;
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
