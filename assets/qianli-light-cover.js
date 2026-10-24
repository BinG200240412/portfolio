/* A landscape made from the same discrete, round LEDs as the home page.
 * Mountain profiles, folds and reflections are geometry, with no image source.
 * The lattice stays still: only the light travels. No per-frame layout reads.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('qianli-light-cover');
  const ctx = canvas?.getContext('2d', {alpha:true});
  const hero = canvas?.closest('.qianli-light-hero');
  if (!ctx || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, FPS = 24;
  const profiles = [
    [[-.08,.70],[.02,.62],[.10,.53],[.15,.60],[.22,.42],[.28,.34],[.33,.44],[.40,.62],[.46,.58],[.53,.43],[.59,.49],[.66,.39],[.72,.51],[.79,.60],[.86,.52],[.94,.64],[1.08,.61]],
    [[-.08,.74],[.01,.65],[.075,.49],[.13,.57],[.19,.64],[.24,.42],[.29,.29],[.32,.35],[.365,.56],[.41,.68],[.46,.64],[.51,.57],[.56,.64],[.605,.47],[.65,.36],[.69,.40],[.745,.57],[.80,.62],[.86,.68],[.94,.73],[1.08,.64]],
    [[-.08,.84],[.02,.77],[.09,.74],[.16,.82],[.24,.75],[.31,.77],[.39,.85],[.48,.80],[.55,.84],[.64,.72],[.70,.68],[.77,.75],[.83,.82],[.92,.79],[1.08,.84]],
  ];
  const palette = {
    dark:['#355b77','#407c95','#5399a6','#70b5b5','#91cfc3','#b8e1d1','#e0ede0'],
    light:['#9aaca3','#809f96','#638c83','#4f8179','#42796e','#346b61','#28584f'],
  };
  let width=0,height=0,pitch=5,points=[],sprites=[],light=false;
  let frame=0,lastFrame=0,elapsed=0,onScreen=true,shown=true;
  let aim=null,hit=null,pointerLevel=0,pulse=null;
  let parentSection=null;
  try { parentSection=window.frameElement?.closest('#section') || null; } catch (_) {}
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  const hash=(x,y,s=0)=>{
    const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;
    return n-Math.floor(n);
  };
  function label() {
    const english=window.PortfolioI18n?.language==='en' || document.documentElement.lang==='en';
    const title=hero.querySelector('.title');
    if(title)title.textContent=english ? 'A Thousand Li' : '千里江山';
    canvas.setAttribute('aria-label',english
      ? 'Blue-green mountains formed from individual light beads. Light travels along the ridges and brightens on touch.'
      : '由点阵光珠组成的青绿山峦，光沿山脊缓缓流动，触碰时局部亮起。');
  }
  function ridge(profile,x) {
    let i=0;while(i<profile.length-2 && x>profile[i+1][0])i++;
    const a=profile[i],b=profile[i+1],t=clamp((x-a[0])/(b[0]-a[0]));
    // A little broken rock along the long, legible silhouette.
    return a[1]+(b[1]-a[1])*smooth(t)+
      Math.sin(x*173)*.0035+Math.sin(x*389+2)*.0018;
  }
  function makeSprites() {
    light=document.documentElement.dataset.theme==='light';
    sprites=palette[light?'light':'dark'].map(colour=>{
      const sprite=document.createElement('canvas');sprite.width=sprite.height=24;
      const paint=sprite.getContext('2d');
      paint.fillStyle=colour;paint.beginPath();paint.arc(12,12,6.8,0,TAU);paint.fill();
      return sprite;
    });
  }
  function resize() {
    const box=canvas.getBoundingClientRect();
    const w=Math.round(box.width),h=Math.round(box.height);
    if (!w || !h) return;
    const ratio=Math.min(devicePixelRatio || 1,2);
    const backingW=Math.round(w*ratio),backingH=Math.round(h*ratio);
    // Repeated visibility/theme events must never clear a correctly sized canvas.
    if(canvas.width!==backingW || canvas.height!==backingH) {
      canvas.width=backingW;canvas.height=backingH;
    }
    width=w;height=h;ctx.setTransform(ratio,0,0,ratio,0,0);
    const mobile=width<650;
    pitch=Math.max(mobile?3.7:4.2,Math.min(width,1800)/275);
    const landscapeWidth=Math.min(width,1800),left=(width-landscapeWidth)/2;
    const yMap=v=>mobile ? .27+v*.61 : v;
    points=[];
    for(let py=pitch/2;py<height*.93;py+=pitch)for(let px=pitch/2;px<width;px+=pitch) {
      const x=(px-left)/landscapeWidth,y=py/height;
      if(x<-.05 || x>1.05)continue;
      const noise=hash(Math.round(px/pitch),Math.round(py/pitch));
      let point=null;
      for(let layer=0;layer<3;layer++) {
        const top=yMap(ridge(profiles[layer],x));
        const base=yMap([.825,.86,.90][layer]);
        if(y<top || y>base)continue;
        const depth=(y-top)/(base-top),edge=Math.exp(-(y-top)*height/(pitch*1.8));
        // Slanting folds give volume without drawing connecting lines or faces.
        const folds=Math.sin(x*64+depth*4.8+Math.sin(x*27)*2.3);
        const fine=Math.sin(x*171-depth*8)*.12;
        const facet=clamp(.46+folds*.32+fine+noise*.13);
        const foot=smooth((1-depth)/.22);
        const side=smooth((x+.02)/.09)*smooth((1.02-x)/.09);
        const intensity=(.22+facet*.68+edge*.35)*foot*side*(layer===0?.44:layer===2?.72:1);
        if(noise<(layer===0?.09:.035))continue;
        const role=Math.round(clamp(facet*.76+edge*.30)*6);
        point={x:px,y:py,u:x,v:y,role,alpha:clamp(intensity,.03,.95),edge,phase:noise*TAU,layer};
      }
      if(point)points.push(point);
      // Short, broken horizontal bands of the same LEDs suggest reflected light.
      else if(y>yMap(.865) && y<yMap(.94)) {
        const d=(y-yMap(.865))/(yMap(.94)-yMap(.865));
        const band=Math.sin(d*46+x*9+Math.sin(x*24)*.8);
        if(band>.35 && noise>.28)points.push({x:px,y:py,u:x,v:y,role:2,
          alpha:(1-d)*(.06+noise*.13),edge:0,phase:noise*TAU,layer:3});
      }
    }
    makeSprites();draw(elapsed);sync();
  }
  function draw(time) {
    if(!width || !height || !sprites.length)return;
    ctx.clearRect(0,0,width,height);
    const wave=(time*.052)%1.5-.2;
    const size=pitch*1.13;
    for(const p of points) {
      const breath=reduced.matches?1:.88+.12*Math.sin(time*.75+p.phase*.35);
      const distance=p.u-wave+p.v*.10;
      const traveling=reduced.matches?0:Math.exp(-distance*distance/.006)*(.10+p.edge*.22);
      let waking=0;
      if(hit && pointerLevel>.005) {
        const dx=p.x-hit.x,dy=p.y-hit.y;
        const radius=Math.max(70,Math.min(width,height)*.20);
        waking=Math.exp(-(dx*dx+dy*dy)/(radius*radius))*.52*pointerLevel;
      }
      if(pulse) {
        const age=time-pulse.time,dx=p.x-pulse.x,dy=p.y-pulse.y;
        const ring=(Math.hypot(dx,dy)-age*180)/38;
        waking+=Math.exp(-ring*ring)*Math.max(0,1-age/2.6)*.48;
      }
      const alpha=clamp(p.alpha*breath+traveling+waking,0,.98);
      ctx.globalAlpha=alpha;
      const role=Math.min(6,p.role+Math.round(waking*4));
      ctx.drawImage(sprites[role],p.x-size/2,p.y-size/2,size,size);
    }
    ctx.globalAlpha=1;
  }
  function active() {
    return onScreen && shown && !document.hidden && (!parentSection || parentSection.classList.contains('on'));
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
      if(pulse && elapsed-pulse.time>2.6)pulse=null;
      draw(elapsed);
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    if(frame)cancelAnimationFrame(frame);
    frame=0;lastFrame=0;
    if(!active())return;
    draw(reduced.matches?6:elapsed);
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
  hero.addEventListener('pointerdown',event=>{
    const p=position(event);
    if(reduced.matches) {hit=p;pointerLevel=1;draw(6);return;}
    pulse={...p,time:elapsed};
  },{passive:true});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
  new MutationObserver(()=>{makeSprites();sync();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(parentSection)new MutationObserver(sync).observe(parentSection,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',()=>{aim=null;hit=null;pointerLevel=0;pulse=null;sync();});
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio:language',label);
  addEventListener('pagehide',()=>{shown=false;sync();});
  addEventListener('pageshow',()=>{shown=true;sync();});
  label();resize();
})();
