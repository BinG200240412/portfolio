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

/* Contact stickers share one physical LED screen. Pictures may sway inside
   the framebuffer; the final bulbs always stay on the same hardware grid. */
(() => {
 'use strict';
 const page=document.getElementById('contact-page');if(!page)return;
 const canvas=page.querySelector('.contact-matrix'),ctx=canvas.getContext('2d',{alpha:true});
 const stage=page.querySelector('.contact-stage'),hits=page.querySelector('.contact-stickers');
 const copy=page.querySelector('.contact-copy'),heading=page.querySelector('h1'),value=page.querySelector('.contact-value');
 const open=page.querySelector('.contact-open'),button=page.querySelector('.contact-copy-value'),status=page.querySelector('.contact-feedback');
 const channels=window.PortfolioContactChannels||[],size=window.PortfolioContactGlyphs.size,count=size*size;
 if(!ctx||!channels.length)return;
 const glyphs=Object.fromEntries(window.PortfolioContactGlyphs.glyphs.map(g=>[g.id,Float32Array.from(g.rows.join(''),Number)]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const controls=[],bounds={};
 let width=0,height=0,ratio=1,pitch=3,columns=1,rows=1,placements=[];
 let boardInk=new Uint8Array(1),boardLight=new Float32Array(1),sprites=[],paletteTheme='';
 let frame=0,lastTick=0,time=0,live=false,selected=0,active=-1,hover=-1,generation=0,motion=null,frames=0;
 const pulseStarts=new Float64Array(channels.length);pulseStarts.fill(-10);
 const english=()=>window.PortfolioI18n?.language==='en';
 const label=c=>c.label[english()?'en':'zh'];
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

 const safeHref=c=>{if(!c?.href?.trim())return '';try{const u=new URL(c.href,location.href);return ['https:','mailto:','tel:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
 const available=()=>live&&!document.hidden&&page.classList.contains('live');
 for(const c of channels){
  let left=size,top=size,right=0,bottom=0;
  glyphs[c.id].forEach((v,i)=>{if(!v)return;const x=i%size,y=Math.floor(i/size);left=Math.min(left,x-.5);top=Math.min(top,y-.5);right=Math.max(right,x+.5);bottom=Math.max(bottom,y+.5);});
  bounds[c.id]={left,top,right,bottom};
 }
 function makeSprite(colour){
  const c=document.createElement('canvas');c.width=c.height=24;const p=c.getContext('2d');p.fillStyle=colour;p.beginPath();p.arc(12,12,6,0,Math.PI*2);p.fill();return c;
 }
 function refreshPalettes(){
  const theme=document.documentElement.dataset.theme==='light'?'light':'dark';if(theme===paletteTheme)return;
  paletteTheme=theme;const variant=theme==='light'?1:0;sprites=[null];
  channels.forEach(c=>[theme==='light'?'#30332f':'#e0dfd9',...colourways[c.id][variant]].forEach(colour=>sprites.push(makeSprite(colour))));
 }
 function labels(){
  hits.setAttribute('aria-label',english()?'Contact channels':'联系方式');
  controls.forEach((control,i)=>control.setAttribute('aria-label',english()?`Select ${label(channels[i])}`:`选择${label(channels[i])}`));
 }
 channels.forEach((channel,index)=>{
  const control=document.createElement('button');control.type='button';control.className='contact-sticker-hit';control.dataset.contactChannel=channel.id;
  control.setAttribute('aria-controls','contact-title');controls.push(control);hits.append(control);
  control.addEventListener('click',()=>change(index));
  const enter=()=>{hover=index;if(available())pulseStarts[index]=time;};
  const leave=()=>{if(hover===index)hover=-1;};
  control.addEventListener('mouseenter',enter);control.addEventListener('mouseleave',leave);control.addEventListener('focus',enter);control.addEventListener('blur',leave);
 });
 function showInfo(index){
  if(index===active)return;active=index;generation++;
  const c=channels[index],href=safeHref(c),filled=!!c.value&&!!href;
  page.dataset.contactActive=c.id;heading.textContent=label(c);value.textContent=c.value||'';
  if(filled)value.setAttribute('href',href);else value.removeAttribute('href');
  open.hidden=button.hidden=!filled;button.disabled=!filled;status.textContent='';
  if(filled){open.href=href;open.querySelector('span').textContent=english()?(c.id==='email'?'Send email':c.id==='phone'?'Call':'Open profile'):(c.id==='email'?'发邮件':c.id==='phone'?'拨打电话':'打开主页');}
  const external=filled&&href.startsWith('https:');
  for(const el of [open,value]){if(external){el.target='_blank';el.rel='noopener noreferrer';}else{el.removeAttribute('target');el.removeAttribute('rel');}}
  button.querySelector('span').textContent=english()?(c.id==='email'?'Copy email':c.id==='phone'?'Copy number':'Copy handle'):(c.id==='email'?'复制邮箱':c.id==='phone'?'复制号码':'复制账号');
  controls.forEach((c,i)=>{c.classList.toggle('is-current',i===index);c.setAttribute('aria-pressed',String(i===index));});
 }
 function boxFor(p){
  const b=bounds[p.id],out={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
  for(const x of [b.left,b.right])for(const y of [b.top,b.bottom]){
   const u=(x-20)*p.scale,v=(y-20)*p.scale,px=p.x+u*p.cos-v*p.sin,py=p.y+u*p.sin+v*p.cos;
   out.left=Math.min(out.left,px);out.right=Math.max(out.right,px);out.top=Math.min(out.top,py);out.bottom=Math.max(out.bottom,py);
  }
  return out;
 }
 const intersects=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
 function measure(){
  if(!available())return;
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;ratio=Math.min(devicePixelRatio||1,1.5);
  const unit=width<700?width:Math.min(width,height);pitch=Math.max(3,unit/170);columns=Math.ceil(width/pitch);rows=Math.ceil(height/pitch);
  boardInk=new Uint8Array(columns*rows);boardLight=new Float32Array(columns*rows);
  const w=Math.round(width*ratio),h=Math.round(height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const mobile=width<700,landscape=height<560&&width>=540;
  const compact=Math.min(1,height/780);
  let specs;
  if(landscape)specs=[[.16,.27,.29,-.12],[.83,.25,.23,.14],[.31,.88,.19,-.08],[.15,.63,.16,.08],[.85,.64,.24,-.10],[.68,.89,.18,.13]];
  else if(mobile)specs=[[.29,.20,.62,-.12],[.81,.27,.36,.13],[.80,.74,.39,-.08],[.72,.125,.20,.10],[.20,.77,.37,-.13],[.52,.91,.34,.10]];
  else specs=[[.18,.24,.42,-.12],[.80,.20,.26,.13],[.83,.73,.31,-.08],[.48,.13,.15,.10],[.19,.75,.30,-.12],[.51,.85,.23,.12]];
  if(mobile&&!landscape&&height<740){
   specs[0]=[.29,.20,.54,-.12];specs[1]=[.84,.24,.32,.13];specs[3]=[.59,.295,.14,.10];
  }
  const multiplier=mobile&&!landscape?compact:1,artUnit=landscape?Math.min(width,height):unit;
  const text=copy.getBoundingClientRect(),clear={left:text.left-rect.left-14,right:text.right-rect.left+14,top:text.top-rect.top-14,bottom:text.bottom-rect.top+14};
  placements=specs.map((s,i)=>{
   const p={id:channels[i].id,x:s[0]*width,y:s[1]*height,scale:s[2]*artUnit*multiplier/size,angle:s[3],phase:i*1.71};p.cos=Math.cos(p.angle);p.sin=Math.sin(p.angle);
   // Move a whole sticker away from the actual copy. Never crop a rectangle out of it.
   for(let pass=0;pass<3;pass++){
    let b=boxFor(p);
    if(intersects(b,clear)){p.y+=p.y<height*.5?clear.top-b.bottom:clear.bottom-b.top;b=boxFor(p);}
    const dx=Math.max(14-b.left,0)-Math.max(b.right-(width-14),0),dy=Math.max(70-b.top,0)-Math.max(b.bottom-(height-14),0);p.x+=dx;p.y+=dy;
   }
   const b=boxFor(p);p.box=b;
   const hit=controls[i];hit.style.left=`${b.left-7}px`;hit.style.top=`${b.top-7}px`;hit.style.width=`${Math.max(44,b.right-b.left+14)}px`;hit.style.height=`${Math.max(44,b.bottom-b.top+14)}px`;
   return p;
  });
  canvas.dataset.ledGridPitch=pitch.toFixed(6);canvas.dataset.ledDiameter=(pitch*.7).toFixed(6);canvas.dataset.contactGlyphs=String(placements.length);
  refreshPalettes();paint();
 }
 function paint(){
  if(!available()||!width||!placements.length)return;
  boardInk.fill(0);boardLight.fill(0);
  for(let n=0;n<placements.length;n++){
   const p=placements[n],id=p.id,phase=p.phase;
   const dx=reduced.matches?0:Math.sin(time*.58+phase)*2.8,dy=reduced.matches?0:Math.cos(time*.46+phase)*3.2;
   const angle=p.angle+(reduced.matches?0:Math.sin(time*.43+phase)*.013)+(hover===n&&!reduced.matches?Math.sin(time*2.4)*.012:0);
   const cos=Math.cos(angle),sin=Math.sin(angle),base=restLights[id],roles=roleMaps[id],age=time-pulseStarts[n];
   const box=p.box,pad=10;
   for(let r=Math.max(0,Math.floor((box.top-pad)/pitch));r<Math.min(rows,Math.ceil((box.bottom+pad)/pitch));r++){
    const py=(r+.5)*pitch-p.y-dy;
    for(let c=Math.max(0,Math.floor((box.left-pad)/pitch));c<Math.min(columns,Math.ceil((box.right+pad)/pitch));c++){
     const px=(c+.5)*pitch-p.x-dx,x=Math.round((px*cos+py*sin)/p.scale+20),y=Math.round((-px*sin+py*cos)/p.scale+20);
     if(x<0||y<0||x>=size||y>=size)continue;const at=y*size+x;if(!base[at])continue;
     const local=age-.07-ranks[id][at]*.42,wave=reduced.matches||age<0||age>1?0:Math.sin(Math.PI*clamp(local/.34));
     const light=base[at]*(1-.46*wave*wave)*(n===selected||hover===n?1:.82),cell=r*columns+c;
     if(light>=boardLight[cell]){boardLight[cell]=light;boardInk[cell]=1+n*3+roles[at];}
    }
   }
   controls[n].style.transform=`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);const dotSize=pitch*1.4;let lit=0;
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
   const at=r*columns+c,ink=boardInk[at];if(!ink)continue;
   ctx.globalAlpha=boardLight[at]*.94;ctx.drawImage(sprites[ink],(c+.5)*pitch-dotSize/2,(r+.5)*pitch-dotSize/2,dotSize,dotSize);lit++;
  }
  ctx.globalAlpha=1;canvas.dataset.ledFrame=String(++frames);canvas.dataset.ledTime=time.toFixed(3);canvas.dataset.ledPoints=String(lit);
 }
 function tick(now){
  frame=0;if(!available())return;
  if(!lastTick||now-lastTick>=49){
   if(lastTick)time+=Math.min(.10,(now-lastTick)/1000);lastTick=now;
   if(motion){const p=clamp((time-motion.start)/.8);if(p>=.28)showInfo(motion.target);copy.style.opacity=p<.28?String(motion.opacity*(1-smooth(p/.22))):String(smooth((p-.28)/.32));if(p>=1){motion=null;copy.inert=false;copy.style.opacity='1';button.disabled=!channels[active]?.value||!safeHref(channels[active]);page.dataset.contactTransition='idle';}}
   paint();
  }
  if(!reduced.matches||motion)frame=requestAnimationFrame(tick);
 }
 function run(){if(available()&&!frame){canvas.dataset.ledRunning=String(!reduced.matches);if(reduced.matches&&!motion)paint();else frame=requestAnimationFrame(tick);}}
 function change(index){
  if(!available())return;index=(index+channels.length)%channels.length;selected=index;generation++;status.textContent='';pulseStarts[index]=time;
  if(copy.contains(document.activeElement))controls[index].focus({preventScroll:true});
  if(reduced.matches){motion=null;copy.inert=false;copy.style.opacity='1';showInfo(index);button.disabled=!channels[active]?.value||!safeHref(channels[active]);page.dataset.contactTransition='idle';measure();return;}
  copy.inert=true;motion={target:index,start:time,opacity:Number(copy.style.opacity||1)};page.dataset.contactTransition='running';run();
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;lastTick=0;motion=null;hover=-1;pulseStarts.fill(-10);generation++;status.textContent='';copy.inert=false;copy.style.opacity='1';page.dataset.contactTransition='idle';canvas.dataset.ledRunning='false';}
 function activate(){
  const entering=!live&&page.classList.contains('live');live=page.classList.contains('live');
  if(!available()){stop();return;}stop();if(entering){selected=0;window.scrollTo({top:0,left:0,behavior:'instant'});}labels();active=-1;showInfo(selected);measure();run();
 }
 page.addEventListener('keydown',event=>{
  if(!available()||event.defaultPrevented||event.isComposing||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,[contenteditable]'))return;
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();const index=(selected+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+channels.length)%channels.length;controls[index].focus({preventScroll:true});change(index);}
 });
 button.addEventListener('click',async()=>{
  const c=channels[active];if(button.disabled||!available()||motion||!c?.value||!safeHref(c))return;const token=++generation;button.disabled=true;status.textContent='';
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(c.value);if(token===generation&&available())status.textContent=english()?'Copied':'已复制';}
  catch(_){if(token!==generation||!available())return;const selection=getSelection(),range=document.createRange();range.selectNodeContents(value);selection?.removeAllRanges();selection?.addRange(range);status.textContent=english()?'Select the address to copy.':'请选中地址复制。';}
  finally{if(token===generation)button.disabled=false;}
 });
 addEventListener('resize',()=>{measure();run();},{passive:true});addEventListener('portfolio:navigation',activate);addEventListener('portfolio:language',activate);
 document.addEventListener('visibilitychange',activate);addEventListener('pageshow',activate);addEventListener('pagehide',()=>{live=false;stop();});
 reduced.addEventListener('change',activate);
 new MutationObserver(()=>{refreshPalettes();paint();run();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 if('ResizeObserver'in window){const ro=new ResizeObserver(()=>{measure();run();});ro.observe(stage);ro.observe(copy);}
 document.fonts?.ready.then(()=>{measure();run();});activate();
})();
