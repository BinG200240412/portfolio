/* A landscape made from the same discrete, round LEDs as the home page.
 * Mountain profiles and folds are geometry, with no image source.
 * Fixed LEDs show a continuously unfolding landscape. Cached world columns
 * advance at three depths, while a travelling swell lifts the mountain ridges.
 * No per-frame layout reads, image downloads or repeating panorama seam.
 */
(() => {
  'use strict';
  let canvas = document.getElementById('qianli-light-cover');
  const batch=canvas&&window.QianliBeadsRenderer?.create(canvas),renderer=batch?.renderer||null;
  if(batch)canvas=batch.canvas;
  const ctx = batch?.context || canvas?.getContext('2d', {alpha:true});
  const hero = canvas?.closest('.qianli-light-hero');
  if (!ctx || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU=Math.PI*2,FPS=30,RIPPLE_LIFE=4.8;
  // Separate mineral colour families: hue follows mountain regions, rather
  // than every shaded LED becoming another tint of the same green.
  const palettes = {
    dark:[
      ['#17385e','#1d5488','#286bb1','#3488d0','#4ca9e7','#8cd3f3','#d5f3ff'],
      ['#16495c','#1b6c82','#2092ac','#29bed1','#54d9e2','#96edf1','#e6ffff'],
      ['#164b4e','#1f736c','#29957f','#45b58f','#78d5a5','#b8e9c7','#ecf7dd'],
      ['#192d60','#2a438b','#3b5eb6','#5285d9','#75b1ed','#b2dcf7','#e8f5ff'],
      ['#4a462c','#776440','#a08550','#c7a45f','#e2c581','#f2dfac','#fff2ce'],
    ],
    light:[
      ['#abc3ce','#7babc2','#558eaf','#3378a4','#206591','#18517b','#103c61'],
      ['#adc9ca','#7ab8bd','#51a4ae','#288e9a','#187985','#0f6572','#0b505b'],
      ['#b4cbb7','#8aba9c','#62a77e','#398e65','#257953','#1d6543','#154e32'],
      ['#bbc5db','#99afd1','#7b96c3','#5b7db1','#426597','#304f7e','#203d66'],
      ['#d7ccad','#c2ad7d','#ac9258','#92773c','#80622c','#6b4d22','#533818'],
    ],
  };
  let width=0,height=0,sprites=[],glows=[],light=false;
  let frame=0,lastFrame=0,elapsed=0,onScreen=true,shown=true,disposed=false;
  let renderCount=0,renderSamples=[];
  let aim=null,hit=null,pointerLevel=0,pulses=[];
  let parentSection=null;
  try { parentSection=window.frameElement?.closest('#section') || null; } catch (_) {}
  function label() {
    const english=window.PortfolioI18n?.language==='en' || document.documentElement.lang==='en';
    const title=hero.querySelector('.title');
    if(title)title.textContent=english ? 'A Thousand Li' : '千里江山';
    const hint=hero.querySelector('.qianli-light-hint');
    if(hint)hint.textContent=english ? 'Touch anywhere to send ripples of light' : '点击任意位置，让光泛起涟漪';
    canvas.setAttribute('aria-label',english
      ? 'A continuously unfolding mountain scroll. Touch the landscape to send ripples through the light beads. You can also press Enter or Space.'
      : '徐徐展开、起伏流动的点阵山水长卷。点击山水，让光珠泛起涟漪；也可按 Enter 或空格。');
  }
  function makeSprites() {
    if(disposed)return;
    light=document.documentElement.dataset.theme==='light';
    glows=[];
    sprites=palettes[light?'light':'dark'].flat().map(colour=>{
      const sprite=document.createElement('canvas');sprite.width=sprite.height=24;
      const paint=sprite.getContext('2d');
      paint.fillStyle=colour;paint.beginPath();paint.arc(12,12,6.8,0,TAU);paint.fill();
      // Bloom belongs to each individual lit bead, never to a painted ring.
      const glow=document.createElement('canvas');glow.width=glow.height=40;
      const g=glow.getContext('2d'),bloom=g.createRadialGradient(20,20,1,20,20,20);
      bloom.addColorStop(0,colour+'a0');bloom.addColorStop(.3,colour+'55');bloom.addColorStop(1,colour+'00');
      g.fillStyle=bloom;g.fillRect(0,0,40,40);glows.push(glow);
      return sprite;
    });
    renderer?.setAtlas(sprites,glows);renderGeneration++;
  }
  function resize() {
    if(disposed)return;
    const box=canvas.getBoundingClientRect();
    const w=Math.round(box.width),h=Math.round(box.height);
    if (!w || !h) return;
    const ratio=Math.min(devicePixelRatio || 1,2);
    const backingW=Math.round(w*ratio),backingH=Math.round(h*ratio);
    if(w===width && h===height && canvas.width===backingW && canvas.height===backingH)return;
    // Repeated visibility/theme events must never clear a correctly sized canvas.
    if(canvas.width!==backingW || canvas.height!==backingH) {
      canvas.width=backingW;canvas.height=backingH;
    }
    width=w;height=h;ctx.setTransform(ratio,0,0,ratio,0,0);
    renderGeneration++;if(!worker)kernel.configure(width,height);
    pulses=[];aim=null;hit=null;pointerLevel=0;makeSprites();sync();
  }
  const kernel=createLandscapeKernel();
  let renderGeneration=0,worker=null,workerTried=false,workerBusy=false,workerURL='',pendingInput=null,spareBuffer=null;
  let workerSequence=0,workerJob=0;
  const clock=()=>typeof performance==='object'?performance.now():Date.now();
  function workerThread(){
    const engine=createLandscapeKernel();
    self.onmessage=event=>{
      const input=event.data,start=performance.now();
      try{
        engine.configure(input.width,input.height);const result=engine.compute(input,input.buffer);
        self.postMessage({generation:input.generation,sequence:input.sequence,input:input.report,buffer:result.buffer,count:result.count,workerMs:performance.now()-start},[result.buffer]);
      }catch(error){self.postMessage({error:String(error?.message||error)});}
    };
  }
  function reportFrame(total,compute,flush,input,workerMs=0){
    renderCount++;renderSamples.push({total,compute,flush,worker:workerMs,
      prepare:renderer?.timing?.prepare||0,upload:renderer?.timing?.upload||0,submit:renderer?.timing?.submit||0});if(renderSamples.length>30)renderSamples.shift();
    if(renderCount===1||renderCount%30===0){
      const median=key=>{const values=renderSamples.map(sample=>sample[key]).sort((a,b)=>a-b);return values[Math.floor(values.length/2)].toFixed(1);};
      canvas.dataset.renderBackend=worker?'webgl-worker':renderer?'webgl':'2d';canvas.dataset.renderMs=median('total');
      canvas.dataset.renderMaxMs=Math.max(...renderSamples.map(sample=>sample.total)).toFixed(1);canvas.dataset.renderCount=String(renderCount);
      canvas.dataset.renderComputeMs=median('compute');canvas.dataset.renderFlushMs=median('flush');canvas.dataset.renderWorkerMs=median('worker');
      canvas.dataset.renderPrepareMs=median('prepare');canvas.dataset.renderUploadMs=median('upload');canvas.dataset.renderSubmitMs=median('submit');
      canvas.dataset.renderPointer=input.pointer?'1':'0';canvas.dataset.renderRipples=String(input.ripples);canvas.dataset.renderPoints=String(renderer?.points||0);
    }
    canvas.dataset.renderReady='true';
  }
  function paintBatch(buffer,count,input,workerMs=0,started=clock(),computed=started){
    const values=new Float32Array(buffer);
    if(renderer)renderer.drawBatch(values,count);
    else{
      ctx.clearRect(0,0,width,height);
      for(let i=0;i<count;i++){
        const offset=i*5,x=values[offset],y=values[offset+1],size=values[offset+2],index=values[offset+3];
        ctx.globalAlpha=values[offset+4];ctx.drawImage(index<35?sprites[index]:glows[index-35],x-size/2,y-size/2,size,size);
      }ctx.globalAlpha=1;
    }
    const finished=clock();reportFrame(finished-started,computed-started,finished-computed,input,workerMs);
  }
  function releaseWorkerURL(){if(workerURL){URL.revokeObjectURL(workerURL);workerURL='';}}
  function failWorker(){
    worker?.terminate();worker=null;workerBusy=false;pendingInput=null;releaseWorkerURL();
    canvas.dataset.renderWorkerState='fallback';
    if(!disposed&&active())draw(elapsed);
  }
  function sendWork(input){
    if(!worker||!active())return;
    if(workerBusy){pendingInput=input;return;}
    workerBusy=true;workerJob=++workerSequence;input.sequence=workerJob;
    if(spareBuffer?.byteLength){input.buffer=spareBuffer;spareBuffer=null;worker.postMessage(input,[input.buffer]);}
    else worker.postMessage(input);
  }
  function startWorker(){
    if(workerTried||!renderer||typeof Worker!=='function')return;
    workerTried=true;
    try{
      const source='const createLandscapeKernel='+createLandscapeKernel.toString()+';('+workerThread.toString()+')();';
      workerURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(workerURL);
      canvas.dataset.renderWorkerState='starting';
      worker.onerror=event=>{event.preventDefault?.();if(!disposed)failWorker();};
      worker.onmessage=event=>{
        if(disposed)return;const result=event.data;
        if(result.error){failWorker();return;}
        if(result.sequence!==workerJob)return;
        workerBusy=false;releaseWorkerURL();spareBuffer=result.buffer;
        if(result.generation===renderGeneration&&active()){
          paintBatch(result.buffer,result.count,result.input,result.workerMs);canvas.dataset.renderWorkerState='ready';
        }
        const next=pendingInput;pendingInput=null;if(next&&active())sendWork(next);
      };
    }catch(_){worker?.terminate();worker=null;releaseWorkerURL();canvas.dataset.renderWorkerState='fallback';}
  }
  function draw(time){
    if(disposed||!width||!height||!sprites.length)return;
    const input={time,width,height,generation:renderGeneration,hit:hit?{x:hit.x,y:hit.y}:null,pointerLevel,
      pulses:pulses.map(p=>({x:p.x,y:p.y,time:p.time})),reduced:reduced.matches,light,
      report:{pointer:Boolean(hit&&pointerLevel>.005),ripples:pulses.length}};
    if(worker){sendWork(input);return;}
    const started=clock();kernel.configure(width,height);const result=kernel.compute(input,spareBuffer);spareBuffer=result.buffer;
    paintBatch(result.buffer,result.count,input.report,0,started,clock());startWorker();
  }
  function active() {
    return !disposed && !renderer?.lost && onScreen && shown && !document.hidden && (!parentSection || parentSection.classList.contains('on'));
  }
  function tick(now) {
    frame=0;if(!active() || reduced.matches)return;
    if(!lastFrame)lastFrame=now;
    const dt=now-lastFrame;
    if(dt>=1000/FPS) {
      const step=Math.min(dt/1000,.1);lastFrame=now;elapsed+=step;
      const follow=1-Math.exp(-step*8);
      pointerLevel+=((aim?1:0)-pointerLevel)*follow;
      if(aim) {
        if(!hit)hit={...aim};
        hit.x+=(aim.x-hit.x)*follow;hit.y+=(aim.y-hit.y)*follow;
      }
      pulses=pulses.filter(p=>elapsed-p.time<RIPPLE_LIFE);
      draw(elapsed);
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    if(frame)cancelAnimationFrame(frame);
    frame=0;lastFrame=0;
    if(!active()){pendingInput=null;return;}
    draw(elapsed);
    if(!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function position(event) {
    const box=canvas.getBoundingClientRect();
    return {x:event.clientX-box.left,y:event.clientY-box.top};
  }
  hero.addEventListener('pointermove',event=>{
    if(event.pointerType!=='touch')aim=position(event);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{aim=null;});
  function awaken(p) {
    if(reduced.matches) {hit=p;pointerLevel=1;draw(elapsed);return;}
    pulses.push({...p,time:elapsed});
    if(pulses.length>5)pulses.shift();
    draw(elapsed);
  }
  hero.addEventListener('pointerdown',event=>{
    if(event.button!==undefined && event.button!==0)return;
    awaken(position(event));
  },{passive:true});
  canvas.addEventListener('keydown',event=>{
    if(event.key==='Enter' || event.key===' ') {
      event.preventDefault();awaken({x:width*.56,y:height*.56});
    }
  });
  const resizeObserver=new ResizeObserver(resize),visibilityObserver=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting&&entries[0].intersectionRatio>.001;sync();},{threshold:[0,.001],rootMargin:'-1px 0px'});
  const themeObserver=new MutationObserver(()=>{makeSprites();sync();});
  resizeObserver.observe(canvas);visibilityObserver.observe(hero);
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const lifecycle=window.PortfolioLifecycle,parentOptions={attributes:true,attributeFilter:['class']};
  let parentObserver=null;
  if(parentSection) {
    if(lifecycle?.observeParent)parentObserver=lifecycle.observeParent(parentSection,sync,parentOptions);
    else {parentObserver=new MutationObserver(sync);parentObserver.observe(parentSection,parentOptions);}
  }
  function dispose() {
    if(disposed)return;
    disposed=true;shown=false;cancelAnimationFrame(frame);frame=0;lastFrame=0;
    resizeObserver.disconnect();visibilityObserver.disconnect();themeObserver.disconnect();parentObserver?.disconnect();
    worker?.terminate();worker=null;workerBusy=false;pendingInput=null;spareBuffer=null;releaseWorkerURL();kernel.dispose();
    sprites=[];glows=[];pulses=[];aim=null;hit=null;
    renderer?.destroy();
    canvas.width=0;canvas.height=0;
  }
  lifecycle?.onDispose(dispose);
  if(renderer){
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.lost=true;sync();});
    canvas.addEventListener('webglcontextrestored',()=>{if(disposed)return;renderer.restore();makeSprites();sync();});
  }
  reduced.addEventListener('change',()=>{renderGeneration++;aim=null;hit=null;pointerLevel=0;pulses=[];sync();});
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio:language',label);
  addEventListener('pagehide',event=>{
    shown=false;sync();
    if(!lifecycle) {if(event.persisted)parentObserver?.disconnect();else dispose();}
  });
  addEventListener('pageshow',()=>{
    if(disposed)return;
    if(!lifecycle&&parentSection)parentObserver?.observe(parentSection,parentOptions);
    shown=true;sync();
  });

  // One pure engine runs either locally or, by its own source, in the Worker.
  // It contains no DOM, palette sprites, timers or rendering context.
  function createLandscapeKernel(){
  const TAU = Math.PI * 2, FPS = 30, RIPPLE_LIFE=4.8;
  const FIELD_DENSITY=300,FIELD_ROWS=400,FIELD_TOP=-.15;
  const depths=[{speed:.50,swell:.014},{speed:.90,swell:.022},{speed:1.30,swell:.030}];
  const profiles = [
    [[-.08,.70],[.02,.62],[.10,.53],[.15,.60],[.22,.42],[.28,.34],[.33,.44],[.40,.62],[.46,.58],[.53,.43],[.59,.49],[.66,.39],[.72,.51],[.79,.60],[.86,.52],[.94,.64],[1.08,.61]],
    [[-.08,.74],[.01,.65],[.075,.49],[.13,.57],[.19,.64],[.24,.42],[.29,.29],[.32,.35],[.365,.56],[.41,.68],[.46,.64],[.51,.57],[.56,.64],[.605,.47],[.65,.36],[.69,.40],[.745,.57],[.80,.62],[.86,.68],[.94,.73],[1.08,.64]],
    [[-.08,.84],[.02,.77],[.09,.74],[.16,.82],[.24,.75],[.31,.77],[.39,.85],[.48,.80],[.55,.84],[.64,.72],[.70,.68],[.77,.75],[.83,.82],[.92,.79],[1.08,.84]],
  ];
    const fields=depths.map(()=>new Map()),fieldSample={alpha:0,ink:0};
    let width=0,height=0,pitch=5,columns=[],yScale=1.38,yOffset=-.12*1.38,lastPrune=0;
    let pointerRows=new Float64Array(0),points=new Float32Array(0),count=0;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  const hash=(x,y,s=0)=>{
    const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;
    return n-Math.floor(n);
  };
  function ridge(profile,x) {
    let i=0;while(i<profile.length-2 && x>profile[i+1][0])i++;
    const a=profile[i],b=profile[i+1],t=clamp((x-a[0])/(b[0]-a[0]));
    // A little broken rock along the long, legible silhouette.
    return a[1]+(b[1]-a[1])*smooth(t)+
      Math.sin(x*173)*.0035+Math.sin(x*389+2)*.0018;
  }
  function noise1(x,seed) {
    const cell=Math.floor(x),f=smooth(x-cell);
    return hash(cell,seed)*(1-f)+hash(cell+1,seed)*f;
  }
  function worldRidge(layer,u) {
    // The opening keeps the existing composition. Beyond it, continuous
    // deterministic terrain extends indefinitely instead of wrapping a tile.
    const broad=noise1(u*4.1+layer*1.7,21+layer);
    const detail=noise1(u*10.7,51+layer),fine=noise1(u*27.3,83+layer);
    const generated=layer===0 ? .33+broad*.23+detail*.08+fine*.025
      : layer===1 ? .22+broad*.35+detail*.10+fine*.035
      : .66+broad*.15+detail*.06+fine*.02;
    const blend=smooth((u-.80)/.45);
    return ridge(profiles[layer],u)*(1-blend)+generated*blend;
  }
  function fieldColumn(layer,index) {
    const cache=fields[layer];
    if(cache.has(index))return cache.get(index);
    const u=index/FIELD_DENSITY,top=worldRidge(layer,u),base=[.825,.86,.90][layer];
    const alpha=new Uint8Array(FIELD_ROWS),ink=new Uint8Array(FIELD_ROWS);
    let first=FIELD_ROWS,last=-1;
    for(let row=0;row<FIELD_ROWS;row++) {
      const y=FIELD_TOP+row/FIELD_DENSITY;
      if(y<top || y>base)continue;
      const grain=hash(index,row,layer);
      if(grain<(layer===0?.09:.035))continue;
      const depth=(y-top)/(base-top),edge=Math.exp(-(y-top)/.009);
      const folds=Math.sin(u*64+depth*4.8+Math.sin(u*27)*2.3);
      const facet=clamp(.46+folds*.32+Math.sin(u*171-depth*8)*.12+grain*.13);
      const foot=smooth((1-depth)/.12);
      alpha[row]=Math.round(clamp((.27+facet*.70+edge*.36)*foot*(layer===0?.55:layer===2?.86:1))*255);
      if(alpha[row]) {if(first===FIELD_ROWS)first=row;last=row;}
      const role=Math.round(clamp(facet*.76+edge*.30)*6);
      const vein=Math.sin(u*16+depth*2.2)+Math.cos(u*31-depth*4)*.35;
      let bank=layer===0 ? 3 : vein>.55 ? 1 : vein<-.55 ? 0 : 2;
      if(layer===1 && depth>.25 && vein<.25)bank=3;
      if(layer===2 && vein>.65 && grain>.62)bank=4;
      ink[row]=bank*7+role;
    }
    const value={alpha,ink,first,last};cache.set(index,value);return value;
  }
  function columnView(layer,u,time) {
    const world=u+time*.019*depths[layer].speed;
    const sample=world*FIELD_DENSITY,index=Math.floor(sample);
    const swell=depths[layer].swell*Math.sin(time*.42-world*TAU*1.35+layer*1.7)
      +.008*Math.sin(time*.23+world*TAU*2.2+layer);
    const left=fieldColumn(layer,index),right=fieldColumn(layer,index+1),shift=swell*FIELD_DENSITY;
    return {left,right,mix:sample-index,shift,index,
      first:Math.min(left.first,right.first)-1+shift,last:Math.max(left.last,right.last)+1+shift};
  }
  function sampleField(view,row) {
    // The landscape occupies only a band of each column. Empty sky never
    // needs four byte reads and bilinear interpolation for every depth.
    if(row<view.first || row>=view.last)return null;
    const r=row-view.shift,y0=Math.floor(r),f=r-y0;
    if(y0<0 || y0>=FIELD_ROWS-1)return null;
    const a=view.left.alpha,b=view.right.alpha;
    const left=a[y0]*(1-f)+a[y0+1]*f,right=b[y0]*(1-f)+b[y0+1]*f;
    const alpha=(left*(1-view.mix)+right*view.mix)/255;
    if(alpha<.015)return null;
    const selected=left*(1-view.mix)>right*view.mix ? view.left : view.right;
    const y=selected.alpha[y0]*(1-f)>selected.alpha[y0+1]*f ? y0 : y0+1;
    fieldSample.alpha=alpha;fieldSample.ink=selected.ink[y];return fieldSample;
  }
  function pruneFields(time) {
    if(time-lastPrune<2 || !columns.length)return;
    lastPrune=time;
    fields.forEach((cache,layer)=>{
      if(cache.size<700)return;
      const travel=time*.019*depths[layer].speed;
      const first=Math.floor((columns[0].u+travel)*FIELD_DENSITY)-8;
      const last=Math.ceil((columns[columns.length-1].u+travel)*FIELD_DENSITY)+8;
      for(const index of cache.keys())if(index<first || index>last)cache.delete(index);
    });
  }
    function configure(w,h){
      if(w===width&&h===height)return;
      width=w;height=h;
    const mobile=width<650;
    // The field fills the viewport at every size. Foreground foothills continue
    // below the fold, with no centred artboard or horizontal cutoff at the base.
    pitch=Math.max(mobile?3.8:4.8,Math.max(width,height)/300);
    // Portrait shows a close crop of the panorama, rather than squeezing the
    // entire mountain range into thin vertical spikes.
    const panorama=mobile ? Math.max(width,height*.9) : width,left=(width-panorama)/2;
    yScale=mobile?1.30:1.38;yOffset=-(mobile?.08:.12)*yScale;
    columns=[];
    for(let px=pitch/2;px<width;px+=pitch) {
      const column={u:(px-left)/panorama,points:[]};
      for(let py=pitch/2;py<height;py+=pitch) {
        const x=px/width,y=py/height,grain=hash(Math.round(px/pitch),Math.round(py/pitch));
        const titleQuiet=1-.70*Math.exp(-Math.pow((x-.15)/.23,4)-Math.pow((y-.17)/.16,4));
        const captionQuiet=.16+.84*smooth((1-y)/.22);
        column.points.push({x:px,y:py,u:x,v:y,row:((y-yOffset)/yScale-FIELD_TOP)*FIELD_DENSITY,
          quiet:titleQuiet*captionQuiet,
          breathSin:Math.sin(grain*TAU*.35),breathCos:Math.cos(grain*TAU*.35)});
      }
      columns.push(column);
    }
    }
    function emit(index,alpha,x,y,size){
      if((count+1)*5>points.length){const grown=new Float32Array(Math.max(65536*5,points.length*2));grown.set(points);points=grown;}
      const offset=count++*5;points[offset]=x;points[offset+1]=y;points[offset+2]=size;points[offset+3]=index;points[offset+4]=alpha;
    }
    function compute(input,buffer){
      const {time,hit,pointerLevel,pulses,reduced,light}=input;
      if(buffer?.byteLength)points=new Float32Array(buffer);
      else if(!points.length)points=new Float32Array(65536*5);
      count=0;
    const wave=(time*.052)%1.5-.2;
    const breathSin=Math.sin(time*.75),breathCos=Math.cos(time*.75);
    const size=pitch*1.13;
    const speed=Math.max(220,Math.max(width,height)*.30),band=Math.max(9,pitch*1.6),gap=Math.max(70,pitch*8);
    const ripples=pulses.map(p=>({...p,age:time-p.time,radius:(time-p.time)*speed,fade:smooth((RIPPLE_LIFE-(time-p.time))/1.3)}));
    const hasPointer=hit && pointerLevel>.005,hasWaking=hasPointer || ripples.length;
    const wakingRadius=Math.max(56,Math.min(width,height)*.14),wakingArea=wakingRadius*wakingRadius;
    if(hasPointer){
      const rowPoints=columns[0].points;
      if(pointerRows.length!==rowPoints.length)pointerRows=new Float64Array(rowPoints.length);
      for(let row=0;row<rowPoints.length;row++){
        const dy=rowPoints[row].y-hit.y;pointerRows[row]=Math.exp(-dy*dy/wakingArea);
      }
    }
    for(const column of columns) {
      const views=depths.map((_,layer)=>columnView(layer,column.u,time));
      const first=Math.min(views[0].first,views[1].first,views[2].first);
      const last=Math.max(views[0].last,views[1].last,views[2].last);
      const dx=hasPointer?column.points[0].x-hit.x:0;
      const pointerColumn=hasPointer?Math.exp(-dx*dx/wakingArea)*pointerLevel:0;
      for(let row=0;row<column.points.length;row++) {
        const p=column.points[row];
        const inTerrain=p.row>=first && p.row<last;
        if(!inTerrain && !hasWaking)continue;
        // Gaussian exp(-(x²+y²)/R²) is separable. Reuse one X value per
        // column and one Y value per row; invisible sky still stays empty.
        if(!inTerrain && !ripples.length && (!hasPointer||pointerColumn*pointerRows[row]*.14<.012))continue;
        let terrainAlpha=0,terrainInk=10,terrain=false;
        // The former painter's order always kept the nearest non-empty
        // sample. Looking front-to-back produces the same bead and avoids
        // interpolating two hidden mountain layers underneath it.
        for(let layer=inTerrain?2:-1;layer>=0;layer--) {
          const sample=sampleField(views[layer],p.row);
          if(sample) {terrainAlpha=sample.alpha;terrainInk=sample.ink;terrain=true;break;}
        }
        if(!terrain && !hasWaking)continue;
        const breath=reduced?1:.88+.12*(breathSin*p.breathCos+breathCos*p.breathSin);
        const distance=p.u-wave+p.v*.10;
        const traveling=reduced || !terrain ? 0 : Math.exp(-distance*distance/.006)*.14;
        let waking=0;
        if(hasPointer)waking=pointerColumn*pointerRows[row]*(terrain?.38:.14);
        for(const ripple of ripples) {
          const d=Math.hypot(p.x-ripple.x,p.y-ripple.y);
          let energy=0;
          // Three separate crests, with dark space between them. The beads
          // brighten in sequence as each crest passes, including in empty sky.
          for(let crest=0;crest<3;crest++) {
            const radius=ripple.radius-crest*gap;
            if(radius<0)continue;
            const ring=(d-radius)/band;
            if(Math.abs(ring)<3)energy+=Math.exp(-ring*ring)*Math.pow(.67,crest);
          }
          const birth=Math.exp(-d*d/2600)*Math.exp(-ripple.age*3.5);
          waking+=(energy*.85+birth*.75)*ripple.fade;
        }
        if(!terrain && waking<.012)continue;
        const alpha=clamp(terrainAlpha*p.quiet*breath+traveling+waking,0,.98);
        if(alpha<.012)continue;
        const role=Math.min(6,terrainInk%7+Math.round(waking*4));
        const index=Math.floor(terrainInk/7)*7+role;
        // Small light halos around the LEDs reinforce the travelling wave.
        // There is deliberately no canvas arc/stroke for the circular wavefront.
        const bloom=clamp(waking-.18)*.18+(terrain && role>=5?.035:0);
        if(bloom>.025) {
          emit(35+index,bloom*(light?.20:1),p.x,p.y,size*2.4);
        }
        emit(index,alpha,p.x,p.y,size);
      }
    }
      pruneFields(time);
      return {buffer:points.buffer,count};
    }
    function dispose(){fields.forEach(cache=>cache.clear());columns=[];points=new Float32Array(0);pointerRows=new Float64Array(0);width=height=0;}
    return {configure,compute,dispose};
  }

  label();resize();
})();
