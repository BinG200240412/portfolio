/* Mount the independently authored components and replay their assembly. */
(() => {
 'use strict';
 const root=document.getElementById('interaction-analysis');if(!root)return;
 let visible=false,host=null,run=0;
 try{host=window.frameElement?.closest('#section')||null;}catch(_){}
 const sync=()=>root.classList.toggle('is-interaction-active',visible&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on')));
 function reveal(replay=false){
  if(root.dataset.traceReady!=='true'||!visible)return;
  if(root.classList.contains('is-interaction-revealed')&&!replay)return;
  if(replay){root.classList.remove('is-interaction-revealed');void root.offsetWidth;}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{root.classList.add('is-interaction-revealed');root.dataset.sceneRun=String(++run);}));
 }
 Promise.all([...root.querySelectorAll('[data-svg-src]')].map(async (mount,index)=>{
  const response=await fetch(mount.dataset.svgSrc);if(!response.ok)throw new Error('Interaction vector unavailable');
  const documentSvg=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  const svg=documentSvg.documentElement;if(svg.localName!=='svg')throw new Error('Invalid interaction vector');
  // Keep gradient and clip references local to each mounted SVG.
  const ids=new Map([...svg.querySelectorAll('[id]')].map(e=>[e.id,`gogo-scene-${index}-${e.id}`]));
  for(const element of [svg,...svg.querySelectorAll('*')])for(const name of element.getAttributeNames()){
   let value=element.getAttribute(name);
   if(name==='id')value=ids.get(value)||value;
   else{
    value=value.replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${ids.get(id)||id})`);
    if((name==='href'||name==='xlink:href')&&value.startsWith('#'))value='#'+(ids.get(value.slice(1))||value.slice(1));
   }
   element.setAttribute(name,value);
  }
  svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');svg.removeAttribute('aria-label');
  mount.append(document.importNode(svg,true));
 })).then(()=>{root.dataset.traceReady='true';root.dataset.sceneComponents=String(root.querySelectorAll('[data-component]').length);reveal();}).catch(()=>{root.dataset.traceReady='error';});
 root.querySelector('.gi-replay')?.addEventListener('click',()=>reveal(true));
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reveal();sync();},{threshold:.12}).observe(root);
 document.addEventListener('visibilitychange',sync);
 new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
})();
