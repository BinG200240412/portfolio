/* Native terrain vertices and edges. Lighting never displaces the mesh;
 * only a deliberate camera gesture changes its projection. */
(() => {
  'use strict';
  const canvas=document.getElementById('gogo-research-terrain');
  if(!canvas)return;
  const context=canvas.getContext('2d');if(!context)return;
  const shell=canvas.closest('.gogo-terrain-shell'),reset=shell.querySelector('.gogo-terrain-reset'),status=shell.querySelector('.gogo-terrain-status');
  const dialog=document.getElementById('gogo-lightbox'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const COLS=65,ROWS=49,TAU=Math.PI*2,DEFAULT_YAW=-.48,DEFAULT_PITCH=.78;
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
    return projected.map(p=>({x:w/2+(p.x-cx)*scale,y:usableH/2+(p.y-cz)*scale,depth:p.depth}));
  }
  function nearestVertex(points,x,y,radius=28){
    let best=-1,distance=radius*radius;
    points.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<distance){best=i;distance=d;}});return best;
  }
  const vertices=makeTerrain(COLS,ROWS);
  let points=[],w=1,h=1,ratio=1,yaw=DEFAULT_YAW,pitch=DEFAULT_PITCH,hover=-1,selected=-1,gesture=null;
  let onScreen=false,shown=true,host=null,frame=0,lastFrame=0,clock=0,pulses=[],introduced=false,dirty=true;
  let light=false,ink='#8b9887',glow='#a8e4df',warm='#e6bc78';
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  function active(){return onScreen&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));}
  function announce(zh,en){status.textContent=document.documentElement.lang.startsWith('en')?en:zh;}
  function project(){
    points=projectTerrain(vertices,yaw,pitch,w,h);dirty=true;
    canvas.dataset.terrainView=yaw.toFixed(3)+','+pitch.toFixed(3);
  }
  function resize(){
    w=canvas.clientWidth;h=canvas.clientHeight;ratio=Math.min(devicePixelRatio||1,2,4096/Math.max(1,w));
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);light=document.documentElement.dataset.theme==='light';
    ink=light?'#254e35':'#a9b8a0';glow=light?'#006079':'#a6e9ed';warm=light?'#a5620e':'#ebc483';
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
    // Continuous wire rows and columns establish the landform beneath its LEDs.
    context.strokeStyle=ink;context.lineWidth=.65;context.globalAlpha=forced.matches?.8:light?.62:.32;context.beginPath();
    for(let row=0;row<ROWS;row+=2)for(let col=0;col<COLS;col++){
      const p=points[row*COLS+col];col?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
    }
    for(let col=0;col<COLS;col+=2)for(let row=0;row<ROWS;row++){
      const p=points[row*COLS+col];row?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y);
    }context.stroke();
    const groups=Array.from({length:8},()=>[]),radius=w<500?.83:1.05;
    vertices.forEach((v,i)=>{const energy=lighting(i);groups[energy>.06?3+Math.min(4,Math.floor(energy*5)):Math.min(2,Math.floor((v.y+.05)*3))].push(i);});
    groups.forEach((indices,group)=>{
      context.fillStyle=group<3?ink:(selected>=0?warm:glow);
      // Paper carries ink: preserve depth, but do not wash the mesh into white.
      context.globalAlpha=forced.matches?1:light?(group<3?.82+group*.09:.72+(group-3)*.07):group<3?.57+group*.14:.46+(group-3)*.13;
      context.beginPath();indices.forEach(i=>{const p=points[i];context.moveTo(p.x+radius,p.y);context.arc(p.x,p.y,radius,0,TAU);});context.fill();
    });context.globalAlpha=1;dirty=false;
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
    if(!introduced){introduced=true;if(!reduced.matches&&!forced.matches)pulses.push({index:Math.floor(ROWS*.52)*COLS+Math.floor(COLS*.46),start:clock});}
    dirty=true;schedule();
  }
  function illuminate(index){
    if(index<0)return;selected=index;
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
  function resetView(){yaw=DEFAULT_YAW;pitch=DEFAULT_PITCH;selected=hover=-1;pulses=[];project();schedule();announce('已重置地形视角','Terrain view reset');}
  reset.addEventListener('click',resetView);
  canvas.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();if(event.key==='ArrowLeft')yaw-=.12;if(event.key==='ArrowRight')yaw+=.12;if(event.key==='ArrowUp')pitch=clamp(pitch-.08,.28,1.25);if(event.key==='ArrowDown')pitch=clamp(pitch+.08,.28,1.25);project();schedule();
    }else if(event.key==='Enter'||event.key===' '){event.preventDefault();illuminate(selected<0?Math.floor(ROWS/2)*COLS+Math.floor(COLS/2):selected);}
    else if(event.key.toLowerCase()==='r')resetView();
  });
  new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:.01}).observe(canvas);
  new ResizeObserver(resize).observe(shell);
  new MutationObserver(resize).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);forced.addEventListener('change',()=>{resize();sync();});
  addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});resize();
})();
