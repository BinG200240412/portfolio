(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const colours = [[174,173,160],[178,136,132],[143,164,184],[186,170,120],
    [137,165,150],[165,145,179],[203,199,185]];
  // Every object keeps its own small palette. A colour change is a hard boundary.
  const palettes = {
    clock:[3,1,6,0], 'pharaoh-cat':[2,3,6,1], gorilla:[0,4,6,5],
    eye:[5,2,6,1], hand:[0,5,6,1], flower:[1,3,6,4],
    heart:[1,5,6,3], star:[3,1,6,4], moon:[5,3,6,2],
    spiral:[4,1,6,5], butterfly:[2,5,6,1], bolt:[3,5,6,1],
    dice:[5,0,6,1], orbit:[4,3,6,1], art:[1,4,6,5], seal:[3,5,6,1],
  };
  // This is a collage, not a tiled wallpaper. Cropped edges, unequal scales,
  // and a few tight clusters leave the centre as the space between objects.
  const desktop = [
    ['clock',.038,.155,.18,-.14], ['pharaoh-cat',.219,.125,.365,.09],
    ['star',.420,.071,.083,-.15], ['eye',.612,.13,.27,.12],
    ['art',.850,.086,.22,-.10], ['orbit',1.01,.22,.18,.19],
    ['hand',.105,.390,.155,-.18], ['seal',.331,.309,.081,.12],
    ['heart',.775,.315,.117,.16], ['flower',.968,.492,.385,.13],
    ['gorilla',.105,.719,.375,-.08], ['moon',.289,.689,.122,-.20],
    ['butterfly',.439,.838,.205,.08], ['bolt',.630,.756,.091,.20],
    ['pharaoh-cat',.779,.675,.115,-.14], ['dice',.956,.756,.087,.23],
    ['art',.154,.987,.145,.12], ['spiral',.580,1.018,.16,-.14],
    ['clock',.853,.944,.292,-.13], ['seal',.505,.292,.057,-.10],
    ['heart',.351,.965,.056,.15],
  ];
  const mobile = [
    ['clock',.005,.085,.25,-.15], ['pharaoh-cat',.468,.107,.545,.08],
    ['heart',.94,.085,.19,.14], ['eye',.09,.29,.325,-.12],
    ['hand',.855,.302,.255,.16], ['seal',.49,.311,.14,.10],
    ['star',1.015,.474,.16,-.13], ['gorilla',.24,.674,.59,-.10],
    ['flower',.93,.741,.36,.12], ['moon',.875,.59,.18,.14],
    ['butterfly',.105,.928,.30,-.13], ['art',.515,.922,.255,.10],
    ['orbit',1.005,.963,.415,.15], ['bolt',.49,.806,.128,-.15],
  ];
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  let width = 0, height = 0, items = [], quiet = [], sprites = [];
  let dark = true, frame = 0, lastFrame = 0, elapsed = 0, pageShown = true;

  function updateQuietZones() {
    const line = stage.querySelector('.line').getBoundingClientRect();
    quiet = [{ x: line.x + line.width / 2, y: line.y + line.height / 2,
      w: line.width / 2 + 10, h: line.height / 2 + 10 }];
    if (stage.classList.contains('works')) {
      const menu = document.getElementById('menu').getBoundingClientRect();
      quiet.push({ x: menu.x + menu.width / 2, y: menu.y + menu.height / 2,
        w: menu.width / 2 + 6, h: menu.height / 2 + 7 });
    }
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const small = width < 700, unit = small ? width : Math.min(width, height);
    items = (small ? mobile : desktop).map(([id,x,y,size,angle], index) => ({
      id, x:x * width, y:y * height, size:size * unit, angle,
      phase: index * 2.399963, variant: index % 5, speed:.7 + index % 4 * .13,
    }));
    updateQuietZones(); draw(reduced.matches ? 6 : elapsed);
  }
  function makeSprites() {
    dark = document.documentElement.dataset.theme !== 'light';
    sprites = colours.map(rgb => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 24;
      const paint = sprite.getContext('2d');
      paint.fillStyle = 'rgb(' + rgb.map(value => Math.round(value * (dark ? 1 : .68))).join(',') + ')';
      paint.beginPath(); paint.arc(12, 12, 6, 0, TAU); paint.fill();
      return sprite;
    });
  }
  function clearance(x, y, time) {
    let light = 1;
    for (const box of quiet) {
      const radius = 12;
      const dx = Math.abs(x - box.x) - box.w + radius;
      const dy = Math.abs(y - box.y) - box.h + radius;
      const edge = Math.hypot(Math.max(dx,0),Math.max(dy,0)) + Math.min(Math.max(dx,dy),0) - radius;
      const ebb = 7 + 4 * Math.sin(x * .028 + time * .4) + 3 * Math.sin(y * .051 - time * .31);
      light = Math.min(light, Math.round(smooth((edge - ebb) / 22) * 16) / 16);
    }
    return light;
  }
  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    for (const item of items) {
      const library = window.PortfolioMatrixMotifs;
      const extra = window.PortfolioMatrixSymbols;
      const source = library?.ids.includes(item.id) ? library : extra;
      if (!source?.ids.includes(item.id)) continue;
      const image = source.render(item.id, time * item.speed, item.variant);
      const pitch = item.size / image.width, size = pitch * 1.4;
      const x = item.x + Math.sin(time * .28 + item.phase) * 4;
      const y = item.y + Math.sin(time * .31 + item.phase * 1.3) * 4;
      const angle = item.angle + .035 * Math.sin(time * .23 + item.phase);
      const cos = Math.cos(angle), sin = Math.sin(angle), palette = palettes[item.id];
      for (let row = 0; row < image.height; row++) {
        for (let column = 0; column < image.width; column++) {
          const role = image.pixels[row * image.width + column];
          if (!role) continue;
          const u = (column - (image.width - 1) / 2) * pitch;
          const v = (row - (image.height - 1) / 2) * pitch;
          const px = x + u * cos - v * sin, py = y + u * sin + v * cos;
          if (px < -size || px > width + size || py < -size || py > height + size) continue;
          const light = clearance(px, py, time);
          if (!light) continue;
          // Whole solid LEDs carry the drawing. Only their overall brightness
          // fades near typography; there is no painted backdrop or central hole.
          ctx.globalAlpha = (dark ? .72 : .65) * light;
          ctx.drawImage(sprites[palette[(role - 1) % palette.length]],px-size/2,py-size/2,size,size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function visible() {
    return pageShown && !document.hidden && !stage.classList.contains('gone') &&
      !stage.classList.contains('faded') && !forcedColors.matches;
  }
  function tick(now) {
    frame = 0;
    if (!visible() || reduced.matches) return;
    if (!lastFrame || now - lastFrame >= 1000 / 20) {
      if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, .1);
      lastFrame = now; draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    if (!visible()) return;
    if (reduced.matches) draw(6); else frame = requestAnimationFrame(tick);
  }
  makeSprites(); resize();
  const layout = new ResizeObserver(() => { updateQuietZones(); if (reduced.matches) draw(6); });
  layout.observe(stage.querySelector('.line')); layout.observe(document.getElementById('menu'));
  new MutationObserver(() => { updateQuietZones(); sync(); }).observe(stage, { attributes:true,attributeFilter:['class'] });
  new MutationObserver(() => { makeSprites(); draw(reduced.matches ? 6 : elapsed); })
    .observe(document.documentElement, { attributes:true,attributeFilter:['data-theme'] });
  addEventListener('resize',resize,{passive:true}); document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); forcedColors.addEventListener('change',sync);
  addEventListener('pagehide',()=>{pageShown=false;sync();}); addEventListener('pageshow',()=>{pageShown=true;sync();});
  sync();
})();
