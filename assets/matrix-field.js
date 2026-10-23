(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const colours = [[174,173,160],[178,136,132],[143,164,184],[186,170,120],
    [137,165,150],[165,145,179],[203,199,185],
    [82,90,93],[117,125,124],[224,219,204]];
  // Every object keeps its own small palette. A colour change is a hard boundary.
  const palettes = {
    'robot-dog':[0,6,7,4,1,0,8,9], 'quest-3':[0,6,7,2,1,0,8,9],
    skill:[6,5,0,1], sudoku:[0,7,6,1], 'american-poster':[7,0,6,3], arright:[0,3,6,4],
    clock:[3,1,6,0], 'pharaoh-cat':[2,3,6,1], gorilla:[0,4,6,5],
    eye:[5,2,6,1], hand:[0,5,6,1], flower:[1,3,6,4],
    heart:[1,5,6,3], star:[3,1,6,4], moon:[5,3,6,2],
    spiral:[4,1,6,5], butterfly:[2,5,6,1], bolt:[3,5,6,1],
    dice:[5,0,6,1], orbit:[4,3,6,1], art:[1,4,6,5], seal:[3,5,6,1],
  };
  // This is a collage, not a tiled wallpaper. Cropped edges, unequal scales,
  // and a few tight clusters leave the centre as the space between objects.
  const desktop = [
    ['robot-dog',.171,.184,.48,-.10], ['skill',.72,.08,.39,-.11],
    ['gorilla',.403,.052,.12,.10], ['eye',.535,.145,.135,.10],
    ['american-poster',1.015,.19,.11,.17], ['arright',.074,.425,.18,-.18],
    ['star',.369,.309,.060,-.1], ['seal',.661,.269,.071,.12],
    ['quest-3',.845,.48,.46,.07], ['heart',.777,.304,.092,.15],
    ['american-poster',.157,.836,.24,-.10], ['sudoku',.504,.867,.215,.11],
    ['pharaoh-cat',.757,.741,.116,-.13], ['bolt',.632,.765,.067,.16],
    ['clock',.995,.88,.155,.15], ['heart',.326,.963,.058,.16],
    ['arright',.347,.714,.115,.14], ['spiral',.751,1.016,.134,-.15],
  ];
  const mobile = [
    ['robot-dog',.24,.163,.78,-.10], ['skill',.77,.115,.42,-.09],
    ['heart',.965,.185,.13,.15], ['arright',.885,.303,.275,.14],
    ['pharaoh-cat',.115,.355,.18,-.13], ['seal',.508,.288,.115,.12],
    ['star',1.025,.47,.15,-.13], ['quest-3',.76,.722,.76,.09],
    ['american-poster',.165,.815,.30,-.11], ['sudoku',.653,.953,.275,.11],
    ['gorilla',.488,.80,.19,-.10], ['eye',.126,.976,.22,.08],
    ['bolt',.518,.591,.10,.12],
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
      const libraries = [window.PortfolioMatrix3D,window.PortfolioProjectStickers,
        window.PortfolioMatrixMotifs,window.PortfolioMatrixSymbols];
      const source = libraries.find(library => library?.ids.includes(item.id));
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
          const facet = image.shades ? [0,.48,.66,.84,1][image.shades[row * image.width + column]] : 1;
          ctx.globalAlpha = (dark ? .76 : .66) * light * facet;
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
