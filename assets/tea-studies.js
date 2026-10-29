/* Slow native horizontal drift; no wheel/touch interception or image squeezing. */
(() => {
  'use strict';
  const wall = document.querySelector('[data-tea-sketch-wall]');
  if (!wall) return;
  const toggle = document.querySelector('[data-tea-flow-toggle]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches, visible = false, focused = false, modal = false, last = 0, raf = 0;
  const lanes = [...wall.querySelectorAll('[data-tea-flow-lane]')].map(element => {
    const group = element.querySelector('.tea-sketch-group');
    const repeat = group.cloneNode(true);
    repeat.dataset.flowRepeat = ''; repeat.setAttribute('aria-hidden','true');
    repeat.querySelectorAll('button').forEach(button => button.tabIndex = -1);
    element.querySelector('.tea-sketch-track').append(repeat);
    return {element,group,reverse:element.hasAttribute('data-flow-reverse'),span:0,position:0};
  });
  function label() {
    toggle.setAttribute('aria-pressed',String(paused));
    const english = document.documentElement.lang.startsWith('en');
    toggle.disabled = reduce.matches;
    toggle.textContent = reduce.matches ? (english ? 'Static view' : '静态浏览') : paused ? (english ? 'Resume flow' : '继续流动') : (english ? 'Pause flow' : '暂停流动');
    wall.dataset.paused = String(paused);
  }
  function measure() {
    lanes.forEach(lane => {
      lane.span = lane.group.getBoundingClientRect().width + parseFloat(getComputedStyle(lane.group.parentElement).gap);
      lane.element.scrollLeft = lane.reverse && !reduce.matches ? lane.span : 0;
      lane.position = lane.element.scrollLeft;
    });
  }
  function active() {return visible && !paused && !reduce.matches && !document.hidden && !focused && !modal;}
  function tick(time) {
    raf = 0;
    if (!active()) {last = 0; return;}
    const dt = last ? Math.min((time-last)/1000,.05) : 0; last = time;
    lanes.forEach(lane => {
      if (!lane.span || lane.span <= lane.element.clientWidth) return;
      lane.position += (lane.reverse ? -1 : 1) * 20 * dt;
      if (lane.position < 0) lane.position += lane.span;
      if (lane.position >= lane.span) lane.position -= lane.span;
      lane.element.scrollLeft = lane.position;
    });
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    if (active()) raf = requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{paused=!paused;lanes.forEach(lane=>lane.position=lane.element.scrollLeft);label();sync();});
  wall.addEventListener('pointerdown',()=>{paused=true;label();sync();});
  wall.addEventListener('focusin',()=>{focused=true;sync();});
  wall.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=wall.contains(document.activeElement);lanes.forEach(lane=>lane.position=lane.element.scrollLeft);sync();});});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(wall);
  new MutationObserver(()=>{modal=!!document.querySelector('dialog[open]');sync();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',sync);
  addEventListener('resize',()=>{measure();sync();},{passive:true});
  addEventListener('portfolio:language',label);
  reduce.addEventListener('change',()=>{paused=reduce.matches;label();measure();sync();});
  addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
  addEventListener('pageshow',sync);
  measure(); label();
})();
