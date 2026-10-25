/* Original PDF motifs are drawn point by point. One clock owns the entire scene. */
(() => {
  'use strict';
  const page = document.querySelector('.gogo-logic-page');
  const stage = page?.querySelector('.gogo-logic-network');
  if (!stage) return;
  const sourceURL = new URL('works/xr/logic/dot-assets.json?v=open-dot-network-20261025', document.currentScript.src);
  const cards = [...stage.querySelectorAll('.gogo-logic-card')];
  const canvases = [...stage.querySelectorAll('[data-dot]')];
  const hub = stage.querySelector('.gogo-logic-hub');
  const frames = [...cards,hub].map(element => {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('gogo-dot-frame');svg.setAttribute('aria-hidden','true');
    element.prepend(svg);return {element,svg};
  });
  const lineCanvas = stage.querySelector('.gogo-network-lines');
  const lineContext = lineCanvas.getContext('2d');
  if (!lineContext) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const dialog = document.getElementById('gogo-lightbox');
  let host = null;
  try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
  const TAU = Math.PI * 2, FPS = 20;
  const dark = ['#5c625b','#92988b','#c5cbb8','#e9eadb','#2e5660','#4b8890','#85c4cb','#c6e8e5','#3f583d','#6b8b59','#a0bc80','#cfdbac','#6e522d','#a98748','#cda866','#eee0ae'];
  const light = ['#69765e','#4c613f','#304e28','#18331a','#4e7e80','#32676d','#1f4f62','#102d40','#697e45','#4b682c','#33541c','#1b3715','#96723b','#7a5425','#5d3d16','#3e260b'];
  let data = null, loading = false, models = [], links = [], palette = dark;
  let width = 1, height = 1, ratio = 1, hubBox = null;
  let onScreen = false, shown = true, frame = 0, previous = 0, elapsed = 0;
  let hover = null, focus = null, pinned = null;
  let ink = '#efeee9', line = '#484841', accent = '#c2944a', flow = '#85c4cb';
  const selected = () => pinned || hover || focus;
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;

  function outline({element,svg}) {
    const w=element.clientWidth,h=element.clientHeight,inset=2;
    const kind=element.dataset.node,cut=Math.min(18,w*.11,h*.11);
    const points=kind==='ar'||kind==='story'||element===hub
      ? [[inset+cut,inset],[w-inset-cut,inset],[w-inset,inset+cut],[w-inset,h-inset-cut],[w-inset-cut,h-inset],[inset+cut,h-inset],[inset,h-inset-cut],[inset,inset+cut]]
      : kind==='dog'||kind==='route'
      ? [[inset+cut,inset],[w-inset-cut,inset],[w-inset-cut,inset+cut*.5],[w-inset,inset+cut*.5],[w-inset,h-inset-cut],[w-inset-cut*.5,h-inset-cut],[w-inset-cut*.5,h-inset],[inset+cut,h-inset],[inset+cut,h-inset-cut*.5],[inset,h-inset-cut*.5],[inset,inset+cut],[inset+cut,inset+cut]]
      : [[inset,inset],[w-inset,inset],[w-inset,h-inset],[inset,h-inset]];
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
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

  function dot(context, x, y, radius) {
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, TAU);
  }
  function curve(points, t) {
    const u = 1 - t;
    return {
      x: u*u*u*points[0].x + 3*u*u*t*points[1].x + 3*u*t*t*points[2].x + t*t*t*points[3].x,
      y: u*u*u*points[0].y + 3*u*u*t*points[1].y + 3*u*t*t*points[2].y + t*t*t*points[3].y,
    };
  }
  function along(points, t) {
    const position = clamp(t) * (points.length - 1), index = Math.min(points.length - 2, Math.floor(position));
    return { x: mix(points[index].x, points[index+1].x, position-index), y: mix(points[index].y, points[index+1].y, position-index) };
  }
  function cloud(asset, box, key) {
    const unit = Math.min(box.width / asset.width, box.height / asset.height) * .94;
    const pitch = key==='voice'?3.8:width<600?5.2:7;
    const step = Math.max(1, Math.ceil(pitch / unit));
    const groups = Array.from({ length: 16 }, () => []);
    // Pool occupied cells instead of dropping every other sample: thin route
    // lines, glasses and legs must survive the smaller mobile lattice.
    const cells = new Map(),edges = new Map();
    asset.points.forEach(([x, y, role]) => {
      const col=Math.floor(x/step), row=Math.floor(y/step), key=row*asset.width+col;
      if(!cells.has(key))cells.set(key,{col,row,x:Math.min(asset.width-.5,col*step+step/2),y:Math.min(asset.height-.5,row*step+step/2),counts:Array(16).fill(0)});
      cells.get(key).counts[role]++;
      const edge=edges.get(row)||{min:col,max:col};edge.min=Math.min(edge.min,col);edge.max=Math.max(edge.max,col);edges.set(row,edge);
    });
    const sparseMap=['walk','route','translation','memory','hub'].includes(key);
    cells.forEach(({col,row,x,y,counts})=>{
      // A single textured source pixel must not fill an otherwise empty map cell.
      // Keep its silhouette and bright route even when the surrounding fill drops out.
      const edge=edges.get(row),boundary=col===edge.min||col===edge.max;
      if(sparseMap&&!boundary&&!counts[6]&&!counts[7]&&counts.reduce((a,b)=>a+b,0)<step*step*.65)return;
      let role=counts.indexOf(Math.max(...counts));
      if(counts[6]||counts[7])role=counts[7]>counts[6]?7:6;
      groups[role].push({x:(x-asset.width/2)*unit,y:(y-asset.height/2)*unit,u:x/asset.width,v:y/asset.height,role});
    });
    const peaks=new Map();
    groups.forEach(points=>points.forEach(point=>peaks.set(point.u,Math.max(peaks.get(point.u)||0,Math.abs(point.y)))));
    groups.forEach(points=>points.forEach(point=>{point.peak=peaks.get(point.u);}));
    return { groups, cx: box.cx, cy: box.cy, width: asset.width*unit, height: asset.height*unit, radius: unit*step*.27 };
  }
  function drawCloud(context, model, time, motion = '') {
    const gait = time * 5.2;
    model.groups.forEach((points, role) => {
      context.fillStyle = palette[role]; context.beginPath();
      points.forEach(point => {
        let x = point.x, y = point.y;
        if (motion === 'dog') {
          y += Math.sin(gait*2)*model.height*.012;
          if (point.v > .52 && point.u < .98) {
            const leg = Math.min(3, Math.floor(point.u*4.8));
            const phase = gait + (leg % 2 ? Math.PI : 0), reach = clamp((point.v-.48)/.52);
            x += Math.sin(phase)*model.width*.065*reach;
            y -= Math.max(0, Math.cos(phase))*model.height*.08*reach;
          }
        } else if (motion === 'ar') {
          const yaw = Math.sin(time*.75)*.48, roll = Math.sin(time*.43)*.045;
          const z = (.35-(point.u-.5)**2-(point.v-.5)**2)*model.width*.2;
          const depth = -x*Math.sin(yaw)+z*Math.cos(yaw), perspective = 1/(1+depth/(model.width*3));
          x = (x*Math.cos(yaw)+z*Math.sin(yaw))*perspective; y *= perspective;
          const oldX = x; x = x*Math.cos(roll)-y*Math.sin(roll); y = oldX*Math.sin(roll)+y*Math.cos(roll);
        } else if (motion === 'voice') {
          const amplitude=.32+.55*Math.abs(Math.sin(time*3.5+point.u*5))+.12*Math.sin(time*5.1-point.u*7);
          if(Math.abs(y)>point.peak*amplitude)return;
        } else if (motion === 'fragment') {
          const turn = Math.sin(time*.7)*.05, oldX = x;
          x = x*Math.cos(turn)-y*Math.sin(turn); y = oldX*Math.sin(turn)+y*Math.cos(turn)+Math.sin(time*1.3)*2;
        } else if (motion === 'story') {
          if (point.u < .28 || point.u > .73) {
            x += Math.sin(time*1.1+point.v*4)*3; y += Math.cos(time*1.3+point.u*5)*3;
          } else {
            const breath = 1+Math.sin(time*1.8)*.018; x *= breath; y *= breath;
          }
        }
        dot(context, model.cx+x, model.cy+y, model.radius);
      });
      context.fill();
    });
  }
  function cache(model) {
    const padding=model.radius+1, w=model.width+padding*2, h=model.height+padding*2;
    const bitmap=document.createElement('canvas');bitmap.width=Math.ceil(w*ratio);bitmap.height=Math.ceil(h*ratio);
    const context=bitmap.getContext('2d');context.scale(ratio,ratio);
    drawCloud(context,{...model,cx:w/2,cy:h/2},0);
    return {image:bitmap,padding,width:w,height:h};
  }
  function paintCache(context, model, bitmap) {
    context.drawImage(bitmap.image,model.cx-model.width/2-bitmap.padding,model.cy-model.height/2-bitmap.padding,bitmap.width,bitmap.height);
  }
  function glowRoute(context, model, time) {
    const head = (time*.17) % 1;
    context.fillStyle = flow; context.globalAlpha=.55; context.beginPath();
    model.groups.forEach((points, role) => {
      if (Math.floor(role/4)===1 && role%4>=2)points.forEach(point=>dot(context,model.cx+point.x,model.cy+point.y,model.radius*.85));
    });context.fill();context.globalAlpha=1;context.beginPath();
    model.groups.forEach((points, role) => {
      if (Math.floor(role/4) !== 1 || role%4 < 2) return;
      points.forEach(point => { if (Math.abs(point.u-head) < .075) dot(context, model.cx+point.x, model.cy+point.y, model.radius*1.13); });
    });
    context.fill();
  }
  function mapPath(context, model, path, time, colour, phase = 0) {
    const points = path.map(([x,y]) => ({ x: model.cx+(x-.5)*model.width, y: model.cy+(y-.5)*model.height }));
    context.fillStyle = colour; context.globalAlpha=.55;context.beginPath();
    for(let segment=0;segment<points.length-1;segment++){
      const a=points[segment],b=points[segment+1],count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
      for(let i=0;i<count;i++)dot(context,mix(a.x,b.x,i/count),mix(a.y,b.y,i/count),1);
    }context.fill();context.globalAlpha=1;
    for (let tail = 3; tail >= 0; tail--) {
      const progress = ((time*.12+phase-tail*.017)%1+1)%1, point = along(points, progress);
      context.globalAlpha = 1-tail*.22; context.beginPath(); dot(context, point.x, point.y, tail ? 1.7 : 2.6); context.fill();
    }
    context.globalAlpha = 1;
  }
  function drawHub(model, time) {
    const { context, width: w, height: h, clouds, bitmap } = model;
    paintCache(context, clouds[0], bitmap);
    const actors = [{x:w*.5,y:h*.12},{x:w*.18,y:h*.4},{x:w*.82,y:h*.4}];
    const ring = Math.min(27,w*.09);
    context.fillStyle = line; context.beginPath();
    actors.forEach((a,index) => {
      const b = actors[(index+1)%3], length = Math.hypot(b.x-a.x,b.y-a.y), count = Math.ceil(length/6);
      for (let i=0;i<=count;i++) {
        const t=i/count, x=mix(a.x,b.x,t), y=mix(a.y,b.y,t);
        if (Math.hypot(x-a.x,y-a.y)>ring+3 && Math.hypot(x-b.x,y-b.y)>ring+3) dot(context,x,y,1.2);
      }
    }); context.fill();
    context.fillStyle = accent; context.beginPath();
    actors.forEach((a,index) => {
      for (let i=0;i<26;i++) { const angle=i/26*TAU; dot(context,a.x+Math.cos(angle)*ring,a.y+Math.sin(angle)*ring,1.4); }
      const b=actors[(index+1)%3], t=(time*.16+index/3)%1, x=mix(a.x,b.x,t), y=mix(a.y,b.y,t);
      if (Math.hypot(x-a.x,y-a.y)>ring+3 && Math.hypot(x-b.x,y-b.y)>ring+3) dot(context,x,y,2.4);
    }); context.fill();
    mapPath(context,clouds[0],[[.165,.31],[.3,.18],[.384,.173],[.49,.21],[.595,.278],[.71,.22],[.825,.143]],time,flow);
    mapPath(context,clouds[0],[[.12,.82],[.25,.69],[.384,.66],[.49,.76],[.59,.83],[.76,.69]],time,accent,.12);
  }
  function render(time) {
    if (!data) return;
    lineContext.setTransform(ratio,0,0,ratio,0,0); lineContext.clearRect(0,0,width,height);
    const chosen = selected();
    links.forEach((link,index) => {
      lineContext.globalAlpha = chosen && chosen !== link.id ? .18 : .6;
      lineContext.fillStyle = chosen === link.id ? (link.side === 'left' ? flow : accent) : line;
      lineContext.beginPath(); link.dots.forEach(point => dot(lineContext,point.x,point.y,1.05)); lineContext.fill();
      lineContext.globalAlpha = chosen && chosen !== link.id ? .25 : 1;
      lineContext.fillStyle = link.side === 'left' ? flow : accent;
      for (let tail=2;tail>=0;tail--) {
        const t=((time*.19+index*.137-tail*.022)%1+1)%1, point=curve(link.curve,t);
        lineContext.beginPath(); dot(lineContext,point.x,point.y,tail ? 1.5 : 2.5); lineContext.fill();
      }
    }); lineContext.globalAlpha=1;
    models.forEach(model => {
      const {context,width:w,height:h,id,clouds,bitmap}=model;
      context.setTransform(ratio,0,0,ratio,0,0); context.clearRect(0,0,w,h);
      if (id === 'hub') { drawHub(model,time); return; }
      if (id === 'fragment') { drawCloud(context,clouds[0],time,'fragment'); drawCloud(context,clouds[1],time,'voice'); return; }
      if (id === 'dog' || id === 'ar' || id === 'story') drawCloud(context,clouds[0],time,id);
      else {
        paintCache(context,clouds[0],bitmap);
        if (id === 'walk') mapPath(context,clouds[0],[[.14,.28],[.32,.48],[.45,.61],[.7,.54],[.86,.36]],time,accent);
        else glowRoute(context,clouds[0],time);
      }
    });
  }
  function resize() {
    const rectangle=stage.getBoundingClientRect(); width=stage.clientWidth; height=stage.clientHeight;
    ratio=Math.min(devicePixelRatio||1,1.5,4096/Math.max(1,width));
    const styles=getComputedStyle(page), lightMode=document.documentElement.dataset.theme==='light';
    ink=styles.getPropertyValue('--ink').trim(); line=lightMode?'#99988b':'#61665a'; accent=styles.getPropertyValue('--gogo-accent').trim(); flow=lightMode?'#194c55':'#a2dde1';
    if(forced.matches){ink=styles.color;line=ink;accent=ink;flow=ink;}
    palette=forced.matches?Array(16).fill(ink):(lightMode?light:dark);
    lineCanvas.width=Math.round(width*ratio); lineCanvas.height=Math.round(height*ratio);
    frames.forEach(outline);
    const h=hub.getBoundingClientRect();hubBox={x:h.left-rectangle.left,y:h.top-rectangle.top,width:h.width,height:h.height};
    links=cards.map((card,index) => {
      const r=card.getBoundingClientRect(),side=card.dataset.side,x=r.left-rectangle.left,y=r.top-rectangle.top;
      const port=.16+(index%4)*.22;
      let start,end,c1,c2;
      if (matchMedia('(min-width: 901px)').matches) {
        start=side==='left'?{x:x+r.width,y:y+r.height/2}:{x:hubBox.x+hubBox.width,y:hubBox.y+hubBox.height*port};
        end=side==='left'?{x:hubBox.x,y:hubBox.y+hubBox.height*port}:{x,y:y+r.height/2};
        const bend=Math.max(22,Math.abs(end.x-start.x)*.5);
        c1={x:start.x+bend,y:start.y};c2={x:end.x-bend,y:end.y};
      } else {
        const gutter=side==='left'?4:width-4;
        start=side==='left'?{x:x+2,y:y+r.height/2}:{x:hubBox.x+hubBox.width-2,y:hubBox.y+hubBox.height*port};
        end=side==='left'?{x:hubBox.x+2,y:hubBox.y+hubBox.height*port}:{x:x+r.width-2,y:y+r.height/2};
        c1={x:gutter,y:start.y};c2={x:gutter,y:end.y};
      }
      const points=[start,c1,c2,end],length=Math.hypot(end.x-start.x,end.y-start.y),count=Math.max(6,Math.ceil(length/7));
      return {id:card.dataset.node,side,curve:points,dots:Array.from({length:count+1},(_,i)=>curve(points,i/count))};
    });
    if (data) models=canvases.map(canvas => {
      const context=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight,id=canvas.dataset.dot;
      canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      const boxes=id==='fragment'?(w<h*1.1?[{cx:w*.5,cy:h*.3,width:w*.84,height:h*.5},{cx:w*.5,cy:h*.78,width:w*.88,height:h*.23}]:[{cx:w*.26,cy:h*.5,width:w*.46,height:h*.83},{cx:w*.77,cy:h*.5,width:w*.38,height:h*.7}]):id==='hub'?[{cx:w*.5,cy:h*.77,width:w*.98,height:h*.43}]:[{cx:w*.5,cy:h*.5,width:w,height:h}];
      const keys=id==='fragment'?['fragment','voice']:[id];
      const clouds=keys.map((key,i)=>cloud(data[key],boxes[i],key));
      return {context,id,width:w,height:h,clouds,bitmap:cache(clouds[0])};
    });
    sync();
  }
  function active() { return onScreen && shown && !document.hidden && !dialog?.open && (!host || host.classList.contains('on')); }
  function tick(now) {
    frame=0;if(!active()||reduced.matches||forced.matches||!data)return;
    if(!previous||now-previous>=1000/FPS){if(previous)elapsed+=Math.min(.12,(now-previous)/1000);previous=now;render(elapsed);}
    frame=requestAnimationFrame(tick);
  }
  function load() {
    if(data||loading)return;loading=true;
    fetch(sourceURL).then(response=>{if(!response.ok)throw Error('Dot assets unavailable');return response.json();}).then(result=>{
      data=result.assets;page.dataset.dots='ready';resize();
    }).catch(()=>{page.dataset.dots='unavailable';}).finally(()=>{loading=false;});
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;previous=0;
    const visible=active();page.dataset.networkActive=visible?'true':'false';
    page.dataset.networkMotion=!visible?'paused':!data?'loading':reduced.matches||forced.matches?'static':'running';
    if(!visible)return;if(!data){load();return;}
    render(reduced.matches || forced.matches ? .6 : elapsed);
    if(!reduced.matches&&!forced.matches)frame=requestAnimationFrame(tick);
  }
  function select() { cards.forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.node===pinned)));if(active())render(reduced.matches || forced.matches ? .6 : elapsed); }
  cards.forEach(card=>{
    card.addEventListener('pointerenter',()=>{hover=card.dataset.node;select();});
    card.addEventListener('pointerleave',()=>{hover=null;select();});
    card.addEventListener('focus',()=>{focus=card.dataset.node;select();});
    card.addEventListener('blur',()=>{focus=null;select();});
    card.addEventListener('click',()=>{pinned=pinned===card.dataset.node?null:card.dataset.node;select();});
  });
  page.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=null;select();}});
  new IntersectionObserver(entries=>{onScreen=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.01);sync();},{threshold:.01}).observe(page);
  const observer=new ResizeObserver(resize);observer.observe(stage);canvases.forEach(canvas=>observer.observe(canvas));
  new MutationObserver(resize).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);forced.addEventListener('change',resize);
  addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});
  document.fonts.ready.then(resize);resize();
})();
