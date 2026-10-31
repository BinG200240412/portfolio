/* A physical LED raster: fixed row/column positions and one bulb diameter.
 * Renderers paint a low-resolution framebuffer; they never place visible LEDs. */
(() => {
  'use strict';
  if (window.PortfolioCoverDots) return;
  const instances = new Set();
  const palettes = {
    dark: ['#525a5d', '#cbc7b9', '#a591b3', '#b28884'],
    light: ['#748271', '#293b32', '#a57dc3', '#be3555']
  };
  const sprites = new Map();
  const pigments = Object.fromEntries(Object.entries(palettes).map(([theme,colors])=>[theme,colors.map(color=>[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16)))]));
  function pigment(red,green,blue,light) {
    let nearest=null, distance=Infinity;
    for (const rgb of pigments[light ? 'light' : 'dark']) {
      const delta=(red-rgb[0])**2+(green-rgb[1])**2+(blue-rgb[2])**2;
      if(delta<distance){distance=delta;nearest=rgb;}
    }
    return nearest;
  }
  function sprite(red,green,blue) {
    const key = `${red},${green},${blue}`;
    if (sprites.has(key)) return sprites.get(key);
    const image = document.createElement('canvas');
    image.width = image.height = 24;
    const ctx = image.getContext('2d');
    // Identical flat circles to matrix-field.js: no glow or variable core size.
    ctx.fillStyle = `rgb(${key})`; ctx.beginPath(); ctx.arc(12,12,6,0,Math.PI*2); ctx.fill();
    sprites.set(key,image); return image;
  }
  function mount(canvas, draw) {
    if (canvas.dataset.ledMounted) return;
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return;
    const screen = document.createElement('canvas');
    const buffer = screen.getContext('2d',{willReadFrequently:true});
    if (!buffer) return;
    canvas.dataset.ledMounted = 'true';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, ratio = 1, pitch = 3, columns = 0, rows = 0;
    let visible = false, suspended = false, disposed = false;
    let raf = 0, lastTick = 0, time = 0, light = false, frameCount = 0;
    function canRun() { return !disposed && !suspended && visible && !document.hidden && width > 0 && height > 0; }
    function paint() {
      if (disposed || !width || !height) return;
      buffer.setTransform(1,0,0,1,0,0); buffer.clearRect(0,0,columns,rows);
      buffer.globalAlpha = 1; buffer.imageSmoothingEnabled = false;
      buffer.save();
      draw({ctx:buffer,width:columns,height:rows,time,light,reduced:reduce.matches,colors:palettes[light ? 'light' : 'dark']});
      buffer.restore();
      const pixels = buffer.getImageData(0,0,columns,rows).data;
      ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
      // The hardware is independent of the picture and the animation time.
      const size = pitch*1.4;
      let count = 0;
      for (let row=0;row<rows;row++) {
        const y = (row+.5)*pitch;
        for (let column=0;column<columns;column++) {
          const x = (column+.5)*pitch, index = (row*columns+column)*4;
          if (!pixels[index+3]) continue;
          ctx.globalAlpha = pixels[index+3]/255*(light ? 1 : .76);
          const ink=pigment(pixels[index],pixels[index+1],pixels[index+2],light);
          ctx.drawImage(sprite(...ink),x-size/2,y-size/2,size,size); count++;
        }
      }
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
      // Same physical LED scale as the homepage, never scaled to an object.
      const unit = innerWidth < 700 ? innerWidth : Math.min(innerWidth,innerHeight);
      pitch = Math.max(3,unit/170);
      columns = Math.max(1,Math.ceil(width/pitch)); rows = Math.max(1,Math.ceil(height/pitch));
      if (screen.width !== columns || screen.height !== rows) { screen.width = columns; screen.height = rows; }
      canvas.dataset.ledGridPitch = pitch.toFixed(6);
      canvas.dataset.ledDiameter = (pitch*.7).toFixed(6);
      canvas.dataset.ledColumns = String(columns); canvas.dataset.ledRows = String(rows);
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
      removeEventListener('resize',resize);
      removeEventListener('pagehide',hide); removeEventListener('pageshow',show);
      canvas.width = canvas.height = screen.width = screen.height = 1; instances.delete(dispose);
      if (!instances.size) sprites.clear();
    }
    document.addEventListener('visibilitychange',sync); reduce.addEventListener('change',sync);
    addEventListener('resize',resize,{passive:true});
    addEventListener('pagehide',hide); addEventListener('pageshow',show);
    instances.add(dispose); window.PortfolioLifecycle?.onDispose(dispose);
    theme(); resize();
  }
  window.PortfolioCoverDots = Object.freeze({register(kind, draw) {
    document.querySelectorAll(`canvas[data-led-cover="${kind}"]`).forEach(canvas => mount(canvas,draw));
  }});
})();
