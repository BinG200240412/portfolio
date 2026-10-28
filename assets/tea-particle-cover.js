/* Orthographic tea utensils on one fixed LED lattice. All shading uses opaque
 * coloured dots and quantised diameters; no gradients, opacity fades or blur. */
(() => {
  'use strict';
  const canvas=document.getElementById('tea-particle-cover');
  const stage=canvas?.closest('.tea-particle-stage');
  const ctx=canvas?.getContext('2d',{alpha:true});
  if(!ctx||!stage)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const TAU=Math.PI*2, tilt=-.16, ct=Math.cos(tilt), st=Math.sin(tilt);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const mod=(a,b)=>((a%b)+b)%b;
  let w=0,h=0,dpr=0,pitch=6,frame=0,last=0,time=0,count=0,visible=true,shown=true,light=false;
  let cx=0,radius=0,rim=0,bodyHeight=0,wx=0,wy=0,neck=0,top=0,handleR=0,headR=0;
  let bowl=[],handle=[],tineRows=[],glaze=[],bamboo=[];
  let host=null;try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const active=()=>visible&&shown&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on'));
  const project=(x,y)=>({x:wx+x*ct-y*st,y:wy+x*st+y*ct});
  function labels(){
    canvas.setAttribute('aria-label',document.documentElement.lang.startsWith('en')?
      'A slender bamboo-yellow tea whisk, tilted left and rotating, drips tea foam into a black Jian bowl with iridescent dotted reflections.':
      '细长的竹黄色茶筅向左微倾并自转，茶沫滴入带有彩色点阵釉光的黑色建盏。');
  }
  function swatches(a,b,n=12){
    return Array.from({length:n},(_,i)=>`rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*i/(n-1))).join(',')})`);
  }
  function palette(){
    light=document.documentElement.dataset.theme==='light';
    const base=light?[26,29,32]:[43,47,51];
    const colours=light?[[42,93,117],[38,103,89],[124,91,42],[110,59,92],[67,67,122],[40,97,112]]:
      [[100,157,181],[89,159,141],[183,155,96],[165,110,153],[118,121,185],[98,165,170]];
    glaze=colours.map(c=>swatches(base,c));
    bamboo=swatches(light?[113,74,24]:[104,75,35],light?[188,143,67]:[236,210,145],16);
    canvas.dataset.theme=light?'light':'dark';sync();
  }
  function dot(x,y,size,colour){
    const r=pitch*Math.round(clamp(size,.085,.47)*24)/24;
    ctx.fillStyle=colour;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  }
  function build(){
    cx=w*.75;radius=w*.43;rim=h*.65;bodyHeight=h*.31;
    wx=w*.66;wy=h*.575;top=-h*.53;neck=-h*.32;
    handleR=Math.min(w*.037,h*.044);headR=Math.min(w*.16,h*.19);
    bowl=[];handle=[];tineRows=[];
    for(let y=pitch*.5;y<rim+bodyHeight+h*.01;y+=pitch){
      if(y<rim-pitch*.5)continue;
      const v=clamp((y-rim)/bodyHeight,0,1);
      let lo=0,hi=1;
      for(let k=0;k<12;k++){
        const s=(lo+hi)*.5,u=1-s,by=3*u*u*s*.39+3*u*s*s*.94+s*s*s;
        if(by<v)lo=s;else hi=s;
      }
      const s=(lo+hi)*.5,u=1-s;
      const r=radius*(u*u*u+3*u*u*s*.96+3*u*s*s*.59+s*s*s*.26);
      for(let x=pitch*.5;x<w;x+=pitch){
        if(Math.abs(x-cx)>r)continue;
        bowl.push({x,y,v,phi:Math.asin(clamp((x-cx)/r,-1,1)),n:noise(x,y),edge:y<rim+pitch*.75});
      }
    }
    // Sample the handle once on the same screen-space grid as the bowl.
    for(let y=pitch*.5;y<wy;y+=pitch)for(let x=pitch*.5;x<w;x+=pitch){
      const dx=x-wx,dy=y-wy,lx=dx*ct+dy*st,ly=-dx*st+dy*ct;
      if(ly<top||ly>neck+h*.018||Math.abs(lx)>handleR*(ly>neck-h*.008?1.12:1))continue;
      handle.push({x,y,ly,phi:Math.asin(clamp(lx/handleR,-1,1)),n:noise(x,y),binding:ly>neck-h*.01});
    }
    // A real axial revolution of individual bamboo tines, projected without
    // perspective. The thin inward curl makes an open whisk, not a solid cone.
    const steps=Math.ceil((0-neck)/(pitch*.55));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      let r=handleR*.83+(headR-handleR*.83)*Math.sin(Math.min(t/.88,1)*Math.PI*.5);
      if(t>.84)r-=headR*.23*((t-.84)/.16)**2;
      tineRows.push({t,r,y:neck+(0-neck)*t});
    }
    canvas.dataset.projection='front';canvas.dataset.pitch=String(pitch);
    canvas.dataset.dots=String(bowl.length+handle.length);
    canvas.dataset.whiskTilt='-9.2';canvas.dataset.materials='iridescent-black-glaze,bamboo';
  }
  function drawBowl(t){
    const band=-.82+.51*Math.sin(t*.38);
    for(const p of bowl){
      const g=Math.exp(-(((p.phi-band)/.19)**2));
      const fringe=Math.exp(-(((p.phi-band-.29)/.26)**2));
      const flake=p.n>.83?(p.n-.83)/.17:0;
      const hue=Math.floor(mod(p.phi*2.2+p.v*1.6+t*.035+p.n*.28,1)*glaze.length);
      const shine=clamp(g*.78+fringe*.25+flake*.16,0,1);
      const colour=glaze[hue][Math.round(shine*11)];
      let size=light?.43-g*.19:.24+g*.19+flake*.035;
      if(p.edge)size=light?.34:.34+g*.10;
      dot(p.x,p.y,size,colour);
    }
    canvas.dataset.reflection=band.toFixed(3);
  }
  function drawWhisk(t){
    const spin=t*.68, cells=new Map();
    for(const p of handle){
      const normal=Math.max(0,Math.cos(p.phi+.45));
      const grain=.5+.5*Math.sin(p.phi*10-spin*5+p.ly*.008);
      let shade=clamp(.22+normal*.6+grain*.14,0,1);
      if(p.binding)shade*=.53+.25*Math.sin(p.ly/pitch*3);
      dot(p.x,p.y,light?.40-shade*.09:.25+shade*.18,bamboo[Math.round(shade*15)]);
    }
    const add=(x,y,z,shade,size)=>{
      const pos=project(x,y),ix=Math.round(pos.x/pitch-.5),iy=Math.round(pos.y/pitch-.5),key=iy*4096+ix;
      const old=cells.get(key);
      if(!old||z>old.z)cells.set(key,{x:(ix+.5)*pitch,y:(iy+.5)*pitch,z,shade,size});
    };
    for(let j=0;j<28;j++){
      const angle=j/28*TAU+spin, sn=Math.sin(angle),cs=Math.cos(angle);
      for(const row of tineRows){
        const theta=angle+.055*Math.sin(row.t*Math.PI),sx=Math.sin(theta),sz=Math.cos(theta);
        const shade=clamp(.22+.63*Math.max(0,sz*.92-sx*.38)+.05*Math.sin(j*2.1),.12,1);
        add(row.r*sx,row.y,row.r*sz,shade,sz<0?.18:.31+shade*.10);
      }
      // Inner tines curve back into the open centre.
      if(j%2===0)for(let k=0;k<=22;k++){
        const u=k/22,r=headR*.47*Math.sin(u*Math.PI*.8)+handleR*.6;
        add(r*sn,neck+(0-neck)*u*.83,r*cs-2,.19+.47*Math.max(0,cs),cs<0?.14:.27);
      }
    }
    for(const p of cells.values())dot(p.x,p.y,p.size,bamboo[Math.round(p.shade*15)]);
    canvas.dataset.whiskAngle=mod(spin,TAU).toFixed(3);
    canvas.dataset.whiskMotion='axial-rotation';
  }
  function drawFoam(t){
    if(reduced.matches){canvas.dataset.droplets='0';return;}
    let drops=0;
    // Three staggered drops each cycle. Each birth is attached to a rotating
    // tine tip; after detachment it falls vertically, then breaks at the rim.
    for(let i=0;i<3;i++){
      const age=mod(t-i*.62,5.8);
      if(age>1.05)continue;
      const birth=t-age,angle=birth*.68+i*1.9;
      const tip=project(headR*.77*Math.sin(angle),0);
      const fall=.70,colour=light?'#887747':'#eee4c7';
      const px=pitch*(Math.round(tip.x/pitch-.5)+.5);
      if(age<fall){
        const u=age/fall,py=tip.y+(rim-tip.y)*u*u;
        dot(px,pitch*(Math.round(py/pitch-.5)+.5),.40,colour);
        if(u>.25)dot(px,pitch*(Math.round(py/pitch-.5)-.5),.21,colour);
        drops++;
      }else{
        const u=(age-fall)/.35;
        for(let k=-2;k<=2;k++){
          const x=px+k*pitch*(1+u*2.4),y=rim-pitch*(.6+Math.sin(u*Math.PI)*2.3)*(1-Math.abs(k)*.15);
          dot(pitch*(Math.round(x/pitch-.5)+.5),pitch*(Math.round(y/pitch-.5)+.5),.32*(1-u)+.09,colour);
        }
        drops++;
      }
    }
    canvas.dataset.droplets=String(drops);
  }
  function draw(){
    if(!active())return;
    ctx.clearRect(0,0,w,h);ctx.globalAlpha=1;
    const t=reduced.matches?1.2:time;
    drawBowl(t);drawWhisk(t);drawFoam(t);
    canvas.dataset.frames=String(++count);canvas.dataset.reflectionMode='structural-dot-size';
    canvas.dataset.renderReady=stage.dataset.renderReady='true';
  }
  function tick(now){
    frame=0;if(!active()||reduced.matches){canvas.dataset.animating='false';return;}
    if(!last||now-last>=32){time+=last?Math.min(.1,(now-last)/1000):.033;last=now;draw();}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    canvas.dataset.animating=String(active()&&!reduced.matches);canvas.dataset.reducedMotion=String(reduced.matches);
    if(!w||!active())return;draw();if(!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function resize(){
    const b=stage.getBoundingClientRect(),nw=Math.round(b.width),nh=Math.round(b.height),nr=Math.min(devicePixelRatio||1,1.5);
    if(!nw||!nh||(nw===w&&nh===h&&nr===dpr))return;
    w=nw;h=nh;dpr=nr;pitch=w<520?4.5:6;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
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
