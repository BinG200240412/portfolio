/* Mount authored components independently: a failed neighbour never hides a
 * completed scene. Source paths and their original assembly animations stay. */
(() => {
 'use strict';
 const root=document.getElementById('interaction-analysis');if(!root)return;
 const mounts=[...root.querySelectorAll('[data-svg-src]')];
 let visible=false,near=false,shown=true,host=null,run=0,revealFrame=0,revealNext=0;
 try{host=window.frameElement?.closest('#section')||null;}catch(_){}
 const activeDocument=()=>shown&&root.isConnected&&!document.hidden&&(!host||host.classList.contains('on'));
 const states=mounts.map((mount,index)=>{
  const shell=mount.closest('figure')||mount.parentElement;shell.classList.add('gi-source-shell');
  const zoom=mount.closest('button.gogo-zoom');
  const status=document.createElement('div');status.className='gi-source-status';status.hidden=true;status.setAttribute('data-i18n-ignore','');
  const retry=document.createElement('button');retry.type='button';retry.className='gi-source-retry';status.append(retry);shell.append(status);
  const state={mount,index,zoom,status,retry,phase:'idle',loaded:false,controller:null,timer:0};
  retry.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();load(state,true);});
  return state;
 });
 function labels(){
  const english=document.documentElement.lang.startsWith('en');
  states.forEach(state=>{
   state.retry.textContent=english?'Retry':'重试';
   const subject=state.zoom?.getAttribute('aria-label')||'';
   state.retry.setAttribute('aria-label',(english?'Reload diagram':'重新载入图示')+(subject?'：'+subject:''));
  });
 }
 function progress(){
  const loaded=states.filter(state=>state.loaded).length;
  const errors=states.filter(state=>state.phase==='error').length;
  root.dataset.traceReady=loaded===states.length?'true':loaded?'partial':errors?'error':states.some(state=>state.phase==='loading')?'loading':'waiting';
  root.dataset.sceneLoaded=String(loaded);root.dataset.sceneErrors=String(errors);
  root.dataset.sceneComponents=String(root.querySelectorAll('[data-component]').length);
  states.forEach(state=>{
   state.mount.dataset.sourceState=state.phase;
   state.mount.setAttribute('aria-busy',String(state.phase==='loading'));
   if(state.zoom)state.zoom.disabled=!state.loaded;
   state.status.hidden=state.phase!=='error';
  });
 }
 function cancelReveal(){cancelAnimationFrame(revealFrame);cancelAnimationFrame(revealNext);revealFrame=revealNext=0;}
 function reveal(replay=false){
  if(!states.some(state=>state.loaded)||!visible||!activeDocument())return;
  if(root.classList.contains('is-interaction-revealed')&&!replay)return;
  if(replay){cancelReveal();root.classList.remove('is-interaction-revealed');void root.offsetWidth;}
  if(revealFrame||revealNext)return;
  revealFrame=requestAnimationFrame(()=>{revealFrame=0;revealNext=requestAnimationFrame(()=>{
   revealNext=0;if(!visible||!activeDocument())return;
   root.classList.add('is-interaction-revealed');root.dataset.sceneRun=String(++run);
  });});
 }
 function abort(state){
  if(!state.controller)return;
  clearTimeout(state.timer);state.timer=0;
  const controller=state.controller;state.controller=null;state.phase='paused';controller.abort();
 }
 function sync(){
  const active=activeDocument();
  root.classList.toggle('is-interaction-active',visible&&active&&!document.querySelector('dialog[open]'));
  if(!active){cancelReveal();states.forEach(abort);progress();return;}
  if(near)states.filter(state=>state.phase==='idle'||state.phase==='paused').forEach(state=>load(state));
  reveal();
 }
 function localSVG(text,index){
  const parsed=new DOMParser().parseFromString(text,'image/svg+xml');
  const svg=parsed.documentElement;
  if(svg.localName!=='svg'||parsed.querySelector('parsererror'))throw new Error('Invalid interaction vector');
  // Keep gradients and clips local, preserving every original path and transform.
  const ids=new Map([...svg.querySelectorAll('[id]')].map(element=>[element.id,`gogo-scene-${index}-${element.id}`]));
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
  return document.importNode(svg,true);
 }
 async function load(state,manual=false){
  if(state.loaded||state.controller||!activeDocument()||(!near&&!manual))return;
  const controller=new AbortController();state.controller=controller;state.phase='loading';
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},10000);state.timer=timer;progress();
  try{
   const response=await fetch(state.mount.dataset.svgSrc,{signal:controller.signal});
   if(!response.ok)throw new Error('Interaction vector unavailable');
   const svg=localSVG(await response.text(),state.index);
   if(state.controller!==controller||!activeDocument())return;
   state.mount.append(svg);state.loaded=true;state.phase='ready';
   progress();reveal();
  }catch(error){
   if(state.controller!==controller)return;
   state.phase=!activeDocument()&&!timedOut?'paused':'error';
  }finally{
   clearTimeout(timer);
   if(state.controller===controller){state.controller=null;state.timer=0;progress();}
  }
 }
 root.querySelector('.gi-replay')?.addEventListener('click',()=>reveal(true));
 if(typeof IntersectionObserver==='function'){
  new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();},{threshold:.12}).observe(root);
  new IntersectionObserver(entries=>{near=entries.some(entry=>entry.isIntersecting);sync();},{rootMargin:'300px 0px'}).observe(root);
 }else{near=visible=true;}
 document.addEventListener('visibilitychange',sync);
 document.addEventListener('portfolio:language',labels);
 new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 if(host){const parentObserver=new MutationObserver(sync);parentObserver.observe(host,{attributes:true,attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,host,{attributes:true,attributeFilter:['class']});}
 addEventListener('pagehide',()=>{shown=false;sync();});
 addEventListener('pageshow',()=>{shown=true;sync();});
 labels();progress();sync();
})();
