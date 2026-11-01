/* Native 41 × 41 LED masks. Every "1" is one equally sized circular bead. */
(() => {
  'use strict';
  const size = 41;
  const segmentDistance = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  const line = (x, y, ax, ay, bx, by, width = 1.8) => segmentDistance(x, y, ax, ay, bx, by) <= width / 2;
  const circle = (x, y, cx, cy, radius, width = 1.8) => Math.abs(Math.hypot(x - cx, y - cy) - radius) <= width / 2;
  const roundedRectDistance = (x, y, left, top, right, bottom, radius) => {
    const qx = Math.abs(x - (left + right) / 2) - (right - left) / 2 + radius;
    const qy = Math.abs(y - (top + bottom) / 2) - (bottom - top) / 2 + radius;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  };
  const roundedRect = (x, y, left, top, right, bottom, radius, width = 1.8) => Math.abs(roundedRectDistance(x, y, left, top, right, bottom, radius)) <= width / 2;
  const polygon = (x, y, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  };
  const make = (id, paint) => ({
    id,
    rows: Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => paint(x, y) ? '1' : '0').join('')),
  });
  const phoneOutline = [[9,5],[6,6],[4,10],[5,16],[8,23],[14,29],[21,34],[28,36],[33,35],[36,31],[35,28],[28,24],[25,27],[22,26],[17,22],[13,17],[12,14],[15,11],[12,5]];
  const glyphs = [
    make('email', (x, y) =>
      roundedRect(x, y, 4, 10, 36, 31, 2) ||
      line(x, y, 5, 11, 20, 22) || line(x, y, 20, 22, 35, 11) ||
      line(x, y, 5, 30, 15, 22, 1.4) || line(x, y, 25, 22, 35, 30, 1.4)),
    make('phone', (x, y) => polygon(x, y, phoneOutline)),
    // A closed book, one folded page and a bookmark; the adjacent caption names the platform.
    make('xiaohongshu', (x, y) =>
      roundedRect(x, y, 9, 5, 33, 35, 2) ||
      line(x, y, 13, 6, 13, 34, 1.3) ||
      line(x, y, 10, 30, 32, 30, 1.3) ||
      line(x, y, 18, 14, 27, 14, 1.3) || line(x, y, 18, 19, 25, 19, 1.3) ||
      line(x, y, 26, 5, 26, 10, 1.3) || line(x, y, 30, 5, 30, 10, 1.3) ||
      line(x, y, 26, 10, 28, 8, 1.3) || line(x, y, 28, 8, 30, 10, 1.3)),
    make('x', (x, y) =>
      polygon(x, y, [[7,6],[14,6],[34,35],[27,35]]) ||
      line(x, y, 32, 6, 8, 35, 1.9)),
    make('instagram', (x, y) =>
      roundedRect(x, y, 6, 6, 34, 34, 8, 2) ||
      circle(x, y, 20, 20, 7, 2) || Math.hypot(x - 29, y - 11) <= 1.4),
    make('douyin', (x, y) => {
      const bowl = Math.abs(Math.hypot((x - 15.5) / 1.12, y - 29) - 6.1) <= 1.8;
      return bowl || (x >= 21 && x <= 25 && y >= 5 && y <= 28) ||
        polygon(x, y, [[25,5],[27,9],[30,12],[35,13],[35,18],[30,17],[25,14]]);
    }),
  ];
  window.PortfolioContactGlyphs = { size, glyphs };
})();

