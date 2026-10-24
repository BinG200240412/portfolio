/* Independent, static LED Sudoku. CSS owns the giant scale, tilt and clipping.
 * Logical canvas: 1536 square. Board: (48,48)..(1488,1488), cells 160.
 * Every LED sits on an 8-unit lattice; digits are hand-coded 5×7 bitmaps.
 * No font rendering, image assets, interaction, timers or animation frames.
 */
(() => {
  'use strict';
  const canvas=document.getElementById('sudoku-hero-matrix');
  const ctx=canvas?.getContext('2d',{alpha:true});
  if(!ctx)return;
  const SIZE=1536,PITCH=8,ORIGIN=48,CELL=160,END=1488,GRID=193,RADIUS=2.55;
  // A valid, uniquely solvable partial board; zero cells stay completely open.
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
  const roles=new Uint8Array(GRID*GRID);
  function dot(x,y,role) {
    const column=Math.round(x/PITCH),row=Math.round(y/PITCH);
    if(column>=0&&row>=0&&column<GRID&&row<GRID)roles[row*GRID+column]=role;
  }
  // Thin cell divisions and three-column block divisions use identical dots.
  // Their only difference is the number of parallel LED columns.
  for(let boundary=0;boundary<=9;boundary++) {
    const coordinate=ORIGIN+boundary*CELL,major=boundary%3===0;
    for(const offset of major?[-PITCH,0,PITCH]:[0]) {
      for(let point=ORIGIN-PITCH;point<=END+PITCH;point+=PITCH) {
        dot(coordinate+offset,point,major?2:1);
        dot(point,coordinate+offset,major?2:1);
      }
    }
  }
  for(let row=0;row<9;row++)for(let column=0;column<9;column++) {
    const value=Number(BOARD[row][column]);if(!value)continue;
    const glyph=FONT[value],role=accentCells.has(`${row}:${column}`)?4:3;
    const x=ORIGIN+column*CELL+40,y=ORIGIN+row*CELL+24;
    for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==='1') {
      for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++)dot(x+(gx*2+sx)*PITCH,y+(gy*2+sy)*PITCH,role);
    }
  }
  const points=[[],[],[],[],[]];
  for(let row=0;row<GRID;row++)for(let column=0;column<GRID;column++) {
    const role=roles[row*GRID+column];if(role)points[role].push([column*PITCH,row*PITCH]);
  }
  const themes={
    dark:{colours:['','rgb(115,121,108)','rgb(146,155,134)','rgb(162,172,151)','rgb(125,164,121)'],alpha:[0,.68,.83,.94,.96]},
    light:{colours:['','rgb(116,126,107)','rgb(77,92,71)','rgb(67,88,66)','rgb(65,111,65)'],alpha:[0,.74,.9,.94,.95]},
  };
  const forced=matchMedia('(forced-colors: active)');
  let visible=true,pageShown=true,dirty=true;
  function draw() {
    if(!dirty||!visible||!pageShown||document.hidden||forced.matches)return;
    const theme=themes[document.documentElement.dataset.theme==='light'?'light':'dark'];
    ctx.clearRect(0,0,SIZE,SIZE);
    for(let role=1;role<=4;role++) {
      ctx.fillStyle=theme.colours[role];ctx.globalAlpha=theme.alpha[role];
      for(const[x,y]of points[role]) {
        ctx.beginPath();ctx.arc(x,y,RADIUS,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.globalAlpha=1;dirty=false;
  }
  function refresh() {
    dirty=true;canvas.style.visibility=forced.matches?'hidden':'';draw();
  }
  function resize() {
    const cssSize=Math.max(canvas.clientWidth||0,canvas.clientHeight||0);
    const backing=Math.min(3072,Math.max(SIZE,Math.round(cssSize*Math.min(devicePixelRatio||1,2))));
    if(canvas.width!==backing)canvas.width=backing;
    if(canvas.height!==backing)canvas.height=backing;
    ctx.setTransform(backing/SIZE,0,0,backing/SIZE,0,0);refresh();
  }
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{
    visible=entries.some(entry=>entry.isIntersecting);if(visible)draw();
  }).observe(canvas);
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
  forced.addEventListener('change',refresh);
  addEventListener('pagehide',()=>{pageShown=false;});
  addEventListener('pageshow',()=>{pageShown=true;draw();});
  resize();
})();
