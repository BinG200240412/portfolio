/* Independent LED Sudoku. CSS owns the giant scale, tilt and clipping.
 * Logical canvas 1536²; board (48,48)..(1488,1488), cells 160, LED pitch 8.
 * Grid and still digits are cached. Selected digits morph on the same lattice;
 * each LED remains a single flat-colour circle. No fonts or image assets.
 */
(() => {
  'use strict';
  const canvas=document.getElementById('sudoku-hero-matrix');
  const ctx=canvas?.getContext('2d',{alpha:true});
  if(!ctx)return;
  const viewer=document.getElementById('media-viewer');
  const SIZE=1536,PITCH=8,ORIGIN=48,CELL=160,END=1488,GRID=193,RADIUS=2.55,FPS=20;
  // Reduced motion always shows this valid, uniquely solvable partial board.
  const BOARD=[
    '530070000','600195000','098000060',
    '800060003','400803001','700020006',
    '060000280','000419005','000080079',
  ];
  const FONT={
    1:['00100','01100','00100','00100','00100','00100','01110'],
    2:['01110','11011','00011','00110','01100','11000','11111'],
    3:['11110','00011','00011','01110','00011','00011','11110'],
    4:['00011','00111','01111','11011','11111','00011','00011'],
    5:['11111','11000','11000','11110','00011','00011','11110'],
    6:['01110','11000','11000','11110','11011','11011','01110'],
    7:['11111','00011','00110','00110','01100','01100','01100'],
    8:['01110','11011','11011','01110','11011','11011','01110'],
    9:['01110','11011','11011','01111','00011','00011','01110'],
  };
  const accentCells=new Set(['0:1','1:3','4:5','6:7','8:8']);
  // About one third of cycle edges involve a blank. Most keep a strong digit
  // on screen; the lower-right crop starts with clear 6→5 and 9→7 changes.
  const changing=[
    [0,4,[7,9,6,0],.8,.65],[1,3,[1,7,9,0],1.1,.5],
    [3,4,[6,5,8],.35,.6],[4,5,[3,5,9],.7,.7],
    [5,5,[0,7,9,6],.05,.2],[5,8,[6,5,9],.1,.1],
    [6,5,[0,9,7,6],.4,.2],[6,7,[8,7,9],.05,.4],
    [7,5,[9,7,6,0],.3,.35],[7,8,[5,6,5,9,0],.5,.25],
    [8,5,[0,9,7,5],.3,.35],[8,7,[7,9,6],0,.2],[8,8,[9,7,6,5],.15,.1],
  ].map(([row,column,values,delay,hold],index)=>({
    row,column,values,delay,hold,preheat:.9,duration:1.4+index%3*.1,
    initial:Number(BOARD[row][column]),role:accentCells.has(`${row}:${column}`)?4:3,
    x:ORIGIN+column*CELL+40,y:ORIGIN+row*CELL+24,
  }));
  const changingKeys=new Set(changing.map(cell=>`${cell.row}:${cell.column}`));
  const glyphs=Array.from({length:10},()=>new Uint8Array(140));
  for(let value=1;value<=9;value++)for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(FONT[value][y][x]==='1') {
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)glyphs[value][(y*2+dy)*10+x*2+dx]=1;
  }
  const transitions=new Map();
  function prepare(from,to) {
    const key=`${from}:${to}`;if(transitions.has(key))return;
    const pixels=[];
    for(let i=0;i<140;i++)if(glyphs[from][i]||glyphs[to][i])pixels.push({
      x:(i%10)*PITCH,y:Math.floor(i/10)*PITCH,from:glyphs[from][i],to:glyphs[to][i],
      threshold:.04+(((i%10)*13+Math.floor(i/10)*7)%37)/36*.92,
    });
    transitions.set(key,pixels);
  }
  for(let value=0;value<=9;value++)prepare(value,value);
  for(const cell of changing)cell.values.forEach((value,index)=>prepare(value,cell.values[(index+1)%cell.values.length]));
  const roles=new Uint8Array(GRID*GRID);
  function dot(x,y,role) {
    const column=Math.round(x/PITCH),row=Math.round(y/PITCH);
    if(column>=0&&row>=0&&column<GRID&&row<GRID)roles[row*GRID+column]=Math.max(roles[row*GRID+column],role);
  }
  for(let boundary=0;boundary<=9;boundary++) {
    const coordinate=ORIGIN+boundary*CELL,major=boundary%3===0;
    for(const offset of major?[-PITCH,0,PITCH]:[0])for(let point=ORIGIN-PITCH;point<=END+PITCH;point+=PITCH) {
      dot(coordinate+offset,point,major?2:1);dot(point,coordinate+offset,major?2:1);
    }
  }
  for(let row=0;row<9;row++)for(let column=0;column<9;column++) {
    const value=Number(BOARD[row][column]);if(!value||changingKeys.has(`${row}:${column}`))continue;
    const role=accentCells.has(`${row}:${column}`)?4:3;
    for(const pixel of transitions.get(`${value}:${value}`))
      dot(ORIGIN+column*CELL+40+pixel.x,ORIGIN+row*CELL+24+pixel.y,role);
  }
  const points=[[],[],[],[],[]];
  for(let row=0;row<GRID;row++)for(let column=0;column<GRID;column++) {
    const role=roles[row*GRID+column];if(role)points[role].push([column*PITCH,row*PITCH]);
  }
  const themes={
    dark:{colours:['','rgb(115,121,108)','rgb(146,155,134)','rgb(162,172,151)','rgb(125,164,121)'],
      pulse:['rgb(106,158,113)','rgb(164,185,147)','rgb(218,220,201)'],alpha:[0,.68,.83,.94,.96]},
    light:{colours:['','rgb(116,126,107)','rgb(77,92,71)','rgb(67,88,66)','rgb(65,111,65)'],
      pulse:['rgb(50,91,57)','rgb(65,111,65)','rgb(91,130,82)'],alpha:[0,.74,.9,.94,.95]},
  };
  const cache=document.createElement('canvas'),paint=cache.getContext('2d',{alpha:true});
  if(!paint)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  let host=null;
  try {host=window.frameElement?.closest('#section')||null;} catch(_) {}
  let onScreen=true,pageShown=true,cacheDirty=true,sprites=[],pulseSprites=[],theme=themes.dark;
  let frame=0,lastFrame=0,elapsed=0,backing=SIZE;
  function state(cell,time) {
    if(time<cell.delay)return{from:cell.initial,to:cell.initial,progress:0,phase:'rest',pulse:-1};
    const age=time-cell.delay,period=cell.hold+cell.preheat+cell.duration,step=Math.floor(age/period);
    const warm=age-step*period-cell.hold;
    const phase=warm<0?'rest':warm<cell.preheat?'pulse':'morph';
    return{from:cell.values[step%cell.values.length],to:cell.values[(step+1)%cell.values.length],
      phase,pulse:phase==='pulse'?Math.min(2,Math.floor(warm/(cell.preheat/3))):-1,
      progress:Math.max(0,Math.min(1,(warm-cell.preheat)/cell.duration))};
  }
  function canDraw() {
    return onScreen&&pageShown&&!document.hidden&&!forced.matches&&!viewer?.open&&(!host||host.classList.contains('on'));
  }
  function buildCache() {
    theme=themes[document.documentElement.dataset.theme==='light'?'light':'dark'];
    paint.setTransform(backing/SIZE,0,0,backing/SIZE,0,0);paint.clearRect(0,0,SIZE,SIZE);
    for(let role=1;role<=4;role++) {
      paint.fillStyle=theme.colours[role];paint.globalAlpha=theme.alpha[role];
      for(const[x,y]of points[role]) {paint.beginPath();paint.arc(x,y,RADIUS,0,Math.PI*2);paint.fill();}
    }
    paint.globalAlpha=1;
    const sprite=colour=>{
      const sprite=document.createElement('canvas');sprite.width=sprite.height=16;
      const p=sprite.getContext('2d');p.fillStyle=colour||'transparent';
      p.beginPath();p.arc(8,8,RADIUS*2,0,Math.PI*2);p.fill();return sprite;
    };
    sprites=theme.colours.map(sprite);pulseSprites=theme.pulse.map(sprite);
    cacheDirty=false;
  }
  function draw(time) {
    if(!canDraw())return;
    if(cacheDirty)buildCache();
    ctx.clearRect(0,0,SIZE,SIZE);ctx.globalAlpha=1;ctx.drawImage(cache,0,0,SIZE,SIZE);
    for(const cell of changing) {
      const transition=reduced.matches?{from:cell.initial,to:cell.initial,progress:0,phase:'rest',pulse:-1}:state(cell,time);
      const pixels=transitions.get(`${transition.from}:${transition.to}`);
      for(const pixel of pixels) {
        const changed=pixel.from!==pixel.to,switched=transition.progress>=pixel.threshold;
        if(!(changed&&switched?pixel.to:pixel.from))continue;
        const pop=changed&&switched&&transition.phase==='morph'&&transition.progress-pixel.threshold<.055;
        const sprite=transition.pulse>=0?pulseSprites[transition.pulse]:pop?pulseSprites[2]:sprites[cell.role];
        // Binary point replacement keeps every surviving/common LED at full
        // ink strength. Only newly switched points get a brief solid pop.
        ctx.globalAlpha=theme.alpha[cell.role];
        ctx.drawImage(sprite,cell.x+pixel.x-4,cell.y+pixel.y-4,8,8);
      }
    }
    ctx.globalAlpha=1;
  }
  function tick(now) {
    frame=0;if(!canDraw()||reduced.matches)return;
    if(!lastFrame||now-lastFrame>=1000/FPS) {
      if(lastFrame)elapsed+=Math.min(.12,(now-lastFrame)/1000);
      lastFrame=now;draw(elapsed);
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;lastFrame=0;
    canvas.style.visibility=forced.matches?'hidden':'';
    if(!canDraw())return;
    draw(elapsed);if(!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function refresh() {cacheDirty=true;sync();}
  function resize() {
    const cssSize=Math.max(canvas.clientWidth||0,canvas.clientHeight||0);
    backing=Math.min(2048,Math.max(SIZE,Math.round(cssSize*Math.min(devicePixelRatio||1,1.5))));
    if(canvas.width!==backing)canvas.width=backing;if(canvas.height!==backing)canvas.height=backing;
    if(cache.width!==backing)cache.width=backing;if(cache.height!==backing)cache.height=backing;
    ctx.setTransform(backing/SIZE,0,0,backing/SIZE,0,0);
    refresh();
  }
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  if(viewer)new MutationObserver(sync).observe(viewer,{attributes:true,attributeFilter:['open']});
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{
    onScreen=entries.some(entry=>entry.isIntersecting);sync();
  }).observe(canvas);
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  addEventListener('pagehide',()=>{pageShown=false;sync();});addEventListener('pageshow',()=>{pageShown=true;sync();});
  resize();
})();