/* Native scrolling changes the brightness of fixed beads; no idle animation loop. */
(() => {
 'use strict';
 const page=document.getElementById('contact-page');if(!page)return;
 const stage=page.querySelector('.contact-stage'),stopsHost=page.querySelector('.contact-stops');
 const canvas=page.querySelector('canvas'),ctx=canvas.getContext('2d');
 const copy=page.querySelector('.contact-copy'),heading=page.querySelector('h1'),value=page.querySelector('.contact-value');
 const open=page.querySelector('.contact-open'),button=page.querySelector('.contact-copy-value'),status=page.querySelector('.contact-feedback'),next=page.querySelector('.contact-next');
 const channels=window.PortfolioContactChannels||[],size=window.PortfolioContactGlyphs.size;
 const glyphs=Object.fromEntries(window.PortfolioContactGlyphs.glyphs.map(g=>[g.id,g.rows.join('').split('').map(Number)]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,active=-1,generation=0,live=false,stops=[],geometry=[],themeInk='',themeRed='';
 const english=()=>window.PortfolioI18n?.language==='en';
 const label=c=>c.label[english()?'en':'zh'];
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const safeHref=c=>{if(!c?.href?.trim())return '';try{const u=new URL(c.href,location.href);return ['https:','mailto:','tel:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
 const available=()=>live&&!document.hidden&&page.classList.contains('live');
 const stopFragment=document.createDocumentFragment();
 channels.forEach((channel,index)=>{
  const stop=document.createElement('section');stop.className='contact-stop portfolio-snap-page';stop.dataset.contactStop=channel.id;
  stop.id=`contact-${channel.id}`;stop.dataset.snapLabel=label(channel);stopFragment.append(stop);stops.push(stop);
 });
 stopsHost.append(stopFragment);
 const pattern=['0001000','0001000','0001000','1001001','0101010','0011100','0001000'];
 pattern.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='1')return;const d=document.createElement('i');d.className='scroll-cue-led';d.style.gridColumn=x+1;d.style.gridRow=y+1;d.style.setProperty('--led-row',y);next.firstElementChild.append(d);}));
 function showInfo(index){
  if(index===active)return;
  active=index;generation++;
  const c=channels[index],href=safeHref(c),filled=!!c.value&&!!href;
  page.dataset.contactActive=c.id;
  heading.textContent=label(c);value.textContent=c.value||'';
  if(filled)value.setAttribute('href',href);else value.removeAttribute('href');
  open.hidden=button.hidden=!filled;button.disabled=!filled;status.textContent='';
  if(filled){open.href=href;open.querySelector('span').textContent=english()?(c.id==='email'?'Send email':c.id==='phone'?'Call':'Open profile'):(c.id==='email'?'发邮件':c.id==='phone'?'拨打电话':'打开主页');}
  const external=filled&&href.startsWith('https:');
  if(external){open.target=value.target='_blank';open.rel=value.rel='noopener noreferrer';}
  else {for(const el of [open,value]){el.removeAttribute('target');el.removeAttribute('rel');}}
  button.querySelector('span').textContent=english()?(c.id==='email'?'Copy email':c.id==='phone'?'Copy number':'Copy handle'):(c.id==='email'?'复制邮箱':c.id==='phone'?'复制号码':'复制账号');
  next.hidden=index===channels.length-1;
  next.setAttribute('aria-label',english()?'Next contact channel':'下一个联系方式');
  if(!next.hidden)next.setAttribute('aria-controls',stops[index+1].id);
 }
 function measure(){
  if(!available())return;
  // Reading the stops can settle native snapping after their insertion.
  // Capture scrollY after layout, rather than adding a pre-layout position.
  const positions=stops.map(el=>el.getBoundingClientRect().top),y=scrollY;geometry=positions.map(top=>top+y);
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(rect.width*dpr));if(canvas.width!==w||canvas.height!==w){canvas.width=w;canvas.height=w;}
  const style=getComputedStyle(page);themeInk=style.color;themeRed=style.getPropertyValue('--red').trim()||'#d9584c';
 }
 function draw(){
  frame=0;if(!available()||!geometry.length)return;
  const y=scrollY;let from=0;
  while(from<channels.length-1&&y>=geometry[from+1])from++;
  const to=Math.min(from+1,channels.length-1),span=geometry[to]-geometry[from]||1;
  const progress=to===from?0:clamp((y-geometry[from])/span);
  const index=y+innerHeight*.42>=geometry[to]?to:from;
  const mix=reduced.matches?(index===to?1:0):smooth((progress-.18)/.64);
  showInfo(index);
  const fade=reduced.matches?1:1-Math.sin(mix*Math.PI)*.85;
  copy.style.opacity=fade;copy.style.transform=reduced.matches?'none':`translateY(${mix<.5?-mix*16:(1-mix)*16}px)`;
  copy.style.pointerEvents=fade<.5?'none':'';
  if(!ctx)return;
  const a=glyphs[channels[from].id],b=glyphs[channels[to].id],w=canvas.width,scale=w/480;
  ctx.clearRect(0,0,w,w);
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
   const i=row*size+col;
   const phase=reduced.matches?mix:smooth((mix-(col+row)/(size*2)*.14)/.86);
   const light=a[i]*(1-phase)+b[i]*phase;if(light<.015)continue;
   ctx.globalAlpha=light*.94;ctx.fillStyle=themeInk;
   ctx.beginPath();ctx.arc((40+col*10)*scale,(40+row*10)*scale,1.9*scale,0,Math.PI*2);ctx.fill();
  }
  const seal=(from===0?1-mix:0)+(to===0?mix:0);
  if(seal>.01){ctx.globalAlpha=seal;ctx.fillStyle=themeRed;ctx.beginPath();ctx.arc(240*scale,270*scale,3.2*scale,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
 }
 function queue(){if(available()&&!frame)frame=requestAnimationFrame(draw);}
 function resetFeedback(){generation++;status.textContent='';button.disabled=!channels[active]?.value||!safeHref(channels[active]);}
 function activate(){live=page.classList.contains('live');next.dataset.paused=String(!available());if(!available()){if(frame)cancelAnimationFrame(frame);frame=0;resetFeedback();return;}if(frame)cancelAnimationFrame(frame);frame=0;measure();active=-1;draw();}
 next.addEventListener('click',()=>{if(available()&&active<channels.length-1)stops[active+1].scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});});
 button.addEventListener('click',async()=>{
  const c=channels[active];if(button.disabled||!available()||!c?.value||!safeHref(c))return;
  const token=++generation;button.disabled=true;status.textContent='';
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(c.value);if(token===generation&&available())status.textContent=english()?'Copied':'已复制';}
  catch(_){if(token!==generation||!available())return;const selection=getSelection(),range=document.createRange();range.selectNodeContents(value);selection?.removeAllRanges();selection?.addRange(range);status.textContent=english()?'Select the address to copy.':'请选中地址复制。';}
  finally{if(token===generation)button.disabled=false;}
 });
 addEventListener('scroll',queue,{passive:true});
 addEventListener('resize',()=>{measure();queue();},{passive:true});
 addEventListener('portfolio:navigation',activate);
 addEventListener('portfolio:language',()=>{stops.forEach((el,i)=>el.dataset.snapLabel=label(channels[i]));active=-1;activate();});
 document.addEventListener('visibilitychange',activate);
 addEventListener('pageshow',activate);
 addEventListener('pagehide',()=>{live=false;if(frame)cancelAnimationFrame(frame);frame=0;resetFeedback();});
 reduced.addEventListener('change',queue);
 new MutationObserver(()=>{measure();queue();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 if('ResizeObserver'in window)new ResizeObserver(()=>{measure();queue();}).observe(stage);
 activate();
})();
