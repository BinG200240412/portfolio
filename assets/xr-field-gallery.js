/* Three compact photo rows. All originals remain keyboard-accessible and zoomable. */
(() => {
  'use strict';
  const page=document.getElementById('exhibition'),gallery=page?.querySelector('.gogo-field-motion');
  if(!gallery)return;
  const rows=[...gallery.querySelectorAll('.gogo-field-row')],toggle=gallery.querySelector('.gogo-field-toggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  let visible=false,shown=true,paused=false,host=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  function label(){
    const zh=document.documentElement.lang.startsWith('zh');
    toggle.setAttribute('aria-label',paused?(zh?'继续现场图片移动':'Resume on-site photo movement'):(zh?'暂停现场图片移动':'Pause on-site photo movement'));
    toggle.setAttribute('aria-pressed',String(paused));
  }
  function sync(){
    const focused=rows.some(row=>row.contains(document.activeElement));
    const running=visible&&shown&&!document.hidden&&!paused&&!focused&&!document.querySelector('dialog[open]')&&!reduced.matches&&!forced.matches&&(!host||host.classList.contains('on'));
    gallery.classList.toggle('is-field-running',running);
    gallery.dataset.motion=reduced.matches||forced.matches?'static':running?'running':'paused';
    label();
  }
  function clone(original,track){
    const copy=original.cloneNode(true);copy.removeAttribute('data-field-original');copy.dataset.fieldClone='';copy.setAttribute('aria-hidden','true');
    copy.querySelectorAll('button').forEach((button,i)=>{
      const visual=document.createElement('span');visual.className='gogo-reel-visual';visual.append(...button.childNodes);
      visual.addEventListener('click',()=>original.querySelectorAll('button')[i].click());button.replaceWith(visual);
    });track.append(copy);
  }
  function resize(){
    const width=document.documentElement.clientWidth;
    gallery.style.setProperty('--field-width',`${width}px`);gallery.style.setProperty('--field-offset',`${-page.getBoundingClientRect().left}px`);
    rows.forEach((row,i)=>{
      const original=row.querySelector('[data-field-original]'),track=row.querySelector('.gogo-field-track'),period=original.getBoundingClientRect().width;
      if(!period)return;
      const duration=period/[15,13,17][i];row.style.setProperty('--field-period',`${period}px`);row.style.setProperty('--field-duration',`${duration}s`);row.style.setProperty('--field-delay',`${-duration*[0,.28,.12][i]}s`);
      const needed=Math.ceil(width/period)+1;
      while(track.children.length<needed)clone(original,track);
      while(track.children.length>needed)track.lastElementChild.remove();
    });
  }
  toggle.addEventListener('click',()=>{paused=!paused;sync();});
  rows.forEach(row=>{
    row.addEventListener('focusin',()=>{row.classList.add('is-field-browsing');sync();});
    row.addEventListener('focusout',()=>requestAnimationFrame(()=>{
      if(!row.contains(document.activeElement)){row.classList.remove('is-field-browsing');row.scrollLeft=0;}sync();
    }));
  });
  new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:.01}).observe(gallery);
  const sizes=new ResizeObserver(resize);sizes.observe(page);rows.forEach(row=>sizes.observe(row.querySelector('[data-field-original]')));
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  if(host){const parentObserver=new MutationObserver(sync);parentObserver.observe(host,{attributes:true,attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,host,{attributes:true,attributeFilter:['class']});}
  document.addEventListener('visibilitychange',sync);document.addEventListener('portfolio:video-detail',sync);
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});
  document.fonts.ready.then(resize);resize();sync();
})();
