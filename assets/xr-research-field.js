/* Native terrain vertices and edges. Lighting never displaces the mesh;
 * only a deliberate camera gesture changes its projection. */
/* Offscreen media starts near its section, after the first screen can render.
 * data-nearby-state records only initialization, not download completion. */
((target, scriptURL, initialize) => {
  'use strict';
  if (!target) return;
  target.dataset.nearbyState = 'waiting';
  let started = false, observer;
  function check() {
    if (started) return;
    const box = target.getBoundingClientRect();
    const viewport = window.innerHeight || 800;
    const lead = viewport * .8;
    const visible = box.top < viewport && box.bottom >= 0;
    const approaching = window.scrollY > 8 && box.top < viewport + lead && box.bottom > -lead;
    // A below-fold section may already lie inside the lookahead on first load.
    // Keep that work out of the opening; direct links already in view still run.
    if (!visible && !approaching) return;
    started = true;
    observer?.disconnect();
    ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => removeEventListener(type, check));
    target.dataset.nearbyState = 'started';
    initialize(scriptURL);
  }
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(check, {rootMargin: `${Math.round((window.innerHeight || 800) * .8)}px 0px`});
    observer.observe(target);
  }
  // Geometry checks also provide the fallback when IntersectionObserver is absent.
  ['scroll', 'resize', 'hashchange', 'pageshow'].forEach(type => addEventListener(type, check, {passive: true}));
  check();
})(document.getElementById("gogo-research-terrain"), document.currentScript?.src || document.baseURI, scriptURL => {

  'use strict';
  const canvas=document.getElementById('gogo-research-terrain');
  if(!canvas)return;
  const context=canvas.getContext('2d');if(!context)return;
  const shell=canvas.closest('.gogo-terrain-shell'),reset=shell.querySelector('.gogo-terrain-reset'),status=shell.querySelector('.gogo-terrain-status');
  const dialog=document.getElementById('gogo-lightbox'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const COLS=65,ROWS=49,TAU=Math.PI*2,DEFAULT_YAW=-.48,DEFAULT_PITCH=.78;
  // Opaque pigments give paper the same depth cues without diluting each bead.
  const paperDepth=['#bfc1c4','#8e9196','#53585f'],paperGlow=['#cbd0d6','#aab1ba','#858f9b','#586676','#2e3b4d'],paperWarm=['#ddc797','#c6a56c','#a67f41','#805d2b','#604019'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function makeTerrain(cols,rows){
    const vertices=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=(col/(cols-1)-.5)*3.2,z=(row/(rows-1)-.5)*2.35;
      const hill=(cx,cz,sx,sz,h)=>h*Math.exp(-((x-cx)**2/sx+(z-cz)**2/sz));
      const river=z-.23*Math.sin(x*2.1)-.12;
      const y=.055+hill(-.48,-.18,.19,.34,.83)+hill(.62,-.55,.34,.18,.49)+hill(.85,.58,.22,.24,.25)+hill(-1.12,.59,.17,.11,.21)
        +.026*Math.sin(x*8+z*2)*Math.cos(z*7)-.075*Math.exp(-river*river/.016);
      vertices.push(Object.freeze({x,y,z,row,col}));
    }
    return Object.freeze(vertices);
  }
  function projectTerrain(vertices,yaw,pitch,w,h){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    const projected=vertices.map(v=>{
      const rx=v.x*cy+v.z*sy,rz=v.z*cy-v.x*sy,py=rz*sp-v.y*cp;
      minX=Math.min(minX,rx);maxX=Math.max(maxX,rx);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
      return{x:rx,y:py,depth:rz*cp+v.y*sp};
    });
    const pad=w<500?16:26,usableH=Math.max(1,h-54),scale=Math.min(Math.max(1,w-pad*2)/(maxX-minX),Math.max(1,usableH-pad*2)/(maxY-minY));
    const cx=(minX+maxX)/2,cz=(minY+maxY)/2;
    const result=projected.map(p=>({x:w/2+(p.x-cx)*scale,y:usableH/2+(p.y-cz)*scale,depth:p.depth}));
    const plane=[[-1.6,-1.175],[1.6,-1.175],[1.6,1.175],[-1.6,1.175]].map(([x,z])=>{
      const rx=x*cy+z*sy,rz=z*cy-x*sy;
      return {x:w/2+(rx-cx)*scale,y:usableH/2+(rz*sp-cz)*scale};
    });
    Object.defineProperty(result,'planeCorners',{value:plane});return result;
  }
  function nearestVertex(points,x,y,radius=28){
    let best=-1,distance=radius*radius;
    points.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<distance){best=i;distance=d;}});return best;
  }
  const vertices=makeTerrain(COLS,ROWS);
  let points=[],w=1,h=1,ratio=1,yaw=DEFAULT_YAW,pitch=DEFAULT_PITCH,hover=-1,selected=-1,gesture=null;
  let onScreen=false,shown=true,host=null,frame=0,lastFrame=0,clock=0,pulses=[],introduced=false,dirty=true;
  let light=false,ink='#bfc3c9',glow='#f4f5f6',warm='#e6c28d';
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  function active(){return onScreen&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));}
  function announce(zh,en){status.textContent=document.documentElement.lang.startsWith('en')?en:zh;}
  const fragmentHost=shell.querySelector('.gogo-culture-fragments'),stems=shell.querySelector('.gogo-culture-stems');
  const ns='http://www.w3.org/2000/svg';
  const fragments=[
    ['rice-sound','稻作声','Rice sound',.00,.22,33,12],['rice-tools','农具线框','Farm tools',.135,.13,25,21],['rice-soil','土地纹理','Soil patterns',.27,.06,18,29],
    ['water-ripples','涟漪纹样','Water ripples',.49,.045,8,32],['water-reflections','水域反光','Reflected light',.64,.045,11,45],['water-soundscape','低频声景','Low soundscape',.79,.045,17,56],
    ['moss-jade','玉器母题','Jade motifs',.00,.59,42,18],['moss-axis','礼制轴线','Ceremonial axis',.135,.66,44,29],['moss-geometry','台地几何','Terrace geometry',.27,.72,43,39]
  ].map((data,i)=>{
    const [file,zh,en,x,y,row,col]=data,button=document.createElement('button'),image=document.createElement('img'),caption=document.createElement('span');
    button.type='button';button.className='gogo-culture-card gogo-zoom';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-pressed','false');button.style.setProperty('--grow-delay',i*95+'ms');
    image.src='../assets/works/xr/research/fragments/'+file+'.webp';image.width=510;image.height=660;image.alt='';image.draggable=false;
    button.append(image,caption);fragmentHost.append(button);
    const path=document.createElementNS(ns,'path'),pin=document.createElementNS(ns,'circle');path.setAttribute('pathLength','1');path.style.setProperty('--grow-delay',i*95+'ms');pin.setAttribute('r','3.5');stems.append(path,pin);
    const index=row*COLS+col;
    button.addEventListener('click',()=>{illuminate(index);announce(zh+'，已点亮对应地貌触发点',en+': landscape trigger illuminated');});
    const lightPin=()=>{hover=index;dirty=true;schedule();},clearPin=()=>{hover=-1;dirty=true;schedule();};
    button.addEventListener('pointerenter',lightPin);button.addEventListener('focus',lightPin);button.addEventListener('pointerleave',clearPin);button.addEventListener('blur',clearPin);
    return {zh,en,x,y,index,button,caption,path,pin};
  });
  function translateFragments(){const en=document.documentElement.lang.startsWith('en');fragments.forEach(f=>{f.caption.textContent=en?f.en:f.zh;f.button.setAttribute('aria-label',en?f.en:f.zh);f.button.dataset.caption=en?f.en:f.zh;});}
  translateFragments();addEventListener('portfolio:language',translateFragments);
  const mapImage=new Image();mapImage.src='../assets/works/xr/research/fragments/park-plane.webp';mapImage.onload=()=>{dirty=true;schedule();};
  let mapCorners=[];
  function placePoint(p){return{x:p.x*.72+w*.22,y:p.y*.58+h*.37,depth:p.depth};}
  function project(){
    const projected=projectTerrain(vertices,yaw,pitch,w,h);points=projected.map(placePoint);mapCorners=projected.planeCorners.map(placePoint);dirty=true;
    const cw=w<720?w*.145:Math.min(140,w*.1),imageHeight=cw*660/510;
    stems.setAttribute('viewBox',`0 0 ${w} ${h}`);
    fragments.forEach((f,i)=>{
      const x=(w<720?[0,.16,.32,.5,.66,.82,0,.16,.32][i]:f.x)*w,y=f.y*h,pin=points[f.index],endX=x+cw*.5,endY=y+imageHeight;
      f.button.style.setProperty('--card-x',x+'px');f.button.style.setProperty('--card-y',y+'px');f.button.style.setProperty('--card-width',cw+'px');
      f.button.style.setProperty('--grow-distance',(pin.y-endY)+'px');f.button.style.setProperty('--grow-offset-x',(pin.x-endX)+'px');f.button.style.setProperty('--card-skew',i<6?'-14deg':'14deg');
      const elbow=endY+Math.max(14,(pin.y-endY)*.4);f.path.setAttribute('d',`M${pin.x} ${pin.y}V${elbow}H${endX}V${endY}`);f.pin.setAttribute('cx',pin.x);f.pin.setAttribute('cy',pin.y);
    });
    canvas.dataset.terrainView=yaw.toFixed(3)+','+pitch.toFixed(3);canvas.dataset.mapPlane='projected';canvas.dataset.fragmentCount=String(fragments.length);
  }
  function drawMapPlane(){
    if(!mapImage.complete||!mapImage.naturalWidth||forced.matches)return;
    const [a,b,,d]=mapCorners;context.save();context.globalAlpha=light?.57:.72;
    context.transform((b.x-a.x)/mapImage.width,(b.y-a.y)/mapImage.width,(d.x-a.x)/mapImage.height,(d.y-a.y)/mapImage.height,a.x,a.y);
    context.drawImage(mapImage,0,0);context.restore();
  }
  function resize(){
    w=canvas.clientWidth;h=canvas.clientHeight;ratio=Math.min(devicePixelRatio||1,2,4096/Math.max(1,w));
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);light=document.documentElement.dataset.theme==='light';
    ink=light?'#737780':'#c3c6cc';glow=light?'#252a32':'#f5f6f7';warm=light?'#a57735':'#e6c28d';
    if(forced.matches)ink=glow=warm=getComputedStyle(canvas).color;
    project();canvas.dataset.terrainReady='true';canvas.dataset.terrainVertices=String(vertices.length);schedule();
  }
  function lighting(index){
    const v=vertices[index];let level=0;
    for(const pulse of pulses){
      const origin=vertices[pulse.index],d=Math.hypot(v.x-origin.x,v.z-origin.z),age=clock-pulse.start;
      level=Math.max(level,Math.exp(-(((d-age*.78)/.105)**2))*Math.max(0,1-age/2.6));
    }
    const target=hover>=0?hover:selected;
    if(target>=0){const origin=vertices[target],d=Math.hypot(v.x-origin.x,v.z-origin.z);level=Math.max(level,Math.exp(-d*d/.035)*.92);}
    return level;
  }
  function render(){
    context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,w,h);
    drawMapPlane();
    // Continuous wire rows and columns establish the landform beneath its LEDs.
    context.strokeStyle=ink;context.lineWidth=.65;context.globalAlpha=forced.matches?.8:light?1:.32;
    if(light&&!forced.matches){
      // A few cross-sections carry the structure; the remaining mesh recedes.
      ['#cbd0d5','#939aa4'].forEach((colour,tier)=>{
        context.strokeStyle=colour;context.beginPath();
        for(let row=0;row<ROWS;row+=2)if(Number(row%8===0)===tier)for(let col=0;col<COLS;col++){
          const p=points[row*COLS+col];col?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
        }
        for(let col=0;col<COLS;col+=2)if(Number(col%8===0)===tier)for(let row=0;row<ROWS;row++){
          const p=points[row*COLS+col];row?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
        }context.stroke();
      });
    }else{
      context.beginPath();
      for(let row=0;row<ROWS;row+=2)for(let col=0;col<COLS;col++){
        const p=points[row*COLS+col];col?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
      }
      for(let col=0;col<COLS;col+=2)for(let row=0;row<ROWS;row++){
        const p=points[row*COLS+col];row?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
      }context.stroke();
    }
    const groups=Array.from({length:8},()=>[]),radius=w<500?.83:1.05;
    vertices.forEach((v,i)=>{const energy=lighting(i);groups[energy>.06?3+Math.min(4,Math.floor(energy*5)):Math.min(2,Math.floor((v.y+.05)*3))].push(i);});
    groups.forEach((indices,group)=>{
      context.fillStyle=light&&!forced.matches?(group<3?paperDepth[group]:(selected>=0?paperWarm:paperGlow)[group-3]):group<3?ink:(selected>=0?warm:glow);
      // Paper changes between solid ink levels; the dark display keeps its glow.
      context.globalAlpha=forced.matches?1:light?1:group<3?.57+group*.14:.46+(group-3)*.13;
      context.beginPath();indices.forEach(i=>{const p=points[i];context.moveTo(p.x+radius,p.y);context.arc(p.x,p.y,radius,0,TAU);});context.fill();
    });context.globalAlpha=1;dirty=false;fragments.forEach(f=>f.path.classList.toggle('is-hovered',f.index===hover));
    canvas.dataset.terrainSelected=selected<0?'':vertices[selected].row+','+vertices[selected].col;
  }
  function tick(now){
    frame=0;if(!active()){lastFrame=0;canvas.dataset.terrainMotion='paused';return;}
    if(lastFrame&&now-lastFrame<1000/24){frame=requestAnimationFrame(tick);return;}
    if(lastFrame)clock+=Math.min(.12,(now-lastFrame)/1000);lastFrame=now;
    const hadPulses=pulses.length>0;pulses=pulses.filter(p=>clock-p.start<2.6);
    if(dirty||hadPulses)render();
    canvas.dataset.terrainMotion=pulses.length&&!reduced.matches?'running':'idle';
    if(pulses.length&&!reduced.matches)frame=requestAnimationFrame(tick);else lastFrame=0;
  }
  function schedule(){if(active()&&!frame)frame=requestAnimationFrame(tick);}
  function sync(){
    cancelAnimationFrame(frame);frame=0;lastFrame=0;
    if(reduced.matches||forced.matches)pulses=[];
    if(!active()){canvas.dataset.terrainMotion='paused';return;}
    if(!introduced){introduced=true;shell.classList.add('is-culture-revealed');if(!reduced.matches&&!forced.matches)pulses.push({index:Math.floor(ROWS*.52)*COLS+Math.floor(COLS*.46),start:clock});}
    dirty=true;schedule();
  }
  function illuminate(index){
    if(index<0)return;selected=index;fragments.forEach(f=>{const active=f.index===index;f.button.setAttribute('aria-pressed',String(active));f.path.classList.toggle('is-selected',active);});
    if(!reduced.matches&&!forced.matches){pulses.push({index,start:clock});pulses=pulses.slice(-4);}
    dirty=true;schedule();announce('已点亮选中的地形网格','Selected terrain grid illuminated');
    const v=vertices[index];canvas.dispatchEvent(new CustomEvent('gogo:terrain-select',{bubbles:true,detail:{row:v.row,col:v.col,position:{x:v.x,y:v.y,z:v.z}}}));
  }
  function coordinates(event){const rect=canvas.getBoundingClientRect();return[event.clientX-rect.left,event.clientY-rect.top];}
  canvas.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,yaw,pitch,moved:false,touch:event.pointerType==='touch'};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(gesture&&gesture.id===event.pointerId){
      const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;
      if(Math.hypot(dx,dy)>5)gesture.moved=true;
      if(gesture.moved){yaw=gesture.yaw+dx*.005;pitch=clamp(gesture.pitch+(gesture.touch?0:dy*.004),.28,1.25);hover=-1;project();schedule();}
    }else if(event.pointerType!=='touch'){
      const next=nearestVertex(points,...coordinates(event));if(next!==hover){hover=next;dirty=true;schedule();}
    }
  });
  canvas.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    if(!gesture.moved)illuminate(nearestVertex(points,...coordinates(event),40));gesture=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel',()=>{gesture=null;});
  canvas.addEventListener('lostpointercapture',()=>{gesture=null;});
  canvas.addEventListener('pointerleave',()=>{if(!gesture){hover=-1;dirty=true;schedule();}});
  canvas.addEventListener('blur',()=>{hover=-1;dirty=true;schedule();});
  function resetView(){yaw=DEFAULT_YAW;pitch=DEFAULT_PITCH;selected=hover=-1;pulses=[];fragments.forEach(f=>{f.button.setAttribute('aria-pressed','false');f.path.classList.remove('is-selected','is-hovered');});project();schedule();announce('已重置地形视角','Terrain view reset');}
  reset.addEventListener('click',resetView);
  canvas.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();if(event.key==='ArrowLeft')yaw-=.12;if(event.key==='ArrowRight')yaw+=.12;if(event.key==='ArrowUp')pitch=clamp(pitch-.08,.28,1.25);if(event.key==='ArrowDown')pitch=clamp(pitch+.08,.28,1.25);project();schedule();
    }else if(event.key==='Enter'||event.key===' '){event.preventDefault();illuminate(selected<0?Math.floor(ROWS/2)*COLS+Math.floor(COLS/2):selected);}
    else if(event.key.toLowerCase()==='r')resetView();
  });
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:.01}).observe(canvas);
  else onScreen=true;
  new ResizeObserver(resize).observe(shell);
  new MutationObserver(resize).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);forced.addEventListener('change',()=>{resize();sync();});
  addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});resize();
});
