/* Shared round-bulb drawing for decorative case covers. No media or fonts load. */
(() => {
  'use strict';
  if (window.PortfolioCoverDots) return;
  const instances = new Set();
  const palettes = {
    dark: ['#74716b', '#eee5cf', '#b49c70', '#ed4937'],
    light: ['#999084', '#322b24', '#946027', '#b5291d']
  };
  const sprites = new Map();
  function sprite(light, role) {
    const key = `${light ? 'light' : 'dark'}:${role}`;
    if (sprites.has(key)) return sprites.get(key);
    const image = document.createElement('canvas');
    image.width = image.height = 32;
    const ctx = image.getContext('2d');
    const color = palettes[light ? 'light' : 'dark'][role] || palettes.dark[1];
    if (!light && role) {
      const glow = ctx.createRadialGradient(16,16,5,16,16,16);
      glow.addColorStop(0,`${color}78`); glow.addColorStop(.6,`${color}19`); glow.addColorStop(1,`${color}00`);
      ctx.fillStyle = glow; ctx.fillRect(0,0,32,32);
    }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(16,16,7.4,0,Math.PI*2); ctx.fill();
    if (!light && role) {
      ctx.fillStyle = '#fff9e8'; ctx.globalAlpha = .42;
      ctx.beginPath(); ctx.arc(14,14,2.6,0,Math.PI*2); ctx.fill();
    }
    sprites.set(key,image); return image;
  }
  function mount(canvas, draw) {
    if (canvas.dataset.ledMounted) return;
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return;
    canvas.dataset.ledMounted = 'true';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, ratio = 1, visible = false, suspended = false, disposed = false;
    let raf = 0, lastTick = 0, time = 0, light = false, frameCount = 0;
    function canRun() { return !disposed && !suspended && visible && !document.hidden && width > 0 && height > 0; }
    function paint() {
      if (disposed || !width || !height) return;
      ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
      let count = 0;
      draw({ctx, width, height, time, light, reduced:reduce.matches,
        dot(x,y,radius,role=1,alpha=1) {
          if (x < -12 || x > width+12 || y < -12 || y > height+12 || radius <= 0 || alpha <= .01) return;
          ctx.globalAlpha = Math.min(1,Math.max(0,alpha));
          ctx.drawImage(sprite(light,role),x-radius*2,y-radius*2,radius*4,radius*4); count++;
        }
      });
      ctx.globalAlpha = 1;
      canvas.dataset.ledFrame = String(++frameCount);
      canvas.dataset.ledTime = time.toFixed(2);
      canvas.dataset.ledPoints = String(count);
      canvas.dataset.ledTheme = light ? 'light' : 'dark';
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; lastTick = 0; canvas.dataset.ledRunning = 'false'; }
    function loop(now) {
      raf = 0;
      if (!canRun() || reduce.matches) return;
      if (!lastTick || now-lastTick >= 1000/30-1) {
        if (lastTick) time += Math.min(.08,(now-lastTick)/1000);
        lastTick = now; paint();
      }
      raf = requestAnimationFrame(loop);
    }
    function sync() {
      if (!canRun() || reduce.matches) { stop(); if (visible) paint(); return; }
      if (!raf) { canvas.dataset.ledRunning = 'true'; raf = requestAnimationFrame(loop); }
    }
    function resize() {
      if (disposed) return;
      const box = canvas.getBoundingClientRect();
      width = box.width; height = box.height;
      ratio = Math.min(devicePixelRatio || 1,1.5);
      const w = Math.max(1,Math.round(width*ratio)), h = Math.max(1,Math.round(height*ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      paint(); sync();
    }
    function theme() { light = document.documentElement.dataset.theme === 'light'; paint(); }
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); },{threshold:0});
    io.observe(canvas);
    const mo = new MutationObserver(theme); mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    function hide(event) { if (event.persisted) { suspended = true; stop(); } else dispose(); }
    function show() { suspended = false; sync(); }
    function dispose() {
      if (disposed) return;
      disposed = true; stop(); io.disconnect(); ro.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange',sync); reduce.removeEventListener('change',sync);
      removeEventListener('pagehide',hide); removeEventListener('pageshow',show);
      canvas.width = canvas.height = 1; instances.delete(dispose);
      if (!instances.size) sprites.clear();
    }
    document.addEventListener('visibilitychange',sync); reduce.addEventListener('change',sync);
    addEventListener('pagehide',hide); addEventListener('pageshow',show);
    instances.add(dispose); window.PortfolioLifecycle?.onDispose(dispose);
    theme(); resize();
  }
  window.PortfolioCoverDots = Object.freeze({register(kind, draw) {
    document.querySelectorAll(`canvas[data-led-cover="${kind}"]`).forEach(canvas => mount(canvas,draw));
  }});
})();
