/* Front elevation, as in the author's sketch. Geometry stays still;
 * a moving specular band makes the black Jian bowl appear to rotate. */
(() => {
  'use strict';
  const canvas=document.getElementById('tea-particle-cover');
  const stage=canvas?.closest('.tea-particle-stage');
  const ctx=canvas?.getContext('2d',{alpha:true});
  if(!ctx||!stage)return;
  const mask=document.createElement('canvas'), ink=mask.getContext('2d',{willReadFrequently:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let w=0,h=0,ratio=0,pitch=6,points=[],frame=0,last=0,time=0,count=0,visible=true,shown=true;
  let light=false,cx=0,radius=0,rim=0,bodyHeight=0;
  let host=null;try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const active=()=>visible&&shown&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on'));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  function labels(){
    const en=document.documentElement.lang.startsWith('en');
    canvas.setAttribute('aria-label',en?'Front-facing dotted tea whisk and black Jian tea bowl. Moving reflections suggest the bowl rotating.':'正视点阵茶筅与黑色建盏，建盏侧面流动的反光表现旋转。');
  }
  function build(){
    mask.width=w;mask.height=h;ink.clearRect(0,0,w,h);
    cx=w*.86;radius=w*.61;rim=h*.655;bodyHeight=h*.302;
    // A straight mouth, curved front wall and a small foot. No tea-surface ellipse.
    ink.fillStyle='rgb(60,0,0)';ink.beginPath();
    ink.moveTo(cx-radius,rim);ink.lineTo(cx+radius,rim);
    ink.bezierCurveTo(cx+radius*.96,rim+bodyHeight*.39,cx+radius*.59,rim+bodyHeight*.94,cx+radius*.26,rim+bodyHeight);
    ink.lineTo(cx-radius*.26,rim+bodyHeight);
    ink.bezierCurveTo(cx-radius*.59,rim+bodyHeight*.94,cx-radius*.96,rim+bodyHeight*.39,cx-radius,rim);
    ink.fill();
    ink.fillRect(cx-radius*.28,rim+bodyHeight-1,radius*.56,Math.max(4,h*.011));
    ink.fillStyle='rgb(105,0,0)';ink.fillRect(cx-radius,rim-2,radius*2,Math.max(4,h*.008));
    const wx=w*.625, top=h*.045, neck=h*.251, end=rim-h*.019;
    const hw=w*.10, head=w*.225, hh=end-neck;
    // The upright bamboo sleeve and binding remain complete in the frame.
    ink.fillStyle='rgb(165,0,0)';ink.fillRect(wx-hw*.5,top,hw,neck-top);
    ink.fillStyle='rgb(210,0,0)';
    for(const y of [neck-h*.012,neck,neck+h*.012])ink.fillRect(wx-hw*.58,y,hw*1.16,Math.max(2,h*.004));
    ink.strokeStyle='rgb(245,0,0)';ink.lineWidth=Math.max(2.2,pitch*.60);ink.lineCap='round';
    for(let j=-9;j<=9;j++){
      const u=j/9, sx=wx+u*hw*.43, ex=wx+u*head;
      ink.beginPath();ink.moveTo(sx,neck+h*.008);
      ink.bezierCurveTo(sx+u*head*.30,neck+hh*.24,ex+u*head*.12,neck+hh*.72,ex,neck+hh*.91);
      ink.quadraticCurveTo(ex-u*head*.035,neck+hh*1.035,ex-u*head*.14,neck+hh*.975);ink.stroke();
    }
    // A few shorter inner splits give the tea whisk a hollow, rounded head.
    ink.strokeStyle='rgb(225,0,0)';ink.lineWidth=Math.max(1.9,pitch*.49);
    for(let j=-3;j<=3;j++){
      const u=j/3;ink.beginPath();ink.moveTo(wx+u*hw*.36,neck+h*.015);
      ink.bezierCurveTo(wx+u*head*.43,neck+hh*.34,wx+u*head*.56,neck+hh*.72,wx+u*head*.35,neck+hh*.80);ink.stroke();
    }
    const pixels=ink.getImageData(0,0,w,h).data;points=[];
    for(let y=pitch*.5;y<h;y+=pitch)for(let x=pitch*.5;x<w;x+=pitch){
      const i=(Math.floor(y)*w+Math.floor(x))*4;if(pixels[i+3]<35)continue;
      // Recover the radius of this horizontal section of the actual Bezier
      // wall. A fixed surface longitude therefore curves with the vessel.
      const wallY=clamp((y-rim)/bodyHeight,0,1);
      let lo=0,hi=1;
      for(let k=0;k<12;k++){
        const s=(lo+hi)*.5,u=1-s,by=3*u*u*s*.39+3*u*s*s*.94+s*s*s;
        if(by<wallY)lo=s;else hi=s;
      }
      const s=(lo+hi)*.5,u=1-s;
      const wallRadius=radius*(u*u*u+3*u*u*s*.96+3*u*s*s*.59+s*s*s*.26);
      points.push({x,y,role:pixels[i],n:noise(x,y),wallY,
        longitude:Math.asin(clamp((x-cx)/wallRadius,-1,1)),wx:(x-wx)/hw});
    }
    canvas.dataset.dots=String(points.length);canvas.dataset.pitch=String(pitch);
    canvas.dataset.projection='front';
  }
  function draw(){
    if(!active())return;
    ctx.clearRect(0,0,w,h);
    const phase=reduced.matches?.8:time, band=-.94+.47*Math.sin(phase*.72);
    ctx.globalAlpha=1;
    for(const p of points){
      let size;
      if(p.role<130){
        const reflection=Math.exp(-Math.pow((p.longitude-band)/.13,2));
        const shoulder=Math.exp(-Math.pow((p.longitude-band-.25)/.23,2))*.16;
        const glint=clamp((reflection+shoulder)*(1-p.wallY*.16),0,1);
        // Size, not opacity or a gradient overlay, carries the reflection.
        // On paper a smaller ink dot reveals the light; on dark paper a
        // larger pale dot does. Positions and pigment stay unchanged.
        size=light?.385-glint*.285:.115+glint*.325;
        size+=(p.n-.5)*.025;
        if(p.role>80)size=light?.30-glint*.15:.25+glint*.17;
        ctx.fillStyle=light?'#242622':'#a2a79f';
      }else{
        const rounded=Math.sqrt(Math.max(0,1-clamp(p.wx*1.65,-1,1)**2));
        size=p.role>220?.32+(p.n-.5)*.035:.24+rounded*.10;
        if(p.role>195&&p.role<220)size=.36;
        ctx.fillStyle=light?'#30312b':'#b1b5a8';
      }
      // Discrete bead diameters keep the finish explicitly pixel based.
      const dot=pitch*(Math.round(clamp(size,.09,.46)*24)/24);
      ctx.beginPath();ctx.arc(p.x,p.y,dot,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    canvas.dataset.frames=String(++count);canvas.dataset.reflection=band.toFixed(3);
    canvas.dataset.reflectionMode='structural-dot-size';
    canvas.dataset.renderReady=stage.dataset.renderReady='true';
  }
  function tick(now){
    frame=0;if(!active()||reduced.matches){canvas.dataset.animating='false';return;}
    if(!last||now-last>=49){time+=last?Math.min(.12,(now-last)/1000):.05;last=now;draw();}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    canvas.dataset.animating=String(active()&&!reduced.matches);
    canvas.dataset.reducedMotion=String(reduced.matches);
    if(!w||!active())return;draw();if(!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function palette(){light=document.documentElement.dataset.theme==='light';canvas.dataset.theme=light?'light':'dark';sync();}
  function resize(){
    const b=stage.getBoundingClientRect(),nw=Math.round(b.width),nh=Math.round(b.height),nr=Math.min(devicePixelRatio||1,1.5);
    if(!nw||!nh||(nw===w&&nh===h&&nr===ratio))return;
    w=nw;h=nh;ratio=nr;pitch=w<520?4.5:6;
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
    build();sync();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);sync();}).observe(stage);
  new MutationObserver(palette).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(rs=>{if(rs.some(r=>r.target instanceof HTMLDialogElement))sync();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);addEventListener('portfolio:language',labels);
  reduced.addEventListener('change',sync);addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});
  addEventListener('resize',resize,{passive:true});labels();palette();resize();
})();
