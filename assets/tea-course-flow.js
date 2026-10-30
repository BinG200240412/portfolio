/* A compact native horizontal photo strip; no scroll input is intercepted. */
(() => {
  'use strict';
  const lane=document.querySelector('[data-tea-course-flow]');
  if(!lane)return;
  const toggle=document.querySelector('[data-tea-course-toggle]');
  const group=lane.querySelector('.tea-course-group');
  const repeat=group.cloneNode(true);
  repeat.dataset.flowRepeat='';repeat.setAttribute('aria-hidden','true');
  repeat.querySelectorAll('button').forEach(b=>b.tabIndex=-1);
  lane.querySelector('.tea-course-track').append(repeat);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false,visible=false,focused=false,span=0,position=0,last=0,frame=0;
  function label(){
    const en=document.documentElement.lang.startsWith('en');
    toggle.disabled=reduced.matches;
    toggle.setAttribute('aria-pressed',String(paused||reduced.matches));
    toggle.textContent=reduced.matches?(en?'Static view':'静态浏览'):paused?(en?'Resume flow':'继续流动'):(en?'Pause flow':'暂停流动');
    lane.dataset.paused=String(paused||reduced.matches);
  }
  function active(){return visible&&!paused&&!reduced.matches&&!focused&&!document.hidden&&!document.querySelector('dialog[open]');}
  function tick(time){
    frame=0;if(!active()){last=0;return;}
    const dt=last?Math.max(0,Math.min(.05,(time-last)/1000)):0;last=time;
    if(span>lane.clientWidth){position=(position+18*dt)%span;lane.scrollLeft=position;}
    lane.dataset.position=position.toFixed(2);
    frame=requestAnimationFrame(tick);
  }
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(active())frame=requestAnimationFrame(tick);}
  function measure(){span=group.getBoundingClientRect().width+parseFloat(getComputedStyle(group.parentElement).gap);position=span?lane.scrollLeft%span:0;lane.scrollLeft=position;sync();}
  function remember(){position=span?lane.scrollLeft%span:0;}
  toggle.addEventListener('click',()=>{paused=!paused;remember();label();sync();});
  lane.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){paused=true;label();sync();}});
  lane.addEventListener('focusin',()=>{focused=true;sync();});
  lane.addEventListener('focusout',()=>queueMicrotask(()=>{focused=lane.contains(document.activeElement);remember();sync();}));
  lane.addEventListener('scroll',()=>{if(!active())remember();},{passive:true});
  new ResizeObserver(measure).observe(group);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;sync();},{threshold:0}).observe(lane);
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  new MutationObserver(()=>{label();measure();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  reduced.addEventListener('change',()=>{label();measure();});
  document.addEventListener('visibilitychange',sync);
  addEventListener('resize',measure,{passive:true});
  addEventListener('portfolio:language',label);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
  addEventListener('pageshow',sync);
  document.fonts.ready.then(measure);label();measure();
})();
