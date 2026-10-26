/* Mount the supplied contours as actual SVG so theme and reveal states reach every path. */
(() => {
 'use strict';
 const root=document.getElementById('interaction-analysis');if(!root)return;
 let visible=false,host=null;
 try{host=window.frameElement?.closest('#section')||null;}catch(_){}
 const sync=()=>root.classList.toggle('is-interaction-active',visible&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on')));
 Promise.all([...root.querySelectorAll('[data-svg-src]')].map(async mount=>{
  const response=await fetch(mount.dataset.svgSrc);if(!response.ok)throw new Error('Interaction vector unavailable');
  const documentSvg=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  const svg=documentSvg.documentElement;if(svg.localName!=='svg')throw new Error('Invalid interaction vector');
  svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');
  svg.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));svg.removeAttribute('aria-labelledby');
  mount.append(document.importNode(svg,true));
 })).then(()=>{root.dataset.traceReady='true';if(visible)requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('is-interaction-revealed')));}).catch(()=>{root.dataset.traceReady='error';});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&root.dataset.traceReady==='true')root.classList.add('is-interaction-revealed');sync();},{threshold:.12}).observe(root);
 document.addEventListener('visibilitychange',sync);
 new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
})();
