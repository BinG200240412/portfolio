/* One repeating image strip. Leave the stage quiet when it cannot be seen. */
(() => {
  'use strict';
  const page=document.querySelector('.gogo-technical-page');
  if(!page)return;
  const reel=page.querySelector('.gogo-technical-reel');
  const track=page.querySelector('.gogo-technical-track');
  const original=page.querySelector('.gogo-technical-set');
  const toggle=page.querySelector('.gogo-reel-toggle');
  const dialog=document.getElementById('gogo-lightbox');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const forced=matchMedia('(forced-colors: active)');
  let onScreen=false,shown=true,paused=false,focused=false,host=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}

  function label(){
    const zh=document.documentElement.lang.startsWith('zh');
    toggle.setAttribute('aria-label',paused?(zh?'继续图片移动':'Resume image movement'):(zh?'暂停图片移动':'Pause image movement'));
    toggle.setAttribute('aria-pressed',String(paused));
  }
  function sync(){
    const visible=onScreen&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));
    const running=visible&&!paused&&!focused&&!reduced.matches&&!forced.matches;
    page.classList.toggle('is-technical-running',running);
    page.classList.toggle('is-technical-browsing',focused);
    page.dataset.reelMotion=reduced.matches||forced.matches?'static':running?'running':'paused';
    label();
  }
  function clone(){
    const copy=original.cloneNode(true);
    copy.dataset.reelClone='';copy.setAttribute('aria-hidden','true');
    copy.querySelectorAll('button').forEach(button=>{
      const visual=document.createElement('span');
      visual.className='gogo-reel-visual';
      visual.append(...button.childNodes);
      visual.addEventListener('click',()=>{
        const index=[...copy.children].indexOf(visual.closest('figure'));
        original.children[index].querySelector('button').click();
      });
      button.replaceWith(visual);
    });
    track.append(copy);
  }
  function resize(){
    const width=document.documentElement.clientWidth,left=page.getBoundingClientRect().left;
    reel.style.setProperty('--reel-width',`${width}px`);
    reel.style.setProperty('--reel-offset',`${-left}px`);
    const period=original.getBoundingClientRect().width;
    if(!period)return;
    reel.style.setProperty('--reel-period',`${period}px`);
    reel.style.setProperty('--reel-duration',`${period/24}s`);
    const needed=Math.ceil(width/period)+1;
    while(track.children.length<needed)clone();
    while(track.children.length>needed)track.lastElementChild.remove();
  }
  toggle.addEventListener('click',()=>{paused=!paused;sync();});
  reel.addEventListener('focusin',()=>{focused=true;sync();});
  reel.addEventListener('focusout',()=>{
    requestAnimationFrame(()=>{focused=reel.contains(document.activeElement);sync();});
  });
  new IntersectionObserver(entries=>{
    onScreen=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.01);sync();
  },{threshold:.01}).observe(page);
  new ResizeObserver(resize).observe(page);
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host){const parentObserver=new MutationObserver(sync);parentObserver.observe(host,{attributes:true,attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,host,{attributes:true,attributeFilter:['class']});}
  new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  addEventListener('pagehide',()=>{shown=false;sync();});
  addEventListener('pageshow',()=>{shown=true;sync();});
  document.fonts.ready.then(resize);resize();sync();
})();
