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
      line(x, y, 5, 30, 15, 22, 1.4) || line(x, y, 25, 22, 35, 30, 1.4) || (x === 20 && y === 23)),
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

/* Light follows each object's connected structure, on one fixed LED grid. */
(() => {
 'use strict';
 const page=document.getElementById('contact-page');if(!page)return;
 const stage=page.querySelector('.contact-stage'),canvas=page.querySelector('canvas'),ctx=canvas.getContext('2d');
 const copy=page.querySelector('.contact-copy'),heading=page.querySelector('h1'),value=page.querySelector('.contact-value');
 const open=page.querySelector('.contact-open'),button=page.querySelector('.contact-copy-value'),status=page.querySelector('.contact-feedback');
 const next=page.querySelector('.contact-next'),nav=page.querySelector('.contact-channel-nav');
 const channels=window.PortfolioContactChannels||[],size=window.PortfolioContactGlyphs.size,count=size*size;
 if(!channels.length)return;
 const glyphs=Object.fromEntries(window.PortfolioContactGlyphs.glyphs.map(g=>[g.id,Float32Array.from(g.rows.join(''),Number)]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,active=-1,selected=0,generation=0,live=false,motion=null,serial=0;
 let lights=new Float32Array(count),owners=new Uint8Array(count),tones=new Uint8Array(count);
 let palettes=[],paletteTheme='',wheelTotal=0,wheelArmed=true,wheelTimer=0,touch=null;
 const controls=[];
 const english=()=>window.PortfolioI18n?.language==='en';
 const label=c=>c.label[english()?'en':'zh'];
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const hash=n=>{n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967295;};
 // The wave travels through occupied neighbours, including isolated details.
 // Every connected component has a seed; empty cells receive no light.
 const anchors={email:[20,10],phone:[8,5],xiaohongshu:[10,5],x:[7,6],instagram:[6,6],douyin:[23,5]};
 function trace(mask,anchor){
  const ranks=new Float32Array(count),seen=new Uint8Array(count),raw=new Float32Array(count);
  const occupied=[];for(let i=0;i<count;i++)if(mask[i]>.015)occupied.push(i);
  const steps=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  let maximum=1;
  for(const first of occupied){
   if(seen[first])continue;
   const component=[first];seen[first]=1;
   for(let n=0;n<component.length;n++){
    const at=component[n],x=at%size,y=Math.floor(at/size);
    for(const [dx,dy] of steps){const nx=x+dx,ny=y+dy,ni=ny*size+nx;if(nx<0||ny<0||nx>=size||ny>=size||seen[ni]||mask[ni]<=.015)continue;seen[ni]=1;component.push(ni);}
   }
   let seed=first,nearest=Infinity;
   for(const at of component){const d=Math.hypot(at%size-anchor[0],Math.floor(at/size)-anchor[1]);if(d<nearest){nearest=d;seed=at;}}
   const distance=new Int16Array(count);distance.fill(-1);distance[seed]=0;
   const queue=[seed];
   for(let n=0;n<queue.length;n++){
    const at=queue[n],x=at%size,y=Math.floor(at/size);
    for(const [dx,dy] of steps){const nx=x+dx,ny=y+dy,ni=ny*size+nx;if(nx<0||ny<0||nx>=size||ny>=size||distance[ni]>=0||mask[ni]<=.015)continue;distance[ni]=distance[at]+1;queue.push(ni);}
   }
   for(const at of component){raw[at]=distance[at]+nearest*.38;maximum=Math.max(maximum,raw[at]);}
  }
  for(const at of occupied)ranks[at]=raw[at]/maximum;
  return ranks;
 }
 function tone(id,x,y){
  if(id==='email')return x===20&&y===23?2:(y>=12&&y<=22&&x>6&&x<35?1:0);
  if(id==='phone')return y<12||x>24&&y>26?2:(x>12&&y<28?1:0);
  if(id==='xiaohongshu')return x<=14?1:(x>=31||y<=7||y>=32?2:0);
  if(id==='x')return Math.abs(x+y-40)<3?2:1;
  if(id==='instagram')return x>=11&&x<=29&&y>=11&&y<=29?(x>26&&y<14?2:0):1;
  return y>=24&&x<=21?2:(x>=21&&x<30?1:0);
 }
 const ranks={},roleMaps={},restLights={};
 for(const channel of channels){
  const id=channel.id;roleMaps[id]=Uint8Array.from({length:count},(_,i)=>tone(id,i%size,Math.floor(i/size)));
  ranks[id]=trace(glyphs[id],anchors[id]);
  restLights[id]=Float32Array.from(glyphs[id],(v,i)=>v*(roleMaps[id][i]===0?.83:roleMaps[id][i]===2?.94:1));
 }
 // Flat, object-specific colours. Light mode uses deeper inks for the same roles.
 const colourways={
  email:[['#8ea8ba','#c78e80'],['#426e89','#a75546']],
  phone:[['#9caf9a','#c4ac82'],['#4d7059','#8b6c3d']],
  xiaohongshu:[['#c1887d','#b897a4'],['#a04f43','#885b6d']],
  x:[['#94a8b8','#ada1be'],['#4b6a80','#77628c']],
  instagram:[['#c193ac','#c3ab81'],['#9c607e','#8b6e3c']],
  douyin:[['#8fada9','#c08f91'],['#3e7974','#9e5e64']],
 };
 function refreshPalettes(){
  const theme=document.documentElement.dataset.theme==='light'?'light':'dark';
  if(theme!==paletteTheme){paletteTheme=theme;const variant=theme==='light'?1:0;palettes=channels.map(c=>[theme==='light'?'#30332f':'#e0dfd9',...colourways[c.id][variant]]);}
  if(active>=0){next.style.color=palettes[active][1];controls.forEach((c,i)=>c.style.color=i===active?palettes[i][1]:'');}
 }
 const safeHref=c=>{if(!c?.href?.trim())return '';try{const u=new URL(c.href,location.href);return ['https:','mailto:','tel:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
 const available=()=>live&&!document.hidden&&page.classList.contains('live');
 channels.forEach((channel,index)=>{
  const control=document.createElement('button');control.type='button';control.className='contact-channel-point';
  control.setAttribute('aria-controls','contact-title');control.dataset.contactChannel=channel.id;
  const led=document.createElement('span');led.className='contact-channel-light';led.setAttribute('aria-hidden','true');control.append(led);
  control.addEventListener('click',()=>change(index));nav.append(control);controls.push(control);
 });
 const pattern=['0001000','0001000','0001000','1001001','0101010','0011100','0001000'];
 pattern.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='1')return;const d=document.createElement('i');d.className='scroll-cue-led';d.style.gridColumn=x+1;d.style.gridRow=y+1;d.style.setProperty('--led-row',y);next.firstElementChild.append(d);}));
 function labels(){
  nav.setAttribute('aria-label',english()?'Contact channels':'联系方式');
  next.setAttribute('aria-label',english()?'Next contact channel':'下一个联系方式');
  next.setAttribute('aria-controls','contact-title');
  controls.forEach((c,i)=>c.setAttribute('aria-label',english()?`Switch to ${label(channels[i])}`:`切换到${label(channels[i])}`));
 }
 function showInfo(index){
  if(index===active)return;
  active=index;generation++;
  const c=channels[index],href=safeHref(c),filled=!!c.value&&!!href;
  page.dataset.contactActive=c.id;heading.textContent=label(c);value.textContent=c.value||'';
  if(filled)value.setAttribute('href',href);else value.removeAttribute('href');
  open.hidden=button.hidden=!filled;button.disabled=!filled;status.textContent='';
  if(filled){open.href=href;open.querySelector('span').textContent=english()?(c.id==='email'?'Send email':c.id==='phone'?'Call':'Open profile'):(c.id==='email'?'发邮件':c.id==='phone'?'拨打电话':'打开主页');}
  const external=filled&&href.startsWith('https:');
  if(external){open.target=value.target='_blank';open.rel=value.rel='noopener noreferrer';}
  else {for(const el of [open,value]){el.removeAttribute('target');el.removeAttribute('rel');}}
  button.querySelector('span').textContent=english()?(c.id==='email'?'Copy email':c.id==='phone'?'Copy number':'Copy handle'):(c.id==='email'?'复制邮箱':c.id==='phone'?'复制号码':'复制账号');
  controls.forEach((c,i)=>{const distance=Math.abs(i-index);c.classList.toggle('is-current',distance===0);c.classList.toggle('is-near',distance===1);c.setAttribute('aria-pressed',String(distance===0));});
  refreshPalettes();
 }
 function measure(){
  if(!available())return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr));
  if(canvas.width!==w||canvas.height!==w){canvas.width=w;canvas.height=w;}
  refreshPalettes();
 }
 function paint(){
  if(!ctx)return;const scale=canvas.width/480;ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
   const i=row*size+col,light=lights[i];if(light<.015)continue;
   ctx.fillStyle=palettes[owners[i]][tones[i]];ctx.globalAlpha=light*.94;
   ctx.beginPath();ctx.arc((40+col*10)*scale,(40+row*10)*scale,1.9*scale,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 function settle(){
  motion=null;page.dataset.contactTransition='idle';showInfo(selected);lights.set(restLights[channels[selected].id]);owners.fill(selected);tones.set(roleMaps[channels[selected].id]);copy.style.opacity='1';copy.inert=false;button.disabled=!channels[active]?.value||!safeHref(channels[active]);paint();
 }
 function tick(now){
  frame=0;if(!available())return;if(!motion){paint();return;}
  const p=clamp((now-motion.start)/1120),id=channels[motion.target].id,target=restLights[id];
  if(p>=1){settle();return;}
  for(let i=0;i<count;i++){
   // A shared small-region delay keeps neighbouring beads related. The pulse
   // follows their path through the icon, never the surrounding empty square.
   const patch=Math.floor(i%size/4)+Math.floor(i/size/4)*13;
   const jitter=hash(patch+motion.seed)*.055;
   const old=motion.from[i]*(1-smooth((p-.015-motion.oldRanks[i]*.28-jitter)/.23));
   const local=p-.10-ranks[id][i]*.50-jitter;
   const dip=Math.sin(Math.PI*clamp((local-.075)/.19));
   const resolved=target[i]*smooth(local/.075)*(1-.66*dip*dip);
   lights[i]=Math.max(old,resolved);
   const arrives=resolved>=old;
   owners[i]=arrives?motion.target:motion.fromOwners[i];
   tones[i]=arrives?roleMaps[id][i]:motion.fromTones[i];
  }
  if(p>=.42)showInfo(motion.target);
  copy.style.opacity=p<.42?String(1-smooth(p/.2)):String(smooth((p-.42)/.25));
  paint();
  frame=requestAnimationFrame(tick);
 }
 function queue(){if(available()&&!frame)frame=requestAnimationFrame(tick);}
 function change(index){
  if(!available())return;index=(index+channels.length)%channels.length;
  if(index===selected)return;
  selected=index;generation++;status.textContent='';
  if(frame)cancelAnimationFrame(frame);frame=0;
  if(reduced.matches){settle();return;}
  if(copy.contains(document.activeElement))next.focus({preventScroll:true});
  copy.inert=true;page.dataset.contactTransition='running';
  const snapshot=lights.slice();
  motion={target:index,from:snapshot,fromOwners:owners.slice(),fromTones:tones.slice(),oldRanks:trace(snapshot,anchors[channels[Math.max(0,active)].id]),start:performance.now(),seed:++serial*7919};queue();
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;clearTimeout(wheelTimer);wheelTimer=0;wheelTotal=0;wheelArmed=true;touch=null;generation++;status.textContent='';motion=null;copy.inert=false;copy.style.opacity='1';page.dataset.contactTransition='idle';}
 function activate(){
  const entering=!live&&page.classList.contains('live');live=page.classList.contains('live');next.dataset.paused=String(!available());
  if(!available()){stop();return;}
  if(entering){selected=0;window.scrollTo({top:0,left:0,behavior:'instant'});}
  stop();labels();active=-1;showInfo(selected);measure();settle();
 }
 next.addEventListener('click',()=>change(selected+1));
 page.addEventListener('wheel',event=>{
  if(!available()||event.ctrlKey)return;
  clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelArmed=true;wheelTotal=0;},220);
  if(!wheelArmed||motion)return;
  wheelTotal+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  if(Math.abs(wheelTotal)<45)return;wheelArmed=false;change(selected+(wheelTotal>0?1:-1));wheelTotal=0;
 },{passive:true});
 page.addEventListener('touchstart',event=>{if(event.touches.length!==1||event.target.closest('a,button,input,textarea')){touch=null;return;}touch={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
 page.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
 page.addEventListener('touchend',event=>{if(!touch||!event.changedTouches.length)return;const t=event.changedTouches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;touch=null;if(Math.abs(dy)>45&&Math.abs(dy)>Math.abs(dx)*1.3)change(selected+(dy>0?1:-1));},{passive:true});
 page.addEventListener('keydown',event=>{
  if(!available()||event.defaultPrevented||event.isComposing||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,[contenteditable]'))return;
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();change(selected+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1));}
 });
 button.addEventListener('click',async()=>{
  const c=channels[active];if(button.disabled||!available()||motion||!c?.value||!safeHref(c))return;
  const token=++generation;button.disabled=true;status.textContent='';
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(c.value);if(token===generation&&available())status.textContent=english()?'Copied':'已复制';}
  catch(_){if(token!==generation||!available())return;const selection=getSelection(),range=document.createRange();range.selectNodeContents(value);selection?.removeAllRanges();selection?.addRange(range);status.textContent=english()?'Select the address to copy.':'请选中地址复制。';}
  finally{if(token===generation)button.disabled=false;}
 });
 addEventListener('resize',()=>{measure();queue();},{passive:true});
 addEventListener('portfolio:navigation',activate);addEventListener('portfolio:language',activate);
 document.addEventListener('visibilitychange',activate);addEventListener('pageshow',activate);
 addEventListener('pagehide',()=>{live=false;stop();});
 reduced.addEventListener('change',()=>{if(available()){stop();settle();}});
 new MutationObserver(()=>{measure();queue();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 if('ResizeObserver'in window)new ResizeObserver(()=>{measure();queue();}).observe(stage);
 activate();
})();
