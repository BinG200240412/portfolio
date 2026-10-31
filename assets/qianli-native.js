/* PDF/Figma source paths become live SVG; no full-page raster captures. */
(() => {
  'use strict';
  const hosts=[...document.querySelectorAll('[data-native-src]')], requests=new Set(), timers=new Set();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const english=()=>document.documentElement.lang.startsWith('en');
  const NS='http://www.w3.org/2000/svg';
  let alive=true,shown=true,detail=false,frameHost=null,serial=0;
  try{frameHost=window.frameElement?.closest('#section')||null;}catch(_){}
  const active=()=>alive&&shown&&!document.hidden&&!detail&&(!frameHost||frameHost.classList.contains('on'));
  const captions={
    '通过触摸预先布置':'Touch activates','在装置表面的触摸':'sensors on the surface','传感器以来点亮相':'and lights up the','关区域光点。':'matching fibre region.',
    '触摸点':'Touch point','单片机布线':'Controller wiring','触摸':'Touch','触摸传感器':'Touch sensor','ARDUINO单片机':'Arduino','ARDUINO代码':'Arduino code',
    'LED灯带':'LED strip','传感器分布':'Sensor zones','光纤':'Optical fibres','光纤穿孔':'Fibre holes','光纤打组':'Fibre bundles','光纤导光':'Light transmission',
    '把连接在前方区域的光纤打':'Bundle fibres from the','组，捆在相应灯珠前，以一':'same region in front','个灯珠控制一块区域的光':'of matching LEDs; each','纤。':'LED controls one zone.',
    '通过ARDUINO单片机数字信号来对led灯':'Arduino digital signals control each LED group,','组进行设置，实现对区域光纤的颜色控':'changing the colour of a fibre region','制。达到多层次多色彩的效果。':'to create layers of coloured light.'
  };
  function labelSVG(svg){
    svg.querySelectorAll('.q-native-label').forEach(text=>{
      const zh=text.dataset.zh||text.textContent;text.dataset.zh=zh;
      text.textContent=english()?(captions[zh]||zh):zh;
      if(!text.dataset.size)text.dataset.size=text.getAttribute('font-size');
      text.setAttribute('font-size',english()?Math.min(17,Number(text.dataset.size)):text.dataset.size);
    });
  }
  function prepare(svg,host){
    const prefix='qn'+(++serial)+'-';
    svg.querySelectorAll('[id]').forEach(n=>{const old=n.id;n.id=prefix+old;
      svg.querySelectorAll('*').forEach(x=>[...x.attributes].forEach(a=>{if(a.value.includes('#'+old))x.setAttribute(a.name,a.value.replaceAll('#'+old,'#'+prefix+old));}));});
    // Preserve inherited colour groups. Only root circles are grouped into rows.
    const circles=[...svg.children].filter(x=>x.tagName.toLowerCase()==='circle');
    const groups=new Map();
    circles.forEach(c=>{const key=host.classList.contains('q-native-chart')?Math.round(Number(c.getAttribute('cx'))/10):Math.round(Number(c.getAttribute('cy'))/5);
      if(!groups.has(key)){const g=document.createElementNS(NS,'g');g.classList.add('q-native-row');g.style.setProperty('--row',String(groups.size));svg.insertBefore(g,c);groups.set(key,g);}groups.get(key).append(c);});
    svg.querySelectorAll('g[fill]').forEach((g,i)=>{if(g.querySelector('circle')){g.classList.add('q-native-row');g.style.setProperty('--row',String(i%15));}});
    if(host.classList.contains('q-native-chart'))svg.querySelectorAll(':scope>path').forEach((p,i)=>{p.classList.add('q-native-link');p.style.setProperty('--row',String(i));});
    svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('aria-hidden','true');labelSVG(svg);
  }
  function replay(host){host.classList.remove('is-revealing');requestAnimationFrame(()=>{if(alive)host.classList.add('is-revealing');});}
  async function load(host){
    const src=english()&&host.dataset.nativeEn?host.dataset.nativeEn:host.dataset.nativeSrc;
    if(host.dataset.loadedSrc===src||host.dataset.pending===src)return;
    const revision=host.dataset.pending=src,controller=new AbortController();requests.add(controller);
    const timeout=setTimeout(()=>controller.abort(),12000);timers.add(timeout);
    try{
      const response=await fetch(src,{signal:controller.signal});if(!response.ok)throw new Error('Graphic unavailable');
      const xml=new DOMParser().parseFromString(await response.text(),'image/svg+xml'),svg=xml.documentElement;
      if(svg.localName!=='svg'||!alive||host.dataset.pending!==revision)return;
      prepare(svg,host);host.replaceChildren(document.importNode(svg,true));host.dataset.loadedSrc=src;host.dataset.ready='true';replay(host);sync();
    }catch(error){if(!alive||host.dataset.pending!==revision)return;
      const retry=document.createElement('button');retry.type='button';retry.className='q-native-retry';retry.textContent=english()?'Retry drawing':'重新加载图形';retry.addEventListener('click',()=>{delete host.dataset.pending;load(host);});host.replaceChildren(retry);
    }finally{clearTimeout(timeout);timers.delete(timeout);requests.delete(controller);if(host.dataset.pending===revision)delete host.dataset.pending;}
  }
  function pulse(host,event){
    const svg=host.querySelector('svg');if(!svg||reduced.matches)return;
    const point=svg.createSVGPoint();const box=svg.getBoundingClientRect();point.x=event.clientX??box.x+box.width*.5;point.y=event.clientY??box.y+box.height*.5;
    const matrix=svg.getScreenCTM();if(!matrix)return;const p=point.matrixTransform(matrix.inverse());
    const ring=document.createElementNS(NS,'circle');ring.setAttribute('cx',p.x);ring.setAttribute('cy',p.y);ring.setAttribute('r','18');ring.classList.add('q-tap-ring');svg.append(ring);
    const lit=[...svg.querySelectorAll('circle:not(.q-tap-ring)')].filter(c=>Math.hypot(Number(c.getAttribute('cx'))-p.x,Number(c.getAttribute('cy'))-p.y)<55);
    lit.forEach(c=>c.classList.add('q-native-flash'));
    const timer=setTimeout(()=>{ring.remove();lit.forEach(c=>c.classList.remove('q-native-flash'));timers.delete(timer);},1950);timers.add(timer);
  }
  const visible=new Set(),films=new Map([...document.querySelectorAll('.q-film video')].map(video=>{
    video.muted=true;video.loop=true;video.dataset.videoPreviewManaged='true';return[video,{visible:false,pending:false,eligible:false,retry:false}];}));
  function sync(){
    const live=active();hosts.forEach(host=>host.dataset.motion=String(live&&visible.has(host)&&!reduced.matches));
    films.forEach((state,video)=>{
      const eligible=live&&state.visible&&!reduced.matches;
      if(eligible!==state.eligible){state.eligible=eligible;state.retry=eligible;}
      if(!eligible){video.pause();return;}
      if(state.pending||!state.retry)return;state.pending=true;
      video.play().then(()=>{state.retry=false;if(!state.eligible)video.pause();}).catch(()=>{}).finally(()=>state.pending=false);
    });
  }
  const observe=new IntersectionObserver(entries=>{entries.forEach(entry=>{
    if(entry.target.matches('[data-native-src]')){if(entry.isIntersecting){visible.add(entry.target);load(entry.target);}else visible.delete(entry.target);}
    else if(films.has(entry.target))films.get(entry.target).visible=entry.isIntersecting&&entry.intersectionRatio>=.25;
    else entry.target.classList.toggle('q-motion-on',entry.isIntersecting&&!reduced.matches);
  });sync();},{threshold:[0,.25],rootMargin:'0px'});
  const warmup=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)load(e.target);}),{rootMargin:'450px'});
  hosts.forEach(host=>{observe.observe(host);warmup.observe(host);if(host.classList.contains('q-native-dots')){
    host.addEventListener('click',e=>pulse(host,e));host.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay(host);pulse(host,{});}});
  }});
  document.querySelectorAll('[data-replay-native]').forEach(button=>button.addEventListener('click',()=>button.closest('section').querySelectorAll('[data-native-src]').forEach(replay)));
  document.querySelectorAll('.q-deconstruction').forEach(x=>observe.observe(x));
  films.forEach((state,video)=>{observe.observe(video);video.addEventListener('canplay',sync);});
  document.addEventListener('visibilitychange',sync);document.addEventListener('portfolio:video-detail',event=>{detail=Boolean(event.detail?.open);sync();});
  const dialogObserver=new MutationObserver(()=>{detail=Boolean(document.querySelector('dialog[open]'));sync();});dialogObserver.observe(document.body,{attributes:true,subtree:true,attributeFilter:['open']});
  if(frameHost)window.PortfolioLifecycle?.observeParent(frameHost,sync,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',sync);addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});
  addEventListener('portfolio:language',()=>hosts.forEach(host=>{if(host.dataset.ready){if(host.dataset.nativeEn)load(host);else labelSVG(host.querySelector('svg'));}}));
  window.PortfolioLifecycle?.onDispose(()=>{alive=false;observe.disconnect();warmup.disconnect();dialogObserver.disconnect();requests.forEach(c=>c.abort());timers.forEach(clearTimeout);films.forEach((state,v)=>{v.pause();v.removeAttribute('src');v.querySelectorAll('source').forEach(s=>s.removeAttribute('src'));v.load();});});
})();
