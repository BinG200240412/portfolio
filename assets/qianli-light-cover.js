/* A landscape made from the same discrete, round LEDs as the home page.
 * Mountain profiles and folds are geometry, with no image source.
 * The lattice stays still: only the light travels. No per-frame layout reads.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('qianli-light-cover');
  const ctx = canvas?.getContext('2d', {alpha:true});
  const hero = canvas?.closest('.qianli-light-hero');
  if (!ctx || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, FPS = 30, RIPPLE_LIFE=4.8;
  const profiles = [
    [[-.08,.70],[.02,.62],[.10,.53],[.15,.60],[.22,.42],[.28,.34],[.33,.44],[.40,.62],[.46,.58],[.53,.43],[.59,.49],[.66,.39],[.72,.51],[.79,.60],[.86,.52],[.94,.64],[1.08,.61]],
    [[-.08,.74],[.01,.65],[.075,.49],[.13,.57],[.19,.64],[.24,.42],[.29,.29],[.32,.35],[.365,.56],[.41,.68],[.46,.64],[.51,.57],[.56,.64],[.605,.47],[.65,.36],[.69,.40],[.745,.57],[.80,.62],[.86,.68],[.94,.73],[1.08,.64]],
    [[-.08,.84],[.02,.77],[.09,.74],[.16,.82],[.24,.75],[.31,.77],[.39,.85],[.48,.80],[.55,.84],[.64,.72],[.70,.68],[.77,.75],[.83,.82],[.92,.79],[1.08,.84]],
  ];
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
  let width=0,height=0,pitch=5,points=[],sprites=[],glows=[],light=false;
  let frame=0,lastFrame=0,elapsed=0,onScreen=true,shown=true;
  let aim=null,hit=null,pointerLevel=0,pulses=[];
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
    const hint=hero.querySelector('.qianli-light-hint');
    if(hint)hint.textContent=english ? 'Touch anywhere to send ripples of light' : '点击任意位置，让光泛起涟漪';
    canvas.setAttribute('aria-label',english
      ? 'Touch the landscape to send ripples through the light beads. You can also press Enter or Space.'
      : '点击山水，让点阵光珠从触碰处泛起涟漪；也可按 Enter 或空格。');
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
    // The field fills the viewport at every size. Foreground foothills continue
    // below the fold, with no centred artboard or horizontal cutoff at the base.
    pitch=Math.max(mobile?3.8:4.8,Math.max(width,height)/300);
    // Portrait shows a close crop of the panorama, rather than squeezing the
    // entire mountain range into thin vertical spikes.
    const panorama=mobile ? Math.max(width,height*.9) : width,left=(width-panorama)/2;
    const yMap=v=>mobile ? (v-.08)*1.30 : (v-.12)*1.38;
    points=[];
    for(let py=pitch/2;py<height;py+=pitch)for(let px=pitch/2;px<width;px+=pitch) {
      const x=(px-left)/panorama,y=py/height;
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
        const foot=smooth((1-depth)/.12);
        const intensity=(.27+facet*.70+edge*.36)*foot*(layer===0?.55:layer===2?.86:1);
        if(noise<(layer===0?.09:.035))continue;
        const role=Math.round(clamp(facet*.76+edge*.30)*6);
        const vein=Math.sin(x*16+depth*2.2)+Math.cos(x*31-depth*4)*.35;
        let bank=layer===0 ? 3 : vein>.55 ? 1 : vein<-.55 ? 0 : 2;
        if(layer===1 && depth>.25 && vein<.25)bank=3;
        if(layer===2 && vein>.65 && noise>.62)bank=4;
        // Preserve quiet space behind the title without cutting a rectangle
        // out of the landscape; hills continue through the soft falloff.
        const titleQuiet=1-.70*Math.exp(-Math.pow((x-.15)/.23,4)-Math.pow((y-.17)/.16,4));
        const captionQuiet=.16+.84*smooth((1-y)/.22);
        point={x:px,y:py,u:x,v:y,role,bank,alpha:clamp(intensity*titleQuiet*captionQuiet,.02,.98),edge,phase:noise*TAU,layer};
      }
      // Unlit beads in the open sky let a touch anywhere reveal a complete
      // wavefront. They disappear again after the ripple has passed.
      points.push(point || {x:px,y:py,u:x,v:y,role:3,bank:1,alpha:0,edge:0,phase:noise*TAU,layer:4});
    }
    pulses=[];aim=null;hit=null;pointerLevel=0;makeSprites();sync();
  }
  function draw(time) {
    if(!width || !height || !sprites.length)return;
    ctx.clearRect(0,0,width,height);
    const wave=(time*.052)%1.5-.2;
    const size=pitch*1.13;
    const speed=Math.max(220,Math.max(width,height)*.30),band=Math.max(9,pitch*1.6),gap=Math.max(70,pitch*8);
    const ripples=pulses.map(p=>({...p,age:time-p.time,radius:(time-p.time)*speed,fade:smooth((RIPPLE_LIFE-(time-p.time))/1.3)}));
    for(const p of points) {
      const breath=reduced.matches?1:.88+.12*Math.sin(time*.75+p.phase*.35);
      const distance=p.u-wave+p.v*.10;
      const traveling=reduced.matches || p.layer===4 ? 0 : Math.exp(-distance*distance/.006)*(.08+p.edge*.17);
      let waking=0;
      if(hit && pointerLevel>.005) {
        const dx=p.x-hit.x,dy=p.y-hit.y;
        const radius=Math.max(56,Math.min(width,height)*.14);
        waking=Math.exp(-(dx*dx+dy*dy)/(radius*radius))*(p.layer===4?.14:.38)*pointerLevel;
      }
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
      if(p.layer===4 && waking<.012)continue;
      const alpha=clamp(p.alpha*breath+traveling+waking,0,.98);
      if(alpha<.012)continue;
      const role=Math.min(6,p.role+Math.round(waking*4));
      const index=p.bank*7+role;
      // Small light halos around the LEDs reinforce the travelling wave.
      // There is deliberately no canvas arc/stroke for the circular wavefront.
      const bloom=clamp(waking-.18)*.18+(p.edge>.65?.035:0);
      if(bloom>.025) {
        ctx.globalAlpha=bloom*(light?.20:1);
        ctx.drawImage(glows[index],p.x-size*1.2,p.y-size*1.2,size*2.4,size*2.4);
      }
      ctx.globalAlpha=alpha;
      ctx.drawImage(sprites[index],p.x-size/2,p.y-size/2,size,size);
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
      pulses=pulses.filter(p=>elapsed-p.time<RIPPLE_LIFE);
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
  function awaken(p) {
    if(reduced.matches) {hit=p;pointerLevel=1;draw(6);return;}
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
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
  new MutationObserver(()=>{makeSprites();sync();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(parentSection)new MutationObserver(sync).observe(parentSection,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',()=>{aim=null;hit=null;pointerLevel=0;pulses=[];sync();});
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio:language',label);
  addEventListener('pagehide',()=>{shown=false;sync();});
  addEventListener('pageshow',()=>{shown=true;sync();});
  label();resize();
})();
