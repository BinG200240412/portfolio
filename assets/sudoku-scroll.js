/* One canvas: cropped cover -> complete board -> ordinary document flow. */
(() => {
  'use strict';
  const opening=document.querySelector('.sudoku-opening');
  const board=opening?.querySelector('.sudoku-board-angle');
  const intro=opening?.querySelector('.sudoku-intro');
  const dock=intro?.querySelector('.sudoku-board-dock');
  const viewer=document.getElementById('media-viewer');
  // Native chapter snapping shares the document scroller with ScrollTrigger;
  // it never intercepts wheel/touch input or pins the board in a second scroller.
  if(opening){
    const root=document.documentElement;
    root.classList.add('sudoku-snap');
    const syncSnap=()=>root.classList.toggle('sudoku-snap-suspended',Boolean(viewer?.open));
    if(viewer)new MutationObserver(syncSnap).observe(viewer,{attributes:true,attributeFilter:['open']});
    syncSnap();
  }
  const {gsap,ScrollTrigger}=window;
  if(!opening||!board||!dock||!gsap||!ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  let host=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const media=gsap.matchMedia();
  media.add({motion:'(prefers-reduced-motion: no-preference)',
    reduced:'(prefers-reduced-motion: reduce)',forced:'(forced-colors: active)'},context=>{
    if(context.conditions.forced)return;
    let geometry,animation,refreshFrame=0,disposed=false,pageShown=true,onScreen=true,wasActive;
    const measure=()=>{
      const origin=opening.getBoundingClientRect(),target=dock.getBoundingClientRect();
      const size=board.clientWidth;
      // Read the untransformed layout origin. The canvas backing size never
      // changes while scrolling, even when the complete board becomes small.
      geometry={scale:target.width/size,
        x:target.left-origin.left+target.width/2-board.offsetLeft-size/2,
        y:target.top-origin.top+target.height/2-board.offsetTop-size/2};
    };
    const active=()=>pageShown&&onScreen&&!document.hidden&&!viewer?.open&&(!host||host.classList.contains('on'));
    const placeQuietly=()=>gsap.set(board,{x:geometry.x,y:geometry.y,scale:geometry.scale,rotation:0});
    measure();
    if(context.conditions.reduced)placeQuietly();
    else animation=gsap.fromTo(board,{x:0,y:0,rotation:-22,scale:1,transformOrigin:'50% 50%'},{
      x:()=>geometry.x,y:()=>geometry.y,rotation:0,scale:()=>geometry.scale,
      ease:'power1.inOut',duration:1,
      scrollTrigger:{trigger:opening,start:'top top',endTrigger:intro,end:'top top',
        scrub:.2,invalidateOnRefresh:true,onRefreshInit:measure,
        onToggle:self=>{board.style.willChange=self.isActive?'transform':'';}}
    });
    const sync=()=>{
      const enabled=active();
      if(enabled===wasActive)return;
      wasActive=enabled;
      if(animation){
        if(enabled){animation.scrollTrigger.enable(false,true);animation.progress(animation.scrollTrigger.progress);}
        else animation.scrollTrigger.disable(false);
      }else if(enabled){measure();placeQuietly();}
    };
    const refresh=()=>{
      if(disposed||refreshFrame||!active())return;
      refreshFrame=requestAnimationFrame(()=>{
        refreshFrame=0;
        if(disposed||!active())return;
        if(animation)animation.scrollTrigger.refresh();
        else{measure();placeQuietly();}
      });
    };
    const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(refresh):null;
    sizeObserver?.observe(opening);sizeObserver?.observe(dock);
    const viewObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      onScreen=entries.some(entry=>entry.isIntersecting);sync();
    }):null;
    viewObserver?.observe(opening);
    const hostObserver=host?new MutationObserver(sync):null;
    hostObserver?.observe(host,{attributes:true,attributeFilter:['class']});
    if(hostObserver)window.PortfolioLifecycle?.trackParent(hostObserver,host,{attributes:true,attributeFilter:['class']});
    const viewerObserver=viewer?new MutationObserver(sync):null;
    viewerObserver?.observe(viewer,{attributes:true,attributeFilter:['open']});
    const hide=()=>{pageShown=false;sync();};
    const show=()=>{pageShown=true;sync();refresh();};
    document.addEventListener('visibilitychange',sync);
    addEventListener('pagehide',hide);addEventListener('pageshow',show);
    addEventListener('portfolio:language',refresh);
    addEventListener('resize',refresh,{passive:true});
    document.fonts?.ready.then(refresh);
    sync();
    return()=>{
      disposed=true;cancelAnimationFrame(refreshFrame);
      sizeObserver?.disconnect();viewObserver?.disconnect();hostObserver?.disconnect();viewerObserver?.disconnect();
      if(hostObserver)window.PortfolioLifecycle?.forgetParent(hostObserver);
      document.removeEventListener('visibilitychange',sync);
      removeEventListener('pagehide',hide);removeEventListener('pageshow',show);
      removeEventListener('portfolio:language',refresh);removeEventListener('resize',refresh);
      board.style.willChange='';
    };
  });
})();
