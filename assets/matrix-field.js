(() => {
  const canvas = document.getElementById('matrix-field');
  const stage = document.getElementById('stage');
  const gorillaButton = document.getElementById('gorilla-hit');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  // Vary the contour's LED count, never the size of its physical LEDs.
  const speechShapes = new Map();
  function speechShape(columns) {
    if (speechShapes.has(columns)) return speechShapes.get(columns);
    const rows=Math.round(columns*.55)+1, tipRow=rows+2;
    const path=[[0,tipRow],[2,rows-1],[3,rows-1],[columns-3,rows-1],
      [columns-1,rows-3],[columns-1,2],[columns-3,0],[3,0],
      [1,2],[1,rows-3],[2,rows-1],[0,tipRow]];
    const cells=[...new Set(path.flatMap((point,index) => {
      if (!index) return [];
      const from=path[index-1], steps=Math.max(Math.abs(point[0]-from[0]),Math.abs(point[1]-from[1]));
      return Array.from({length:steps+1},(_,step) => {
        const x=Math.round(from[0]+(point[0]-from[0])*step/steps);
        const y=Math.round(from[1]+(point[1]-from[1])*step/steps);
        return `${x},${y}`;
      });
    }))].map(cell=>cell.split(',').map(Number));
    const shape={columns,rows,tipRow,cells};
    speechShapes.set(columns,shape);
    return shape;
  }
  const colours = [[174,173,160],[178,136,132],[143,164,184],[186,170,120],
    [137,165,150],[165,145,179],[203,199,185],
    [82,90,93],[117,125,124],[224,219,204],[162,94,85],
    [205,204,197],[163,165,162],[118,123,122],[75,83,82]];
  // Paper uses full-colour ink; the dark display keeps its original light levels.
  const lightColours = [[17,83,39],[180,29,53],[8,78,173],[161,92,0],
    [0,111,68],[113,24,165],[31,43,36],
    [18,29,29],[34,62,47],[128,75,0],[153,63,70],
    [21,28,24],[39,48,41],[57,72,60],[76,96,78],
    [203,24,49],[0,88,192],[184,105,0],[0,133,71],[128,16,190]];
  // Material roles give each object its own light surfaces and dark structure.
  const paperMaterials = {
    'robot-dog':['#9d9d9c','#c7c7c4','#414344','#b08d4f','#8b7654','#bcbcb9','#2f3133','#b99a62'],
    'quest-3':['#689bc6','#7ab4ce','#125c9d','#287cba','#b43d53','#397fa9','#1f3d52','#56a3d6'],
    gorilla:['#34433a','#a3b2a6','#758a7a','#1c2e23','#b35960'],
    'jade-cong':['#59a479','#285c37','#bad1a2','#b57914'],
    'liangzhu-mask':['#286743','#64a16b','#b4cba6','#bd891c'],
    sudoku:['#24623c','#c23e56','#83ad8c','#23865b'],
    skill:['#293b32','#a57dc3','#bd91d3','#be3555'],
    'kiss-woman':['#364d3c','#b95864','#8ea891','#bb4355'],
    arright:['#397a4b','#c18f2a','#91b39a','#3b9e66'],
    clock:['#b37b19','#b34a5b','#c6b57f','#2f6342'],
    heart:['#c05c70','#9973b4','#a3bab2','#c89a35'],
    star:['#c58d2f','#b7586e','#dac291','#568b67'],
    eye:['#76529c','#4486bd','#a8bbae','#be5870'],
    bolt:['#bd851d','#8d62ad','#c7bfa1','#b94e67'],
    spiral:['#528f6a','#c25b6e','#9fbdab','#9970b3'],
  };
  // Every object keeps its own small palette. A colour change is a hard boundary.
  const palettes = {
    'robot-dog':[0,6,7,4,1,0,8,9], 'quest-3':[0,6,7,2,1,0,8,9],
    skill:[6,5,0,1], sudoku:[6,1,0,4], 'kiss-woman':[6,1,0,1], arright:[0,3,6,4],
    clock:[3,1,6,0], gorilla:[12,11,13,14,10],
    'liangzhu-mask':[4,0,6,3], 'jade-cong':[4,0,6,3],
    eye:[5,2,6,1], hand:[0,5,6,1], flower:[1,3,6,4],
    heart:[1,5,6,3], star:[3,1,6,4], moon:[5,3,6,2],
    spiral:[4,1,6,5], butterfly:[2,5,6,1], bolt:[3,5,6,1],
    dice:[5,0,6,1], orbit:[4,3,6,1], art:[1,4,6,5], seal:[3,5,6,1],
  };
  // Scale follows the visible silhouette, not a shared square tile: a few
  // oversized anchors, medium drawings, then much smaller punctuation.
  const desktop = [
    ['robot-dog',.15,.18,.44,-.10], ['skill',.74,.07,.30,-.11],
    ['gorilla',.46,.225,.205,0], ['eye',.255,.395,.075,-.10],
    ['heart',.97,.155,.05,.17], ['arright',.075,.435,.17,-.18],
    ['star',.29,.305,.045,-.1], ['jade-cong',.65,.36,.115,.05],
    ['quest-3',.875,.49,.43,.07], ['heart',.79,.28,.055,.15],
    ['kiss-woman',.13,.835,.205,-.11], ['sudoku',.55,.855,.235,.11],
    ['liangzhu-mask',.765,.805,.17,-.05], ['bolt',.68,.745,.045,.16],
    ['clock',.965,.91,.106,.15], ['heart',.33,.965,.045,.16],
    ['arright',.335,.715,.085,.14], ['spiral',.80,.98,.074,-.15],
  ];
  const mobile = [
    ['robot-dog',.20,.16,.69,-.10], ['skill',.80,.105,.35,-.09],
    ['heart',.94,.20,.085,.15], ['arright',.11,.60,.23,.14],
    ['liangzhu-mask',.12,.35,.22,0], ['jade-cong',.9,.947,.16,.05],
    ['star',.94,.49,.085,-.13], ['quest-3',.80,.715,.70,.09],
    ['kiss-woman',.15,.81,.215,-.11], ['sudoku',.53,.92,.285,.11],
    ['gorilla',.74,.31,.40,0], ['eye',.13,.97,.13,.08],
    ['bolt',.49,.592,.075,.12],
  ];
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const projects = {sudoku:'sudoku','robot-dog':'robot-dog','quest-3':'quest-3',arright:'arright',
    skill:'skill','liangzhu-mask':'liangzhu','jade-cong':'liangzhu'};
  const names = {sudoku:['数独','Sudoku'],'robot-dog':['机器狗','Robot dog'],'quest-3':['Quest 3','Quest 3'],
    arright:['Arright','Arright'],skill:['Skills','Skills'],
    'liangzhu-mask':['良渚','Liangzhu'],'jade-cong':['良渚','Liangzhu']};
  const hotspots = new Map();
  const sampleWeights = new Float32Array(9), sampleShades = new Float32Array(9);
  const sampled = {role:0,coverage:0,shade:4};
  let width = 0, height = 0, ledPitch = 3, items = [], quiet = [], sprites = [], paperFacets = [], speechSprite = null, scanSprite = null;
  let dark = true, frame = 0, lastFrame = 0, elapsed = 0, pageShown = true;
  let morph = 0, morphTarget = 0, pointerX = 0, pointerY = 0, aimX = 0, aimY = 0;
  let gorillaReady = false, gorillaPlacement = null;
  let pending = null, maskSettling = 0;
  let pointerHover = null, focusHover = null, menuPreview = null;
  let protectedBoxes = null;
  let speechKey = null, speechBorn = 0;
  const speechless = new Set(['robot-dog','quest-3','sudoku','skill']);

  function updateQuietZones() {
    // Paint the actual DOM glyphs, including individual typewriter spans and
    // their letter spacing. The transparent space between letters stays clear.
    quiet = [];
    protectedBoxes = null;
    const origin = stage.getBoundingClientRect();
    const roots = [stage.querySelector('.line')];
    if (stage.classList.contains('works')) roots.push(document.getElementById('menu'));
    for (const root of roots) {
      if (!root) continue;
      const box = root.getBoundingClientRect(), padding = Math.ceil(ledPitch + 3);
      if (!box.width || !box.height || !root.textContent.trim()) continue;
      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.ceil(box.width + padding * 2));
      mask.height = Math.max(1, Math.ceil(box.height + padding * 2));
      const paint = mask.getContext('2d', {willReadFrequently:true});
      if (!paint) continue;
      paint.fillStyle = paint.strokeStyle = '#fff'; paint.lineJoin = 'round';
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const style = getComputedStyle(node.parentElement);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        paint.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        paint.textBaseline = 'alphabetic';
        const spacing = parseFloat(style.letterSpacing) || 0;
        const range = document.createRange();
        for (let offset = 0; offset < node.length;) {
          const character = String.fromCodePoint(node.data.codePointAt(offset));
          range.setStart(node, offset); range.setEnd(node, offset + character.length);
          offset += character.length;
          if (!character.trim()) continue;
          const rect = range.getBoundingClientRect(), metrics = paint.measureText(character);
          if (!rect.width || !rect.height || !metrics.width) continue;
          const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
          const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
          const fontHeight = ascent + descent || parseFloat(style.fontSize);
          const sx = rect.width / Math.max(1, metrics.width + spacing), sy = rect.height / fontHeight;
          paint.save();
          paint.translate(rect.left - box.left + padding, rect.top - box.top + padding);
          paint.scale(sx, sy); paint.lineWidth = Math.max(2, ledPitch * .9) / Math.max(sx, sy);
          paint.strokeText(character, 0, ascent); paint.fillText(character, 0, ascent);
          paint.restore();
        }
      }
      quiet.push({x:box.left-origin.left-padding,y:box.top-origin.top-padding,
        width:mask.width,height:mask.height,data:paint.getImageData(0,0,mask.width,mask.height).data});
    }
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const small = width < 700, unit = small ? width : Math.min(width, height);
    // One physical LED scale for every library, independent of source raster.
    // Let very large displays grow the pitch too, keeping the sample count bounded.
    ledPitch = Math.max(3, unit / 170);
    items = (small ? mobile : desktop).map(([id,x,y,size,angle], index) => ({
      id, key:`${index}:${id}`, x:x * width, y:y * height, size:size * unit, angle,
      phase: index * 2.399963, variant: index % 5, speed:.7 + index % 4 * .13,
    }));
    const used = new Set();
    for (const item of items) if (projects[item.id]) { used.add(item.key); ensureHotspot(item); }
    for (const [key, entry] of hotspots) if (!used.has(key)) {
      if (pending?.entry === entry) pending = null;
      if (pointerHover === entry) pointerHover = null;
      if (focusHover === entry) focusHover = null;
      entry.button.remove(); hotspots.delete(key);
    }
    updateQuietZones(); draw(reduced.matches ? 6 : elapsed);
  }
  function makeSprites() {
    dark = document.documentElement.dataset.theme !== 'light';
    const spriteFor = rgb => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 24;
      const paint = sprite.getContext('2d');
      paint.fillStyle = 'rgb(' + rgb.map(Math.round).join(',') + ')';
      paint.beginPath(); paint.arc(12, 12, 6, 0, TAU); paint.fill();
      return sprite;
    };
    sprites = (dark ? colours : lightColours).map(spriteFor);
    speechSprite = spriteFor(dark ? [205,204,197] : [35,42,39]);
    scanSprite = spriteFor(dark ? [139,186,209] : [19,91,147]);
    // Faces progress from shadow to light in discrete opaque steps. Highlights
    // get their own brighter pigment instead of lowering the whole object's alpha.
    paperFacets = dark ? [] : Object.fromEntries(Object.entries(palettes).map(([id,roles]) => {
      const materials=paperMaterials[id] || roles.map(index=>lightColours[index]);
      return [id,materials.map(colour=>{
        const rgb=Array.isArray(colour)?colour:[1,3,5].map(offset=>parseInt(colour.slice(offset,offset+2),16));
        return [0,.6,.82,1,1.22].map(level=>spriteFor(rgb.map(channel=>Math.min(255,channel*level))));
      })];
    }));
  }
  function clearance(x, y) {
    let light = 1;
    for (const mask of quiet) {
      const column = Math.floor(x - mask.x), row = Math.floor(y - mask.y);
      if (column < 0 || row < 0 || column >= mask.width || row >= mask.height) continue;
      light = Math.min(light, 1 - .45 * mask.data[(row * mask.width + column) * 4 + 3] / 255);
    }
    return light;
  }
  function placement(item, time, image) {
    const gorilla = item.id === 'gorilla';
    const entry = hotspots.get(item.key), active = pending && pending.entry === entry ? pending.progress : 0;
    const beat = reduced.matches ? 0 : Math.sin(active * Math.PI);
    const dogHover = item.id === 'robot-dog' && !reduced.matches ? entry?.hover || 0 : 0;
    const angle = item.angle + .035 * Math.sin(time * .23 + item.phase) * (1 - dogHover) +
      (gorilla ? pointerX * .025 : Math.sin(active * TAU) * .055);
    return {
      x: item.x + Math.sin(time * .28 + item.phase) * 4 * (1-dogHover) + (gorilla ? pointerX * 2 : 0),
      y: item.y + Math.sin(time * .31 + item.phase * 1.3) * 4 * (1-dogHover) + (gorilla ? pointerY * 1.5 : -beat * 5),
      angle, cos:Math.cos(angle), sin:Math.sin(angle), pitch:item.size / image.width * (1 + beat * .045),
      width:image.width, height:image.height, hitBox:image.hitBox,
    };
  }
  function ensureHotspot(item) {
    if (hotspots.has(item.key)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'matrix-object-hit'; button.hidden = true;
    button.setAttribute('data-project', projects[item.id]); button.setAttribute('data-motif', item.id);
    button.setAttribute('data-i18n-ignore', '');
    const entry = {button,key:item.key,id:item.id,project:projects[item.id],hover:0,hoverTarget:0,hoverElapsed:0,
      gaitPhase:-Math.PI/2,staticActive:0,placement:null};
    const hover = () => {
      syncHoverTargets();
      if (reduced.matches) draw(6);
    };
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      pointerHover = entry; hover();
    });
    button.addEventListener('pointerleave', () => {
      if (pointerHover === entry) pointerHover = null;
      hover();
    });
    button.addEventListener('focus', () => { focusHover = entry; hover(); });
    button.addEventListener('blur', () => {
      if (focusHover === entry) focusHover = null;
      hover();
    });
    button.addEventListener('click', () => {
      if (!visible() || !entry.placement || pending) return;
      const gate=projectGate();
      if (reduced.matches) {
        entry.staticActive=entry.staticActive?0:1; draw(6);
        if (gate && gate===projectGate()) window.PortfolioNavigation?.openProject(entry.project);
        return;
      }
      entry.staticActive=0;
      pending = {entry,progress:0,gate}; buttonVisibility();
    });
    hotspots.set(item.key, entry); stage.appendChild(button); objectLabel(entry);
  }
  function syncHoverTargets() {
    for (const entry of hotspots.values()) entry.hoverTarget =
      pointerHover === entry || focusHover === entry || menuPreview === entry.id ? 1 : 0;
  }
  function projectGate() {
    const gate=window.PortfolioNavigation?.projectGate?.();
    return Number.isSafeInteger(gate) && gate>0 ? gate : 0;
  }
  function finishPending() {
    const reaction=pending;
    pending=null;
    if (reaction && visible() && reaction.gate && reaction.gate===projectGate())
      window.PortfolioNavigation?.openProject(reaction.entry.project);
    return reaction;
  }
  function objectLabel(entry) {
    const english = window.PortfolioI18n?.language === 'en' || document.documentElement.lang === 'en';
    const works=!!projectGate();
    const label = english ? `${works?'Open':'Play with'} ${names[entry.id][1]}`
      : works?`查看${names[entry.id][0]}`:`与${names[entry.id][0]}互动`;
    entry.button.setAttribute('aria-label',label); entry.button.title = label;
  }
  function buttonVisibility() {
    const live = visible();
    if (gorillaButton) {
      const shown = live && gorillaReady && !!gorillaPlacement;
      gorillaButton.hidden = !shown; gorillaButton.disabled = !shown || !!pending;
    }
    for (const entry of hotspots.values()) {
      const shown = live && !!entry.placement;
      entry.button.hidden = !shown;
      entry.button.disabled = !shown || (!!pending && pending.entry !== entry);
      entry.button.setAttribute('aria-busy', String(pending?.entry === entry));
    }
  }
  function positionButton(button, p) {
    if (!button || !p) return false;
    const box = p.hitBox;
    if (!box || ![box.x0,box.y0,box.x1,box.y1].every(Number.isFinite) || box.x1 < box.x0 || box.y1 < box.y0) {
      return false;
    }
    const u = ((box.x0 + box.x1) / 2 - (p.width - 1) / 2) * p.pitch;
    const v = ((box.y0 + box.y1) / 2 - (p.height - 1) / 2) * p.pitch;
    const w = Math.max(44, (box.x1 - box.x0 + 1) * p.pitch + 8);
    const h = Math.max(44, (box.y1 - box.y0 + 1) * p.pitch + 8);
    const x = p.x + u * p.cos - v * p.sin, y = p.y + u * p.sin + v * p.cos;
    button.style.width = `${w}px`; button.style.height = `${h}px`;
    button.style.transformOrigin = '50% 50%';
    button.style.transform = `translate3d(${x-w/2}px,${y-h/2}px,0) rotate(${p.angle}rad)`;
    return true;
  }
  function inkBounds(image) {
    if (image.hitBox) return image.hitBox;
    let x0=image.width,y0=image.height,x1=-1,y1=-1;
    for (let y=0;y<image.height;y++) for (let x=0;x<image.width;x++) if (image.pixels[y*image.width+x]) {
      x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y);
    }
    return x1 < x0 ? null : {x0,y0,x1,y1};
  }
  function objectBox(p) {
    const box=p.hitBox;
    if (!box) return null;
    const corners=[[box.x0-.5,box.y0-.5],[box.x1+.5,box.y0-.5],
      [box.x1+.5,box.y1+.5],[box.x0-.5,box.y1+.5]];
    const points=corners.map(([column,row]) => {
      const u=(column-(p.width-1)/2)*p.pitch, v=(row-(p.height-1)/2)*p.pitch;
      return [p.x+u*p.cos-v*p.sin,p.y+u*p.sin+v*p.cos];
    });
    return {left:Math.min(...points.map(point=>point[0])),
      right:Math.max(...points.map(point=>point[0])),
      top:Math.min(...points.map(point=>point[1])),
      bottom:Math.max(...points.map(point=>point[1]))};
  }
  function intersection(a,b,padding=0) {
    return Math.max(0,Math.min(a.right,b.right+padding)-Math.max(a.left,b.left-padding)) *
      Math.max(0,Math.min(a.bottom,b.bottom+padding)-Math.max(a.top,b.top-padding));
  }
  function drawSpeech(time,objectBoxes) {
    if (!speechSprite || !visible() || !projectGate() || pending) {speechKey=null;return;}
    let entry=pointerHover?.placement ? pointerHover : focusHover?.placement ? focusHover : null;
    if (!entry && menuPreview) {
      const area=candidate => {
        const p=candidate.placement, box=p.hitBox;
        return box ? (box.x1-box.x0+1)*(box.y1-box.y0+1)*p.pitch*p.pitch : 0;
      };
      entry=[...hotspots.values()]
        .filter(candidate=>candidate.id===menuPreview && candidate.placement && !candidate.button.hidden)
        .sort((a,b)=>area(b)-area(a))[0] || null;
    }
    if (!entry || entry.button.hidden || speechless.has(entry.id)) {speechKey=null;return;}
    if(speechKey!==entry.key){speechKey=entry.key;speechBorn=time;}
    const own=objectBoxes.find(item=>item.key===entry.key)?.box;
    if (!own || own.right<0 || own.left>width || own.bottom<0 || own.top>height) return;
    const pitch=ledPitch, inkScale=Math.sqrt((own.right-own.left)*(own.bottom-own.top));
    const preferredColumns=Math.max(9,Math.min(17,9+2*Math.round((inkScale-60)/32)));
    const tipX=own.right, tipY=Math.max(3*pitch,Math.min(height-3*pitch,own.top));
    if (!protectedBoxes) {
      const stageBox=stage.getBoundingClientRect();
      protectedBoxes=[stage.querySelector('.line'),...stage.querySelectorAll('.menu .mi'),
        document.getElementById('toHub'),document.getElementById('themeControls')]
        .filter(element=>element && element.getClientRects().length)
        .map(element=>{const r=element.getBoundingClientRect();return {
          left:r.left-stageBox.left,right:r.right-stageBox.left,
          top:r.top-stageBox.top,bottom:r.bottom-stageBox.top};});
    }
    const options=[];
    for(let columns=preferredColumns;columns>=9;columns-=2){
      const shape=speechShape(columns), bubbleWidth=(columns-1)*pitch, bubbleHeight=shape.tipRow*pitch;
      for(const [index,flipX,flipY] of [[0,false,false],[1,true,false],[2,false,true],[3,true,true]]){
        const x=tipX-(flipX?bubbleWidth:0), y=tipY-(flipY?0:bubbleHeight);
        const box={left:x,right:x+bubbleWidth,top:y,bottom:y+bubbleHeight};
        const overflow=Math.max(0,pitch-box.left)+Math.max(0,box.right-(width-pitch))+
          Math.max(0,pitch-box.top)+Math.max(0,box.bottom-(height-pitch));
        const obstruction=objectBoxes.reduce((sum,item)=>sum+(item.key===entry.key?0:intersection(box,item.box,pitch)*8),0);
        const lettering=protectedBoxes.reduce((sum,textBox)=>sum+intersection(box,textBox,pitch)*30,0);
        options.push({shape,x,y,flipX,flipY,score:overflow*500+obstruction+lettering+
          intersection(box,own)*7+index*220+(preferredColumns-columns)*150});
      }
    }
    options.sort((a,b)=>a.score-b.score);
    const {shape,x,y,flipX,flipY}=options[0], size=pitch*1.4;
    const growth=reduced.matches?1:smooth((time-speechBorn)/.72);
    for(let index=0;index<shape.cells.length;index++){
      const reveal=smooth((growth-index/shape.cells.length*.78)/.22);
      if(!reveal) continue;
      const [column,row]=shape.cells[index];
      const px=x+(flipX?shape.columns-1-column:column)*pitch;
      const py=y+(flipY?shape.tipRow-row:row)*pitch;
      ctx.globalAlpha=(dark?.88:.94)*reveal;
      ctx.drawImage(speechSprite,px-size/2,py-size/2,size,size);
    }
    for(let index=0;index<3;index++){
      const phase=((time-index*.22)%1.5+1.5)%1.5;
      const speaking=reduced.matches ? index===1 : phase<.34;
      const column=Math.round(shape.columns*(.27+index*.23));
      const dotSize=shape.columns>=15?2:1;
      const reveal=smooth((growth-.68-index*.045)/.22);
      if(!reveal) continue;
      ctx.globalAlpha=(speaking?1:.72)*reveal;
      for(let row=0;row<dotSize;row++) for(let offset=0;offset<dotSize;offset++){
        const px=x+(flipX?shape.columns-1-column-offset:column+offset)*pitch;
        const dotRow=Math.round(shape.rows*.47)+row;
        const py=y+(flipY?shape.tipRow-dotRow:dotRow)*pitch-
          (speaking && !reduced.matches ? .25*pitch : 0);
        ctx.drawImage(speechSprite,px-size/2,py-size/2,size,size);
      }
    }
    ctx.globalAlpha=1;
  }
  // Area sampling keeps thin ink strokes when a high-resolution source is
  // reduced to the same LED grid as every other object.
  function sample(image, x, y, span, paletteLength) {
    const half=span/2,x0=x-half,x1=x+half,y0=y-half,y1=y+half;
    const weights=sampleWeights, shades=sampleShades;
    weights.fill(0); shades.fill(0);
    let occupied=0;
    for (let row=Math.max(0,Math.ceil(y0-.5));row<=Math.min(image.height-1,Math.floor(y1+.5));row++) {
      const wy=Math.max(0,Math.min(y1,row+.5)-Math.max(y0,row-.5));
      if (!wy) continue;
      for (let column=Math.max(0,Math.ceil(x0-.5));column<=Math.min(image.width-1,Math.floor(x1+.5));column++) {
        const index=row*image.width+column,role=image.pixels[index];
        if (!role || role>paletteLength) continue;
        const weight=wy*Math.max(0,Math.min(x1,column+.5)-Math.max(x0,column-.5));
        occupied+=weight; weights[role]+=weight; shades[role]+=weight*(image.shades?.[index] || 4);
      }
    }
    if (occupied/(span*span)<.10) return null;
    let role=1; for(let i=2;i<=paletteLength;i++) if(weights[i]>weights[role]) role=i;
    sampled.role=role; sampled.coverage=Math.min(1,occupied/(span*span*.35));
    sampled.shade=Math.max(1,Math.min(4,Math.round(shades[role]/weights[role])));
    return sampled;
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
    for (const entry of hotspots.values()) {
      entry.hover += (entry.hoverTarget-entry.hover)*follow;
      entry.hoverElapsed = entry.hoverTarget || pending?.entry === entry ? entry.hoverElapsed + dt : 0;
      if (entry.id === 'robot-dog') entry.gaitPhase += dt * entry.hover * 1.65;
    }
    if (pending) {
      pending.progress = Math.min(1,pending.progress+dt/(pending.entry.id === 'sudoku' ? 1.15 : .65));
      if (pending.progress >= 1) finishPending();
    }
  }
  function drawQuestScan(bounds,hover,time) {
    if (!scanSprite || hover < .04 || reduced.matches) return;
    const pitch=ledPitch, size=pitch*1.4;
    const cx=bounds.left+pitch*2, cy=(bounds.top+bounds.bottom)/2;
    const reach=Math.min(48,(bounds.right-bounds.left)*.27);
    for(let ring=0;ring<3;ring++){
      const travel=((time*.78-ring/3)%1+1)%1;
      const radius=8+travel*reach;
      ctx.globalAlpha=hover*(1-travel)*.85;
      for(let step=0;step<=16;step++){
        const angle=Math.PI*(.52+step*.06);
        const px=cx+Math.cos(angle)*radius, py=cy+Math.sin(angle)*radius;
        if(px<0||px>width||py<0||py>height||clearance(px,py)<.75)continue;
        ctx.drawImage(scanSprite,px-size/2,py-size/2,size,size);
      }
    }
    const sweep=((time*.68)%1+1)%1;
    const x=bounds.left+(bounds.right-bounds.left)*(.18+.64*sweep);
    ctx.globalAlpha=hover*.7;
    for(let y=bounds.top+(bounds.bottom-bounds.top)*.24;y<bounds.bottom-(bounds.bottom-bounds.top)*.24;y+=pitch*1.4){
      if(clearance(x,y)<.75)continue;
      ctx.drawImage(scanSprite,x-size/2,y-size/2,size,size);
    }
    ctx.globalAlpha=1;
  }
  function draw(time) {
    if (!sprites.length || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const objectBoxes=[], projectEffects=[];
    const facets = [0,.48,.66,.84,1];
    const opacity = dark ? .76 : 1;
    const libraries = [window.PortfolioGorillaMotif,window.PortfolioLiangzhuMotifs,
      window.PortfolioMatrix3D,window.PortfolioProjectStickers,window.PortfolioMatrixMotifs,window.PortfolioMatrixSymbols];
    gorillaReady = false;
    gorillaPlacement = null;
    for (const entry of hotspots.values()) entry.placement = null;
    for (const item of items) {
      const source = libraries.find(library => library?.ids.includes(item.id));
      if (!source?.ids.includes(item.id)) continue;
      const entry = hotspots.get(item.key);
      const options = {active:pending && pending.entry===entry ? pending.progress : reduced.matches ? entry?.staticActive || 0 : 0,
        hover:reduced.matches ? 0 : entry?.hover || 0,hoverElapsed:entry?.hoverElapsed || 0,
        gaitPhase:entry?.gaitPhase,reduced:reduced.matches};
      if (item.id === 'gorilla') Object.assign(options,{morph:smooth(morph),pointerX,pointerY});
      const image = source.render(item.id, time * item.speed, item.variant, options);
      if (!image?.pixels || !image.width || !image.height) continue;
      const p = placement(item, time, image);
      const {pitch,x,y,cos,sin} = p, size = ledPitch * 1.4, palette = palettes[item.id];
      if (!palette) continue;
      p.hitBox = inkBounds(image);
      const bounds=objectBox(p);
      if (bounds) objectBoxes.push({key:item.key,box:bounds});
      if (bounds && item.id === 'quest-3' && entry?.hover > .04)
        projectEffects.push({bounds,hover:entry.hover});
      if (entry && image.ready !== false && positionButton(entry.button,p)) entry.placement=p;
      if (item.id === 'gorilla' && source === window.PortfolioGorillaMotif && (image.ready === true || source.ready === true)) {
        gorillaPlacement = p;
        gorillaReady = positionButton(gorillaButton,p);
      }
      const columns=Math.ceil(image.width*pitch/ledPitch), rows=Math.ceil(image.height*pitch/ledPitch);
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const u = (column - (columns - 1) / 2) * ledPitch;
          const v = (row - (rows - 1) / 2) * ledPitch;
          const px = x + u * cos - v * sin, py = y + u * sin + v * cos;
          if (px < -size || px > width + size || py < -size || py > height + size) continue;
          const pixel=sample(image,u/pitch+(image.width-1)/2,v/pitch+(image.height-1)/2,ledPitch/pitch,palette.length);
          if (!pixel) continue;
          const light = clearance(px, py);
          // Whole solid LEDs carry the drawing. Only their overall brightness
          // fades near typography; there is no painted backdrop or central hole.
          // Flat stickers keep their full colour; both themes retain solid LEDs.
          const facet = image.shades ? facets[pixel.shade] : 1;
          const ink=dark ? opacity*facet*pixel.coverage : 1;
          ctx.globalAlpha = light===1 ? ink : Math.min(ink,Math.max(.16,ink*light));
          const paperShade=image.shades && item.id!=='gorilla' ? pixel.shade : 3;
          const sprite=dark ? sprites[palette[pixel.role-1]] : paperFacets[item.id][pixel.role-1][paperShade];
          ctx.drawImage(sprite,px-size/2,py-size/2,size,size);
        }
      }
    }
    ctx.globalAlpha = 1;
    for(const effect of projectEffects) drawQuestScan(effect.bounds,effect.hover,time);
    buttonVisibility();
    drawSpeech(time,objectBoxes);
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
        if (maskSettling > 0) { maskSettling-=dt; updateQuietZones(); }
      }
      if (!visible()) { buttonVisibility(); return; }
      lastFrame = now; draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    if (!visible()) {
      pending = null;
      aimX = aimY = pointerX = pointerY = 0;
      pointerHover=focusHover=null;
      for (const entry of hotspots.values()) {entry.hover=entry.hoverTarget=0;entry.staticActive=0;}
      buttonVisibility();
      return;
    }
    if (reduced.matches) {
      if (pending) {
        const reaction=finishPending();
        if (reaction) reaction.entry.staticActive=1;
        if (!visible()) { buttonVisibility(); return; }
      }
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
      if (!visible() || !gorillaReady || pending) return;
      morphTarget = morphTarget ? 0 : 1;
      buttonLabel();
      if (reduced.matches) { morph = morphTarget; draw(6); }
    });
    buttonLabel();
  }
  const menu = document.getElementById('menu');
  const motifFromMenu = target => target instanceof Element
    ? target.closest('#menu .mi')?.dataset.matrixMotif || null : null;
  menu?.addEventListener('pointerover',event => {
    if (event.pointerType === 'touch') return;
    menuPreview=motifFromMenu(event.target); syncHoverTargets(); if (reduced.matches) draw(6);
  });
  menu?.addEventListener('pointerout',event => {
    if (event.pointerType === 'touch') return;
    menuPreview=motifFromMenu(event.relatedTarget); syncHoverTargets(); if (reduced.matches) draw(6);
  });
  menu?.addEventListener('focusin',event => {
    menuPreview=motifFromMenu(event.target); syncHoverTargets(); if (reduced.matches) draw(6);
  });
  menu?.addEventListener('focusout',event => {
    menuPreview=motifFromMenu(event.relatedTarget); syncHoverTargets(); if (reduced.matches) draw(6);
  });
  addEventListener('portfolio:language', () => {
    buttonLabel(); for (const entry of hotspots.values()) objectLabel(entry);
    updateQuietZones(); if (reduced.matches) draw(6);
  });
  addEventListener('portfolio:navigation', () => {
    pointerHover=focusHover=menuPreview=null;
    speechKey=null;
    for (const entry of hotspots.values()) {entry.hoverTarget=0;objectLabel(entry);}
    if (reduced.matches && visible()) draw(6);
  });
  addEventListener('portfolio:gorilla-ready', () => { draw(reduced.matches ? 6 : elapsed); });
  makeSprites(); resize();
  const layout = new ResizeObserver(() => { updateQuietZones(); if (reduced.matches) draw(6); });
  layout.observe(stage.querySelector('.line')); layout.observe(document.getElementById('menu'));
  const letters = new MutationObserver(() => {
    maskSettling=.3; updateQuietZones(); if (reduced.matches) draw(6);
  });
  letters.observe(stage.querySelector('.line'),{subtree:true,childList:true,characterData:true});
  letters.observe(document.getElementById('menu'),{subtree:true,childList:true,characterData:true});
  new MutationObserver(() => { updateQuietZones(); sync(); }).observe(stage, { attributes:true,attributeFilter:['class'] });
  new MutationObserver(() => { makeSprites(); draw(reduced.matches ? 6 : elapsed); })
    .observe(document.documentElement, { attributes:true,attributeFilter:['data-theme'] });
  addEventListener('resize',resize,{passive:true}); document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); forcedColors.addEventListener('change',sync);
  addEventListener('pagehide',()=>{pageShown=false;sync();}); addEventListener('pageshow',()=>{pageShown=true;sync();});
  document.fonts?.ready.then(() => {updateQuietZones();draw(reduced.matches ? 6 : elapsed);});
  document.fonts?.addEventListener('loadingdone',()=>{updateQuietZones();draw(reduced.matches ? 6 : elapsed);});
  sync();
})();
