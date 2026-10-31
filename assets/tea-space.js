/* Spatial route growth and a single, original-image rendering strip. */
(() => {
  'use strict';
  const root=document.querySelector('.tea-space-chapter');if(!root)return;
  const map=root.querySelector('[data-tea-space-map]'),lane=root.querySelector('[data-tea-space-flow]');
  const toggle=root.querySelector('[data-space-flow-toggle]'),replay=root.querySelector('[data-space-replay]');
  const group=lane.querySelector('.tea-space-group'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let repeat,observer,near,resize,dialogs,language,disposed=false,visible=false,mapVisible=false,paused=false,focused=false,pressed=false,span=0,position=0,last=0,frame=0,drawn=false;
  const en=()=>document.documentElement.lang.startsWith('en');
  const motionAllowed=()=>!document.hidden&&!document.querySelector('dialog[open]');
  function label(){toggle.disabled=reduced.matches;toggle.setAttribute('aria-pressed',String(paused||reduced.matches));toggle.textContent=reduced.matches?(en()?'Static view':'静态浏览'):paused?(en()?'Resume flow':'继续流动'):(en()?'Pause flow':'暂停流动');replay.disabled=reduced.matches;}
  function active(){return !disposed&&visible&&!paused&&!focused&&!pressed&&!reduced.matches&&motionAllowed();}
  function grow(){if(disposed)return;map.classList.remove('is-grown');void map.offsetWidth;map.classList.add('is-grown');map.dataset.growth=reduced.matches?'static':'growing';drawn=true;}
  function tick(time){frame=0;if(!active()){last=0;return;}const dt=last?Math.max(0,Math.min(.05,(time-last)/1000)):0;last=time;if(span>lane.clientWidth){position=(position+18*dt)%span;lane.scrollLeft=position;}lane.dataset.position=position.toFixed(2);frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;const moving=active();lane.dataset.paused=String(!moving);root.classList.toggle('space-motion-paused',!mapVisible||!motionAllowed());if(moving)frame=requestAnimationFrame(tick);}
  function measure(){span=group.getBoundingClientRect().width+parseFloat(getComputedStyle(group.parentElement).gap);position=span?lane.scrollLeft%span:0;lane.scrollLeft=position;sync();}
  function remember(){position=span?lane.scrollLeft%span:0;}
  function initFlow(){
    if(repeat)return;repeat=group.cloneNode(true);repeat.dataset.flowRepeat='';repeat.setAttribute('aria-hidden','true');repeat.querySelectorAll('button').forEach(b=>b.tabIndex=-1);lane.querySelector('.tea-space-track').append(repeat);lane.querySelectorAll('img').forEach(img=>img.loading='eager');measure();
  }
  toggle.addEventListener('click',()=>{paused=!paused;remember();label();sync();});
  replay.addEventListener('click',()=>{grow();sync();});
  root.querySelectorAll('[data-space-behavior]').forEach(item=>{
    const show=()=>{map.dataset.highlight=item.dataset.spaceBehavior;map.querySelector(`[data-space-route="${item.dataset.spaceBehavior}"]`).classList.add('is-highlighted');};
    const hide=()=>{delete map.dataset.highlight;map.querySelectorAll('.is-highlighted').forEach(el=>el.classList.remove('is-highlighted'));};
    item.addEventListener('pointerenter',show);item.addEventListener('pointerleave',hide);item.addEventListener('focusin',show);item.addEventListener('focusout',hide);
  });
  lane.addEventListener('pointerdown',()=>{pressed=true;sync();});
  function release(){if(!pressed)return;pressed=false;remember();sync();}
  addEventListener('pointerup',release);addEventListener('pointercancel',release);
  lane.addEventListener('focusin',()=>{focused=true;sync();});
  lane.addEventListener('focusout',()=>queueMicrotask(()=>{focused=lane.contains(document.activeElement);remember();sync();}));
  lane.addEventListener('scroll',()=>{if(!active())remember();},{passive:true});
  observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.target===lane)visible=e.isIntersecting;else{mapVisible=e.isIntersecting;if(mapVisible&&!drawn)grow();}}sync();},{threshold:.12});observer.observe(map);observer.observe(lane);
  near=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){initFlow();near.disconnect();}},{rootMargin:'600px'});near.observe(lane);
  resize=new ResizeObserver(measure);resize.observe(group);
  dialogs=new MutationObserver(sync);dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  language=new MutationObserver(()=>{label();measure();});language.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  function preference(){label();if(reduced.matches){map.dataset.growth='static';}sync();}
  reduced.addEventListener('change',preference);document.addEventListener('visibilitychange',sync);
  function pagehide(e){cancelAnimationFrame(frame);frame=0;if(!e.persisted)dispose();}
  function dispose(){if(disposed)return;disposed=true;root.classList.add('space-motion-paused');lane.dataset.paused='true';cancelAnimationFrame(frame);observer.disconnect();near.disconnect();resize.disconnect();dialogs.disconnect();language.disconnect();reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',sync);removeEventListener('pointerup',release);removeEventListener('pointercancel',release);removeEventListener('pageshow',sync);removeEventListener('pagehide',pagehide);}
  addEventListener('pagehide',pagehide);addEventListener('pageshow',sync);window.PortfolioLifecycle?.onDispose(dispose);
  label();measure();
})();
