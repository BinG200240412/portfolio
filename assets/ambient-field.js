/* Ambient dust, separate from the portfolio's object matrix.
 * Mount <canvas id="ambient-page" aria-hidden="true"> directly under body,
 * and <canvas id="ambient-stage" aria-hidden="true"> as the first stage child.
 * Tuning: CONFIG.fps (<=15), areaPerParticle, maxMobile/maxDesktop, flowSpeed,
 * darkAlpha/lightAlpha. Points have solid .84–1.4 CSS px diameters; no glow.
 * Debug: PortfolioAmbient.status() reports active canvas, density and RAF state.
 * No random refresh, extra animation loops, timers, interactions or dependencies.
 */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const about = document.getElementById('resume');
  const section = document.getElementById('section');
  const targets = ['page','stage'].map(name => {
    const canvas = document.getElementById(`ambient-${name}`);
    const context = canvas?.getContext('2d',{alpha:true});
    return context ? {name,canvas,context,width:0,height:0,particles:[]} : null;
  }).filter(Boolean);
  if (!stage || !targets.length) return;

  const CONFIG = Object.freeze({
    fps:15, areaPerParticle:2400, minParticles:180,
    maxMobile:360, maxDesktop:700, mobileBreakpoint:700,
    reducedFraction:.34, flowSpeed:2.5,
    darkAlpha:Object.freeze([.05,.18]), lightAlpha:Object.freeze([.035,.105]),
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const TAU = Math.PI * 2;
  let frame=0,lastPaint=0,elapsed=0,pageShown=true,active=null;
  let dark=document.documentElement.dataset.theme!=='light';

  function random(seed) {
    let state=seed>>>0;
    return () => {
      state+=0x6D2B79F5;
      let n=state;
      n=Math.imul(n^n>>>15,n|1); n^=n+Math.imul(n^n>>>7,n|61);
      return ((n^n>>>14)>>>0)/4294967296;
    };
  }
  function particles(count) {
    const next=random(0xA81E2026);
    return Array.from({length:count},()=>({
      x:next(),y:next(),phase:next()*TAU,
      speed:.55+next()*.9,radius:.42+next()*.28,ink:.5+next()*.5,
    }));
  }
  function clear(target) {
    target.context.clearRect(0,0,target.width,target.height);
    target.canvas.hidden=true;
  }
  function mode() {
    if (!pageShown || document.hidden || forced.matches || section?.classList.contains('on')) return null;
    if (about?.classList.contains('live')) return 'page';
    return stage.classList.contains('gone') || stage.classList.contains('faded') ? null : 'stage';
  }
  const wrap=(value,span)=>((value%span)+span)%span;
  function paint(target,time,still=false) {
    const {context:ctx,width:w,height:h}=target;
    if (!w || !h) return;
    target.canvas.hidden=false; ctx.clearRect(0,0,w,h);
    const alpha=dark?CONFIG.darkAlpha:CONFIG.lightAlpha;
    ctx.fillStyle=dark?'rgb(192,190,177)':'rgb(77,92,83)';
    const count=still?Math.ceil(target.particles.length*CONFIG.reducedFraction):target.particles.length;
    for (let i=0;i<count;i++) {
      const p=target.particles[i];
      // A stable irregular scatter drifts through broad, overlapping pressure
      // bands. Their slow field modulates whole-dot opacity, never point size.
      const x=wrap(p.x*w+time*CONFIG.flowSpeed*p.speed+Math.sin(time*.035+p.phase)*9,w+4)-2;
      const y=wrap(p.y*h+time*.12+Math.sin(time*.026+p.phase)*11,h+4)-2;
      const a=Math.sin(x/Math.max(w,1)*TAU*.85+y/Math.max(h,1)*2.1-time*.034);
      const b=Math.sin(y/Math.max(h,1)*TAU*1.1-x/Math.max(w,1)*1.5+time*.022);
      const cloud=Math.pow(Math.max(0,Math.min(1,.5+a*.29+b*.21)),1.65);
      ctx.globalAlpha=alpha[0]+(alpha[1]-alpha[0])*cloud*p.ink;
      ctx.beginPath(); ctx.arc(x,y,p.radius,0,TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function choose() {
    const name=mode(),next=targets.find(target=>target.name===name)||null;
    if (next!==active) {
      for (const target of targets) clear(target);
      active=next;
    }
    return active;
  }
  function tick(now) {
    frame=0;
    if (!choose() || reduced.matches) return;
    if (!lastPaint || now-lastPaint>=1000/CONFIG.fps) {
      if (lastPaint) elapsed+=Math.min(.2,(now-lastPaint)/1000);
      lastPaint=now; paint(active,elapsed);
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame=0; lastPaint=0;
    if (!choose()) {for (const target of targets) clear(target);return;}
    paint(active,reduced.matches?14:elapsed,reduced.matches);
    if (!reduced.matches) frame=requestAnimationFrame(tick);
  }
  function resize() {
    const ratio=Math.min(devicePixelRatio||1,2);
    for (const target of targets) {
      target.width=target.name==='stage'?stage.clientWidth:innerWidth;
      target.height=target.name==='stage'?stage.clientHeight:innerHeight;
      const {width:w,height:h}=target;
      target.canvas.width=Math.max(1,Math.round(w*ratio));
      target.canvas.height=Math.max(1,Math.round(h*ratio));
      target.context.setTransform(ratio,0,0,ratio,0,0);
      const cap=w<CONFIG.mobileBreakpoint?CONFIG.maxMobile:CONFIG.maxDesktop;
      const count=Math.min(cap,Math.max(CONFIG.minParticles,Math.round(w*h/CONFIG.areaPerParticle)));
      target.particles=particles(count);
    }
    sync();
  }
  const states=new MutationObserver(sync);
  for (const element of [stage,about,section]) if(element)
    states.observe(element,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{dark=document.documentElement.dataset.theme!=='light';sync();})
    .observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  new ResizeObserver(resize).observe(stage);
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); forced.addEventListener('change',sync);
  addEventListener('pagehide',()=>{pageShown=false;sync();});
  addEventListener('pageshow',()=>{pageShown=true;sync();});
  window.PortfolioAmbient=Object.freeze({config:CONFIG,status:()=>({
    active:active?.name||null,particles:active?.particles.length||0,
    drawn:active?Math.ceil(active.particles.length*(reduced.matches?CONFIG.reducedFraction:1)):0,
    elapsed,animating:!!frame,reduced:reduced.matches,theme:dark?'dark':'light',
  })});
  resize();
})();
