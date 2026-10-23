(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const gorillaButton = document.getElementById('gorilla-hit');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  const colours = [[174,173,160],[178,136,132],[143,164,184],[186,170,120],
    [137,165,150],[165,145,179],[203,199,185],
    [82,90,93],[117,125,124],[224,219,204],[204,85,71]];
  // Paper needs coloured ink, rather than dimmed light. Keep the same sage,
  // rose, blue, ochre and mauve roles, with enough chroma to survive warm white.
  const lightColours = [[143,145,126],[171,105,101],[102,139,169],[174,143,74],
    [103,146,121],[149,117,171],[180,164,127],
    [62,76,81],[102,122,117],[203,188,151],[176,61,47]];
  // Every object keeps its own small palette. A colour change is a hard boundary.
  const palettes = {
    'robot-dog':[0,6,7,4,1,0,8,9], 'quest-3':[0,6,7,2,1,0,8,9],
    skill:[6,5,0,1], sudoku:[6,1,0,4], 'kiss-woman':[6,1,0,1], arright:[0,3,6,4],
    clock:[3,1,6,0], gorilla:[0,4,6,5,10],
    'liangzhu-mask':[4,0,6,3], 'jade-cong':[4,0,6,3],
    eye:[5,2,6,1], hand:[0,5,6,1], flower:[1,3,6,4],
    heart:[1,5,6,3], star:[3,1,6,4], moon:[5,3,6,2],
    spiral:[4,1,6,5], butterfly:[2,5,6,1], bolt:[3,5,6,1],
    dice:[5,0,6,1], orbit:[4,3,6,1], art:[1,4,6,5], seal:[3,5,6,1],
  };
  // Scale follows the visible silhouette, not a shared square tile: a few
  // oversized anchors, medium drawings, then much smaller punctuation.
  const desktop = [
    ['robot-dog',.15,.18,.54,-.10], ['skill',.74,.07,.30,-.11],
    ['gorilla',.46,.225,.29,0], ['eye',.255,.395,.064,-.10],
    ['heart',.97,.155,.038,.17], ['arright',.060,.435,.135,-.18],
    ['star',.29,.305,.028,-.1], ['jade-cong',.65,.36,.083,.05],
    ['quest-3',.875,.49,.59,.07], ['heart',.79,.28,.048,.15],
    ['kiss-woman',.105,.87,.40,-.11], ['sudoku',.51,.865,.145,.11],
    ['liangzhu-mask',.765,.805,.125,-.05], ['bolt',.62,.735,.034,.16],
    ['clock',.995,.91,.106,.15], ['heart',.33,.965,.030,.16],
    ['arright',.335,.715,.078,.14], ['spiral',.80,1.01,.074,-.15],
  ];
  const mobile = [
    ['robot-dog',.20,.16,.84,-.10], ['skill',.80,.105,.34,-.09],
    ['heart',.965,.20,.060,.15], ['arright',.065,.60,.16,.14],
    ['liangzhu-mask',.12,.35,.19,0], ['jade-cong',.9,.947,.12,.05],
    ['star',.96,.49,.062,-.13], ['quest-3',.80,.715,.90,.09],
    ['kiss-woman',.145,.82,.26,-.11], ['sudoku',.63,.92,.20,.11],
    ['gorilla',.74,.31,.49,0], ['eye',.13,.97,.12,.08],
    ['bolt',.49,.592,.052,.12],
  ];
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  let width = 0, height = 0, items = [], quiet = [], sprites = [];
  let dark = true, frame = 0, lastFrame = 0, elapsed = 0, pageShown = true;
  let morph = 0, morphTarget = 0, pointerX = 0, pointerY = 0, aimX = 0, aimY = 0;
  let gorillaReady = false, gorillaPlacement = null;

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
    sprites = (dark ? colours : lightColours).map(rgb => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 24;
      const paint = sprite.getContext('2d');
      paint.fillStyle = 'rgb(' + rgb.map(Math.round).join(',') + ')';
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
  function placement(item, time, image) {
    const gorilla = item.id === 'gorilla';
    const angle = item.angle + .035 * Math.sin(time * .23 + item.phase) + (gorilla ? pointerX * .025 : 0);
    return {
      x: item.x + Math.sin(time * .28 + item.phase) * 4 + (gorilla ? pointerX * 2 : 0),
      y: item.y + Math.sin(time * .31 + item.phase * 1.3) * 4 + (gorilla ? pointerY * 1.5 : 0),
      angle, cos:Math.cos(angle), sin:Math.sin(angle), pitch:item.size / image.width,
      width:image.width, height:image.height, hitBox:image.hitBox,
    };
  }
  function buttonVisibility() {
    if (!gorillaButton) return;
    const shown = visible() && gorillaReady && !!gorillaPlacement;
    gorillaButton.hidden = !shown;
    gorillaButton.disabled = !shown;
  }
  function buttonPosition() {
    if (!gorillaButton || !gorillaPlacement) return;
    const p = gorillaPlacement, box = p.hitBox;
    if (!box || ![box.x0,box.y0,box.x1,box.y1].every(Number.isFinite) || box.x1 < box.x0 || box.y1 < box.y0) {
      gorillaReady = false;
      return;
    }
    const u = ((box.x0 + box.x1) / 2 - (p.width - 1) / 2) * p.pitch;
    const v = ((box.y0 + box.y1) / 2 - (p.height - 1) / 2) * p.pitch;
    const w = Math.max(44, (box.x1 - box.x0 + 1) * p.pitch + 8);
    const h = Math.max(44, (box.y1 - box.y0 + 1) * p.pitch + 8);
    const x = p.x + u * p.cos - v * p.sin, y = p.y + u * p.sin + v * p.cos;
    gorillaButton.style.width = `${w}px`;
    gorillaButton.style.height = `${h}px`;
    gorillaButton.style.transformOrigin = '50% 50%';
    gorillaButton.style.transform = `translate3d(${x-w/2}px,${y-h/2}px,0) rotate(${p.angle}rad)`;
  }
  function buttonLabel() {
    if (!gorillaButton) return;
    const english = window.PortfolioI18n?.language === 'en' || document.documentElement.lang === 'en';
    const label = english ? (morphTarget ? "Fold the gorilla's heart away" : "Reveal the gorilla's heart")
      : (morphTarget ? '收起大猩猩的爱心' : '让大猩猩的爱心亮起来');
    gorillaButton.setAttribute('aria-pressed', String(!!morphTarget));
    gorillaButton.setAttribute('aria-label', label);
    gorillaButton.title = label;
  }
  function pointerMove(event) {
    if (event.pointerType === 'touch' || reduced.matches || !gorillaPlacement) return;
    const p = gorillaPlacement, box = p.hitBox, rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - rect.left) * width / rect.width - p.x;
    const dy = (event.clientY - rect.top) * height / rect.height - p.y;
    const column = (dx * p.cos + dy * p.sin) / p.pitch + (p.width - 1) / 2;
    const row = (-dx * p.sin + dy * p.cos) / p.pitch + (p.height - 1) / 2;
    aimX = Math.max(-1, Math.min(1, (column - (box.x0 + box.x1) / 2) / Math.max(1, (box.x1 - box.x0) / 2)));
    aimY = Math.max(-1, Math.min(1, (row - (box.y0 + box.y1) / 2) / Math.max(1, (box.y1 - box.y0) / 2)));
  }
  function interactionStep(dt) {
    const delta = morphTarget - morph;
    morph += Math.sign(delta) * Math.min(Math.abs(delta), dt / .5);
    const follow = 1 - Math.exp(-dt * 12);
    pointerX += (aimX - pointerX) * follow;
    pointerY += (aimY - pointerY) * follow;
  }
  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    // On paper, lit facets reveal more paper and shadows carry more ink.
    const facets = dark ? [0,.48,.66,.84,1] : [0,1,.94,.86,.78];
    const opacity = dark ? .76 : .92;
    const libraries = [window.PortfolioGorillaMotif,window.PortfolioLiangzhuMotifs,
      window.PortfolioMatrix3D,window.PortfolioProjectStickers,window.PortfolioMatrixMotifs,window.PortfolioMatrixSymbols];
    gorillaReady = false;
    gorillaPlacement = null;
    for (const item of items) {
      const source = libraries.find(library => library?.ids.includes(item.id));
      if (!source?.ids.includes(item.id)) continue;
      const image = source.render(item.id, time * item.speed, item.variant,
        item.id === 'gorilla' ? {morph:smooth(morph),pointerX,pointerY} : undefined);
      const p = placement(item, time, image);
      const {pitch,x,y,cos,sin} = p, size = pitch * 1.4, palette = palettes[item.id];
      if (item.id === 'gorilla' && source === window.PortfolioGorillaMotif && (image.ready === true || source.ready === true)) {
        gorillaPlacement = p;
        gorillaReady = true;
      }
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
          // Flat stickers keep their full colour; both themes retain solid LEDs.
          const facet = image.shades ? facets[image.shades[row * image.width + column]] : 1;
          ctx.globalAlpha = opacity * light * facet;
          ctx.drawImage(sprites[palette[(role - 1) % palette.length]],px-size/2,py-size/2,size,size);
        }
      }
    }
    ctx.globalAlpha = 1;
    buttonPosition();
    buttonVisibility();
  }
  function visible() {
    return pageShown && !document.hidden && !stage.classList.contains('gone') &&
      !stage.classList.contains('faded') && !forcedColors.matches;
  }
  function tick(now) {
    frame = 0;
    if (!visible() || reduced.matches) return;
    if (!lastFrame || now - lastFrame >= 1000 / 20) {
      if (lastFrame) {
        const dt = Math.min((now - lastFrame) / 1000, .1);
        elapsed += dt;
        interactionStep(dt);
      }
      lastFrame = now; draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    if (!visible()) {
      aimX = aimY = pointerX = pointerY = 0;
      buttonVisibility();
      return;
    }
    if (reduced.matches) {
      morph = morphTarget;
      aimX = aimY = pointerX = pointerY = 0;
      draw(6);
    } else {
      buttonVisibility();
      frame = requestAnimationFrame(tick);
    }
  }
  if (gorillaButton) {
    gorillaButton.addEventListener('pointerenter', pointerMove);
    gorillaButton.addEventListener('pointermove', pointerMove);
    gorillaButton.addEventListener('pointerleave', () => { aimX = aimY = 0; });
    gorillaButton.addEventListener('click', () => {
      if (!visible() || !gorillaReady) return;
      morphTarget = morphTarget ? 0 : 1;
      buttonLabel();
      if (reduced.matches) { morph = morphTarget; draw(6); }
    });
    buttonLabel();
  }
  addEventListener('portfolio:language', buttonLabel);
  addEventListener('portfolio:gorilla-ready', () => { draw(reduced.matches ? 6 : elapsed); });
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
