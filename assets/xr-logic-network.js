/* Fixed LED cells: animation changes their light, never their screen position.
 * Dog, glasses and cultural fragment use the original PDF motifs.
 * Maps and narrative symbols are simplified diagrams of the original concept. */
(() => {
  'use strict';
  const page=document.querySelector('.gogo-logic-page'),stage=page?.querySelector('.gogo-logic-network');
  if(!stage)return;
  const sourceURL=new URL('works/xr/logic/dot-assets.json?v=open-dot-network-20261025',document.currentScript.src);
  const cards=[...stage.querySelectorAll('.gogo-logic-card')],canvases=[...stage.querySelectorAll('[data-dot]')];
  const hub=stage.querySelector('.gogo-logic-hub'),lineCanvas=stage.querySelector('.gogo-network-lines'),lineContext=lineCanvas.getContext('2d');
  if(!lineContext)return;
  const frames=[...cards,hub].map(element=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('gogo-dot-frame');svg.setAttribute('aria-hidden','true');element.prepend(svg);return{element,svg};
  });
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)'),dialog=document.getElementById('gogo-lightbox');
  const TAU=Math.PI*2,FPS=12;
  const dark=['#66725f','#96a18b','#ccd3bd','#f0f2e7','#356879','#5b9fac','#83d6de','#d5ffff','#455c3d','#74945d','#a2bf7b','#d5e8b6','#806036','#b38a48','#e5b761','#fff0bc'];
  const light=['#4b6339','#2e5724','#1e4319','#102e0d','#2f6f83','#195968','#0d4555','#062e3d','#547233','#3f6625','#245016','#123a0d','#94601b','#7a4e12','#5e3708','#3b2204'];
  let data=null,loading=false,models=[],links=[],palette=dark,width=1,height=1,ratio=1,hubBox=null,linePad=0,paper=false;
  let onScreen=false,visibleRatio=0,shown=true,frame=0,previous=0,elapsed=0,hover=null,focus=null,pinned=null,host=null;
  let entryStarted=false,entryDone=false,entryAnimations=[];
  let line='#657362',accent='#c2944a',flow='#86d5df';
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const selected=()=>pinned||hover||focus;
  function outline({element,svg}) {
    const w=element.clientWidth,h=element.clientHeight,inset=2;
    const kind=element.dataset.node,cut=Math.min(18,w*.11,h*.11);
    const points=kind==='ar'||kind==='story'||element===hub
      ? [[inset+cut,inset],[w-inset-cut,inset],[w-inset,inset+cut],[w-inset,h-inset-cut],[w-inset-cut,h-inset],[inset+cut,h-inset],[inset,h-inset-cut],[inset,inset+cut]]
      : kind==='dog'||kind==='route'
      ? [[inset+cut,inset],[w-inset-cut,inset],[w-inset-cut,inset+cut*.5],[w-inset,inset+cut*.5],[w-inset,h-inset-cut],[w-inset-cut*.5,h-inset-cut],[w-inset-cut*.5,h-inset],[inset+cut,h-inset],[inset+cut,h-inset-cut*.5],[inset,h-inset-cut*.5],[inset,inset+cut],[inset+cut,inset+cut]]
      : [[inset,inset],[w-inset,inset],[w-inset,h-inset],[inset,h-inset]];
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    element.style.setProperty('--logic-wash-shape','polygon('+points.map(p=>p[0]+'px '+p[1]+'px').join(',')+')');
    const circles=document.createDocumentFragment();
    points.forEach((a,index)=>{
      const b=points[(index+1)%points.length],count=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/8));
      for(let i=0;i<count;i++){
        const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx',mix(a[0],b[0],i/count));circle.setAttribute('cy',mix(a[1],b[1],i/count));circle.setAttribute('r','1.1');
        circles.append(circle);
      }
    });
    svg.replaceChildren(circles);
  }


  function poly(context,points,colour,weight=1.2,closed=false){
    context.strokeStyle=colour;context.lineWidth=weight;context.lineJoin='miter';context.lineCap='butt';context.beginPath();
    points.forEach((p,i)=>i?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));if(closed)context.closePath();context.stroke();
  }
  function arrow(context,a,b,colour,size=5){
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
    poly(context,[[b[0]-ux*size-uy*size*.55,b[1]-uy*size+ux*size*.55],b,[b[0]-ux*size+uy*size*.55,b[1]-uy*size-ux*size*.55]],colour,1.2);
  }
  function makeModel(canvas){
    const w=canvas.clientWidth,h=canvas.clientHeight,pitch=w<150?4.2:4.8,cols=Math.max(1,Math.floor(w/pitch)),rows=Math.max(1,Math.floor(h/pitch));
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
    const mask=document.createElement('canvas');mask.width=cols;mask.height=rows;
    const centres=new Float32Array(cols*rows*2),ox=(w-cols*pitch)/2,oy=(h-rows*pitch)/2;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;centres[i*2]=ox+(c+.5)*pitch;centres[i*2+1]=oy+(r+.5)*pitch;}
    canvas.dataset.gridPitch=String(pitch);canvas.dataset.gridColumns=String(cols);canvas.dataset.gridRows=String(rows);
    return{canvas,id:canvas.dataset.dot,context:canvas.getContext('2d'),w,h,pitch,cols,rows,centres,mask:mask.getContext('2d',{willReadFrequently:true}),poses:new Map()};
  }
  // This is the only function that puts luminous beads on the screen. Its
  // centres and radius are immutable until the layout is resized.
  function paintCells(model,slots){
    const c=model.context,groups=Array.from({length:16},()=>[]);
    for(let i=0;i<slots.length;i++)if(slots[i])groups[slots[i]-1].push(i);
    c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,model.w,model.h);
    groups.forEach((indices,role)=>{
      c.fillStyle=palette[role];c.beginPath();indices.forEach(i=>{
        const x=model.centres[i*2],y=model.centres[i*2+1],r=model.pitch*.319;c.moveTo(x+r,y);c.arc(x,y,r,0,TAU);
      });c.fill();
    });
  }
  function sourceCells(model,key,zone,pose){
    const cacheKey=key+':'+pose;if(model.poses.has(cacheKey))return model.poses.get(cacheKey);
    const asset=data[key],slots=new Uint8Array(model.cols*model.rows),hist=new Uint16Array(slots.length*16);
    const unit=Math.min(zone[2]/asset.width,zone[3]/asset.height)*.94,cx=zone[0]+zone[2]/2,cy=zone[1]+zone[3]/2;
    const phase=pose/(key==='ar'?24:12)*TAU;
    asset.points.forEach(([px,py,originalRole])=>{
      const u=px/asset.width,v=py/asset.height;let x=(px-asset.width/2)*unit,y=(py-asset.height/2)*unit,role=originalRole;
      if(key==='dog'){
        role%=4;
        if(v>.57){const leg=Math.min(3,Math.floor(u*4.8)),angle=phase+(leg%2?Math.PI:0),reach=clamp((v-.54)/.46);x+=Math.sin(angle)*asset.width*unit*.065*reach;y-=Math.max(0,Math.cos(angle))*asset.height*unit*.07*reach;}
      }else if(key==='ar'){
        const yaw=Math.sin(phase)*.48,z=(.35-(u-.5)**2-(v-.5)**2)*asset.width*unit*.16;x=x*Math.cos(yaw)+z*Math.sin(yaw);
      }else if(key==='fragment')role=12+role%4;
      const col=Math.floor(cx+x),row=Math.floor(cy+y);
      if(col>=0&&row>=0&&col<model.cols&&row<model.rows)hist[(row*model.cols+col)*16+role]++;
    });
    for(let i=0;i<slots.length;i++){let best=-1,count=0;for(let r=0;r<16;r++)if(hist[i*16+r]>count){best=r;count=hist[i*16+r];}if(best>=0)slots[i]=best+1;}
    model.poses.set(cacheKey,slots);return slots;
  }
  const colour=role=>'rgb('+((role+1)*12)+',0,0)';
  const box=(m,x=0,y=0,w=1,h=1)=>[m.cols*x,m.rows*y,m.cols*w,m.rows*h];
  const project=(b,p)=>[Math.floor(b[0]+p[0]*b[2])+.5,Math.floor(b[1]+p[1]*b[3])+.5];
  function path(m,b,points,role,weight=1.15,closed=false){poly(m.mask,points.map(p=>project(b,p)),colour(role),weight,closed);}
  function rectangle(m,b,role,weight=1.1){path(m,b,[[0,0],[1,0],[1,1],[0,1]],role,weight,true);}
  function disc(m,b,x,y,r,role){const p=project(b,[x,y]);m.mask.fillStyle=colour(role);m.mask.beginPath();m.mask.arc(p[0],p[1],r,0,TAU);m.mask.fill();}
  function readMask(m){
    const pixels=m.mask.getImageData(0,0,m.cols,m.rows).data,slots=new Uint8Array(m.cols*m.rows);
    for(let i=0;i<slots.length;i++)if(pixels[i*4+3]>95)slots[i]=clamp(Math.round(pixels[i*4]/12),1,16);
    return slots;
  }
  function latticePath(m,b,points){
    const out=[];
    for(let n=0;n<points.length-1;n++){
      const a=project(b,points[n]),z=project(b,points[n+1]);let x=Math.floor(a[0]),y=Math.floor(a[1]);const ex=Math.floor(z[0]),ey=Math.floor(z[1]),dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1;let error=dx+dy;
      for(;;){if(x>=0&&y>=0&&x<m.cols&&y<m.rows)out.push(y*m.cols+x);if(x===ex&&y===ey)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
    }return [...new Set(out)];
  }
  function signal(m,slots,b,points,time,role=7){
    const cells=latticePath(m,b,points);if(!cells.length)return;
    const head=Math.floor(time*7)%cells.length;for(let i=0;i<3;i++)slots[cells[(head+i)%cells.length]]=role+1;
  }
  const route=[[.13,.77],[.35,.77],[.35,.42],[.65,.42],[.65,.23],[.87,.23]];
  function roadMap(m,b,role=6,plane=false,structure=true){
    if(structure){path(m,b,plane?[[.12,.08],[.86,.08],[.99,.91],[.01,.91]]:[[.05,.08],[.95,.08],[.95,.92],[.05,.92]],1,1.1,true);
    path(m,b,[[.31,.12],[.31,.88]],0,.8);path(m,b,[[.7,.12],[.7,.88]],0,.8);path(m,b,[[.1,.52],[.9,.52]],0,.8);
    path(m,b,[[.12,.2],[.24,.2],[.24,.36],[.12,.36]],9,.85,true);path(m,b,[[.75,.65],[.88,.65],[.88,.81],[.75,.81]],9,.85,true);
    }
    path(m,b,route,role,1.25);disc(m,b,.13,.77,1.25,14);disc(m,b,.87,.23,1.25,14);
  }
  function story(m,b,time){
    const brain=[[.5,.18],[.4,.12],[.3,.17],[.25,.28],[.25,.4],[.2,.48],[.27,.61],[.4,.65],[.5,.72],[.61,.65],[.73,.6],[.8,.48],[.75,.39],[.75,.27],[.65,.15],[.55,.13]];
    path(m,b,brain,6,1.4,true);path(m,b,[[.5,.18],[.5,.65]],5,1);
    path(m,b,[[.32,.3],[.42,.3],[.42,.43],[.34,.43]],5,1);path(m,b,[[.66,.3],[.57,.3],[.57,.51],[.68,.51]],5,1);
    const clues=[[.07,.12],[.93,.13],[.06,.78],[.94,.78]];
    clues.forEach((p,i)=>{const cell=[b[0]+(p[0]-.045)*b[2],b[1]+(p[1]-.06)*b[3],b[2]*.09,b[3]*.12];rectangle(m,cell,Math.floor(time*1.4)%4===i?14:12,1.1);path(m,b,[p,[p[0]<.5?.25:.75,p[1]]],1,.8);});
  }
  function cellsFor(m,time){
    const full=box(m);
    if(m.id==='dog'||m.id==='ar')return sourceCells(m,m.id,[1,1,m.cols-2,m.rows-2],Math.floor(time*(m.id==='ar'?6:8))%(m.id==='ar'?24:12));
    m.mask.clearRect(0,0,m.cols,m.rows);let paths=[];
    if(m.id==='walk'||m.id==='route'){
      const b=box(m,.02,.03,.94,.92);roadMap(m,b);paths.push([b,route,7]);
    }else if(m.id==='translation'){
      const left=box(m,.01,.1,.35,.78),right=box(m,.64,.1,.35,.78);roadMap(m,left,6);roadMap(m,right,14);
      path(m,full,[[.43,.5],[.57,.5]],1,1.4);path(m,full,[[.51,.34],[.58,.5],[.51,.66]],14,1.3);
      paths.push([left,route,7],[right,route,15]);
    }else if(m.id==='memory'){
      rectangle(m,box(m,.1,.03,.8,.92),3,1.6);const b=box(m,.2,.12,.59,.5);roadMap(m,b);paths.push([b,route,7]);
      path(m,full,[[.22,.72],[.75,.72]],1,1);path(m,full,[[.22,.81],[.61,.81]],1,1);path(m,full,[[.45,.9],[.55,.9]],3,1);
    }else if(m.id==='story')story(m,full,time);
    else if(m.id==='fragment'){
      const bars=Math.max(5,Math.min(13,2*Math.floor((m.cols-2)/4)+1)),cx=m.cols*.5,cy=m.rows*.82,max=Math.max(2,Math.floor(m.rows*.1));
      for(let i=0;i<bars;i++){const x=Math.round(cx+(i-(bars-1)/2)*2)+.5,level=1+Math.round(Math.abs(Math.sin(time*3.2+i*.65))*max);poly(m.mask,[[x,cy-level],[x,cy+level]],colour(6),1);}
    }else if(m.id==='hub'){
      const modern=box(m,.04,.55,.91,.18),ancient=box(m,.04,.8,.91,.18);roadMap(m,modern,6,true,false);roadMap(m,ancient,14,true,false);paths.push([modern,route,7],[ancient,route,15]);
    }
    const slots=readMask(m);
    paths.forEach(([b,p,role])=>signal(m,slots,b,p,time,role));
    if(m.id==='fragment'){
      const original=sourceCells(m,'fragment',[m.cols*.09,0,m.cols*.82,m.rows*.61],0);for(let i=0;i<slots.length;i++)if(original[i])slots[i]=original[i];
    }
    return slots;
  }
  function hubRelations(m){
    const c=m.context,actors=[[m.w*.5,m.h*.12],[m.w*.18,m.h*.4],[m.w*.82,m.h*.4]],radius=Math.min(27,m.w*.095),ring=radius+4;
    c.strokeStyle=accent;c.lineWidth=1.25;c.beginPath();actors.forEach(([x,y])=>{c.moveTo(x+radius,y);c.arc(x,y,radius,0,TAU);});c.stroke();
    actors.forEach((a,i)=>{const b=actors[(i+1)%3],length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,start=[a[0]+ux*ring,a[1]+uy*ring],end=[b[0]-ux*ring,b[1]-uy*ring];poly(c,[start,end],line,1.1);arrow(c,start,end,line,4);});
    // Plane outlines are continuous linework; the route inside remains a fixed LED grid.
    const ox=(m.w-m.cols*m.pitch)/2,oy=(m.h-m.rows*m.pitch)/2;
    for(const y of [.55,.8]){
      const b=box(m,.04,y,.91,.18),toPoint=p=>{const q=project(b,p);return[ox+q[0]*m.pitch,oy+q[1]*m.pitch];};
      poly(c,[[.12,.08],[.86,.08],[.99,.91],[.01,.91]].map(toPoint),line,1,true);
      for(const pair of [[[.31,.12],[.31,.88]],[[.7,.12],[.7,.88]],[[.1,.52],[.9,.52]]])poly(c,pair.map(toPoint),line,.65);
    }
    const a=[m.w*.5,m.h*.74],b=[m.w*.5,m.h*.79];poly(c,[a,b],line,1);arrow(c,a,b,accent,4);
  }
  function render(time){
    if(!data)return;
    lineContext.setTransform(ratio,0,0,ratio,linePad*ratio,0);lineContext.clearRect(-linePad,0,width+linePad*2,height);
    const chosen=selected();links.forEach(link=>{
      const colour=chosen===link.id?(link.side==='left'?flow:accent):line;
      lineContext.globalAlpha=(chosen&&chosen!==link.id) ? (paper?.52:.3) : (paper?1:.85);poly(lineContext,link.points,colour,chosen===link.id?1.8:1.15);arrow(lineContext,link.points.at(-2),link.points.at(-1),colour,5);
    });lineContext.globalAlpha=1;
    models.forEach(m=>{paintCells(m,cellsFor(m,time));if(m.id==='hub')hubRelations(m);});
  }
  function connectors(boxes,hubBox,width,height,desktop){
    return cards.map((card,index)=>{
      const b=boxes[card.dataset.node],side=card.dataset.side,port=.16+(index%4)*.22;let points;
      if(desktop){
        if(side==='left'){
          const a=[b.x+b.w,b.y+b.h/2],z=[hubBox.x,hubBox.y+hubBox.h*port];
          if(card.dataset.node==='walk'){const lane=Math.min(a[0]+28,boxes.fragment.x-12),cross=(boxes.fragment.y+boxes.fragment.h+boxes.dog.y)/2,near=z[0]-13;points=[a,[lane,a[1]],[lane,cross],[near,cross],[near,z[1]],z];}
          else if(card.dataset.node==='fragment'){const lane=z[0]-13;points=[a,[lane,a[1]],[lane,z[1]],z];}
          else points=[a,[a[0]+22,a[1]],[z[0]-22,z[1]],z];
        }else{
          const a=[hubBox.x+hubBox.w,hubBox.y+hubBox.h*port],z=[b.x,b.y+b.h/2];
          if(card.dataset.node==='memory'){const lane=a[0]+13,lower=Math.min(height-4,boxes.story.y+boxes.story.h+12),near=z[0]-13;points=[a,[lane,a[1]],[lane,lower],[near,lower],[near,z[1]],z];}
          else if(card.dataset.node==='story'){const lane=(a[0]+z[0])/2;points=[a,[lane,a[1]],[lane,z[1]],z];}
          else points=[a,[a[0]+22,a[1]],[z[0]-22,z[1]],z];
        }
      }else{
        const lane=side==='left'?-10:width+10;
        const a=side==='left'?[b.x,b.y+b.h/2]:[hubBox.x+hubBox.w,hubBox.y+hubBox.h*port];
        const z=side==='left'?[hubBox.x,hubBox.y+hubBox.h*port]:[b.x+b.w,b.y+b.h/2];points=[a,[lane,a[1]],[lane,z[1]],z];
      }
      return{id:card.dataset.node,side,points};
    });
  }
  function resize(){
    width=stage.clientWidth;height=stage.clientHeight;ratio=Math.min(devicePixelRatio||1,1.5,4096/Math.max(1,width));
    const styles=getComputedStyle(page),lightMode=document.documentElement.dataset.theme==='light';paper=lightMode&&!forced.matches;line=lightMode?'#405839':'#71806c';accent=styles.getPropertyValue('--gogo-accent').trim();flow=lightMode?'#075c78':'#94e1e8';
    palette=forced.matches?Array(16).fill(styles.color):(lightMode?light:dark);if(forced.matches){line=styles.color;accent=line;flow=line;}
    linePad=matchMedia('(min-width:901px)').matches?0:12;lineCanvas.style.left=-linePad+'px';lineCanvas.style.right='auto';lineCanvas.style.width=(width+linePad*2)+'px';lineCanvas.width=Math.round((width+linePad*2)*ratio);lineCanvas.height=Math.round(height*ratio);frames.forEach(outline);
    const rect=e=>({x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth,h:e.offsetHeight});
    hubBox=rect(hub);const boxes=Object.fromEntries(cards.map(e=>[e.dataset.node,rect(e)])),desktop=matchMedia('(min-width:901px)').matches;
    links=connectors(boxes,hubBox,width,height,desktop);
    if(data)models=canvases.map(makeModel);page.dataset.dotGrid='fixed';sync();
  }
  function active(){return onScreen&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));}
  function tick(now){
    frame=0;if(!active()||reduced.matches||forced.matches||!data)return;
    if(!previous||now-previous>=1000/FPS){if(previous)elapsed+=Math.min(.15,(now-previous)/1000);previous=now;render(elapsed);}frame=requestAnimationFrame(tick);
  }
  function load(){
    if(data||loading)return;loading=true;fetch(sourceURL).then(r=>{if(!r.ok)throw Error('LED source unavailable');return r.json();}).then(result=>{data=result.assets;page.dataset.dots='ready';resize();}).catch(()=>{page.dataset.dots='unavailable';settleEntry(true);}).finally(()=>{loading=false;});
  }
  function settleEntry(staticView=false){
    entryStarted=entryDone=true;stage.classList.remove('is-entry-pending');entryAnimations.forEach(a=>a.cancel());entryAnimations=[];page.dataset.networkEntry=staticView?'static':'complete';
  }
  function enter(){
    if(entryDone)return;
    if(reduced.matches||forced.matches||typeof hub.animate!=='function'){settleEntry(true);return;}
    if(entryStarted)return;
    if(!active()||!data||visibleRatio<Math.min(.25,innerHeight/Math.max(1,page.offsetHeight)*.4))return;
    entryStarted=true;page.dataset.networkEntry='running';
    const cx=hub.offsetLeft+hub.offsetWidth/2,cy=hub.offsetTop+hub.offsetHeight/2;
    entryAnimations=cards.map((card,i)=>{
      const dx=clamp((cx-card.offsetLeft-card.offsetWidth/2)*.6,-260,260),dy=clamp((cy-card.offsetTop-card.offsetHeight/2)*.6,-180,180);
      return card.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.86)`},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:680,delay:i*38,easing:'cubic-bezier(.18,.75,.22,1)',fill:'both'});
    });
    entryAnimations.push(hub.animate([{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.18,.75,.22,1)',fill:'both'}));
    entryAnimations.push(lineCanvas.animate([{opacity:0},{opacity:1}],{duration:300,delay:650,fill:'both'}));
    stage.classList.remove('is-entry-pending');Promise.allSettled(entryAnimations.map(a=>a.finished)).then(()=>{if(!entryDone)settleEntry();});
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;previous=0;const visible=active();page.dataset.networkActive=visible?'true':'false';page.dataset.networkMotion=!visible?'paused':!data?'loading':reduced.matches||forced.matches?'static':'running';
    enter();entryAnimations.forEach(a=>{if(!visible&&a.playState==='running')a.pause();else if(visible&&a.playState==='paused')a.play();});
    if(!visible)return;if(!data){load();return;}render((reduced.matches||forced.matches) ? .6 : elapsed);if(!reduced.matches&&!forced.matches)frame=requestAnimationFrame(tick);
  }
  function select(){cards.forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.node===pinned)));if(active())render((reduced.matches||forced.matches) ? .6 : elapsed);}
  cards.forEach(card=>{
    card.addEventListener('pointerenter',()=>{hover=card.dataset.node;select();});card.addEventListener('pointerleave',()=>{hover=null;select();});
    card.addEventListener('focus',()=>{if(!entryDone)settleEntry(true);focus=card.dataset.node;select();});card.addEventListener('blur',()=>{focus=null;select();});card.addEventListener('click',()=>{pinned=pinned===card.dataset.node?null:card.dataset.node;select();});
  });
  page.addEventListener('keydown',e=>{if(e.key==='Escape'){pinned=null;select();}});
  if(!reduced.matches&&!forced.matches)stage.classList.add('is-entry-pending');
  new IntersectionObserver(entries=>{visibleRatio=entries[0].intersectionRatio;onScreen=entries[0].isIntersecting&&visibleRatio>=.01;sync();},{threshold:[.01,.025,.05,.1,.15,.25]}).observe(page);
  const observer=new ResizeObserver(resize);observer.observe(stage);canvases.forEach(c=>observer.observe(c));
  new MutationObserver(resize).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);forced.addEventListener('change',resize);
  addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});document.fonts.ready.then(resize);resize();
})();
