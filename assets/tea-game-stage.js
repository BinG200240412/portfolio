/* A single four-game stage, with a source-engine walkthrough of whisking. */
(() => {
  'use strict';
  const root=document.querySelector('.tea-game-stage');if(!root)return;
  const scene=root.querySelector('[data-tea-stage-scene]');
  const cards=[...root.querySelectorAll('[data-stage-card]')];
  const picks=[...root.querySelectorAll('[data-stage-select]')];
  const modes=[...root.querySelectorAll('[data-guide-mode]')];
  const mount=root.querySelector('[data-tea-guide-mount]');
  const record=root.querySelector('.tea-center-recording'),video=record.querySelector('video');
  const audioButton=root.querySelector('[data-guide-audio]');
  const keys=['xingcha','nianluo','fencha','chazhan'];
  const names={zh:['摘茶','碾罗','分茶','击拂'],en:['Picking','Grinding','Tea painting','Whisking']};
  let selected=({wake:0,grind:1,fencha:2,ritual:2,whisk:3,rhythm:3})[location.hash.slice(1)]??3;
  let mode='motion',pour=0,keep=false,visible=false,audio=false,down=null,swipedAt=0;
  const english=()=>document.documentElement.lang.startsWith('en');
  function fit(){const f=mount.querySelector('iframe');if(!f)return;const k=mount.clientWidth/1040;f.style.width='1040px';f.style.height='780px';f.style.transform=`translate(-50%,-50%) scale(${k})`;}
  function options(){return {mode,pour,keep,en:english()};}
  function send(){mount.querySelector('iframe')?.contentWindow?.TeaWhiskGuide?.select(options());}
  function soundLabel(){audioButton.textContent=english()?(audio?'Mute demonstration':'Enable demo sound'):(audio?'关闭演示声音':'开启演示声音');audioButton.setAttribute('aria-pressed',String(audio));}
  function removeGuide(){mount.querySelector('iframe')?.contentWindow?.TeaWhiskGuide?.dispose();mount.replaceChildren();}
  function syncGuide(){
    const active=selected===3&&visible&&!document.hidden&&!document.querySelector('dialog[open]');
    if(!active){removeGuide();audio=false;audioButton.disabled=true;soundLabel();return;}
    if(mount.querySelector('iframe'))return;
    const frame=document.createElement('iframe');frame.title=english()?'Whisking mechanism demonstration':'击拂机制演示';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.allow='autoplay';frame.src='../assets/works/tea/play/chazhan.html?guide';
    audioButton.disabled=true;frame.addEventListener('load',()=>{fit();send();audioButton.disabled=false;});mount.append(frame);fit();
  }
  function renderModes(){
    modes.forEach(b=>{const on=b.dataset.guideMode===mode;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    root.querySelectorAll('[data-guide-copy]').forEach(el=>el.hidden=el.dataset.guideCopy!==mode);
    root.querySelector('.tea-mine-comparison').hidden=mode!=='mine';
    root.querySelector('.tea-seven-pours').hidden=mode!=='foam';
    root.querySelectorAll('[data-guide-pour]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.guidePour===pour)));
    root.querySelectorAll('[data-guide-pour-copy]').forEach(p=>p.hidden=+p.dataset.guidePourCopy!==pour);
    root.querySelector('[data-guide-finale]').hidden=pour!==6;
    root.querySelectorAll('[data-guide-rest]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.guideRest==='keep')===keep)));
    root.querySelector('.tea-whisk-extra').hidden=selected!==3||!['mine','foam'].includes(mode);
    scene.dataset.guideMode=mode;send();
  }
  function render(){
    const guided=selected===3;
    cards.forEach((card,i)=>{let offset=(i-selected+4)%4;if(offset===3)offset=-1;card.dataset.position=String(offset);card.tabIndex=Math.abs(offset)===1?0:-1;card.setAttribute('aria-hidden',String(offset===0||offset===2));});
    picks.forEach((b,i)=>b.setAttribute('aria-pressed',String(selected===i)));
    root.querySelectorAll('[data-stage-copy]').forEach(el=>el.hidden=el.dataset.stageCopy!==keys[selected]);
    record.hidden=guided;mount.hidden=!guided;
    root.querySelector('.tea-guide-controls').hidden=!guided;
    root.querySelector('.tea-whisk-explanation').hidden=!guided;
    root.querySelector('.tea-whisk-extra').hidden=!guided||!['mine','foam'].includes(mode);
    scene.dataset.guided=String(guided);
    root.querySelector('.tea-whisk-actions').hidden=!guided;
    if(!guided){const src=`../assets/works/tea/gameplay/${keys[selected]}.mp4`;if(!video.querySelector('source').src.endsWith(`/${keys[selected]}.mp4`)){video.querySelector('source').src=src;video.poster=`../assets/works/tea/gameplay/${keys[selected]}.webp`;video.load();}}
    const n=names[english()?'en':'zh'][selected];
    video.setAttribute('aria-label',n+(english()?' · Original game autoplay':' · 原游戏自动演示'));
    const host=video.closest('[data-video-preview]');if(host)host.setAttribute('aria-label',(english()?'Watch video: ':'观看视频：')+video.getAttribute('aria-label'));
    root.querySelector('[data-stage-status]').textContent=guided?(english()?'Whisking · Original game rendering · Directed demonstration · Automatic input':'击拂 · 原游戏渲染 · 定向机制演示 · 自动操作'):(english()?'iPad simulator capture · Original game autoplay · Silent':'iPad 模拟器录屏 · 原游戏自动演示 · 静音');
    if(english())root.querySelector('[data-stage-status]').textContent+=' · Playable UI in Chinese';
    scene.dataset.selected=keys[selected];syncGuide();soundLabel();document.dispatchEvent(new CustomEvent('tea:media-sync'));
  }
  function select(i){
    const next=(i+4)%4;if(next===selected)return;
    const direction=(next-selected+4)%4===3?-1:1;
    selected=next;render();
    const center=root.querySelector('.tea-stage-center');
    center.getAnimations().forEach(a=>a.cancel());
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)center.animate([
      {transform:`translate(calc(-50% + ${direction*90}px),-50%) scale(.9)`,opacity:.45},
      {transform:'translate(-50%,-50%) scale(1)',opacity:1}
    ],{duration:480,easing:'cubic-bezier(.22,.75,.25,1)'});
  }
  cards.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
  picks.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
  root.querySelector('[data-stage-prev]').addEventListener('click',()=>select(selected-1));
  root.querySelector('[data-stage-next]').addEventListener('click',()=>select(selected+1));
  scene.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));scene.focus({preventScroll:true});}});
  scene.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')down={x:e.clientX,y:e.clientY};});
  scene.addEventListener('pointerup',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){swipedAt=performance.now();select(selected+(dx<0?1:-1));}});
  scene.addEventListener('pointercancel',()=>down=null);
  scene.addEventListener('click',e=>{if(performance.now()-swipedAt<350){e.preventDefault();e.stopImmediatePropagation();}},true);
  modes.forEach((b,i)=>{
    b.addEventListener('click',()=>{mode=b.dataset.guideMode;keep=false;renderModes();});
    b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%modes.length;if(e.key==='ArrowLeft')n=(i+modes.length-1)%modes.length;if(n!==undefined){e.preventDefault();mode=modes[n].dataset.guideMode;renderModes();modes[n].focus();}});
  });
  root.querySelectorAll('[data-guide-pour]').forEach(b=>b.addEventListener('click',()=>{pour=+b.dataset.guidePour;renderModes();}));
  root.querySelectorAll('[data-guide-rest]').forEach(b=>b.addEventListener('click',()=>{keep=b.dataset.guideRest==='keep';renderModes();}));
  root.querySelector('[data-guide-finale]').addEventListener('click',()=>mount.querySelector('iframe')?.contentWindow?.TeaWhiskGuide?.finish());
  audioButton.addEventListener('click',async()=>{try{audio=await mount.querySelector('iframe')?.contentWindow?.TeaWhiskGuide?.sound()||false;}catch(_){audio=false;}soundLabel();});
  let measuredWidth=0;
  new ResizeObserver(()=>{
    const w=scene.clientWidth;if(w===measuredWidth)return;measuredWidth=w;
    const width=Math.min(w*(innerWidth<=600?.79:innerWidth<=1400?.76:.66),innerWidth>1800?1100:640);
    scene.style.setProperty('--media-width',width+'px');scene.style.setProperty('--media-height',width*.75+'px');
  }).observe(scene);
  new ResizeObserver(fit).observe(mount);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;syncGuide();},{threshold:.05}).observe(scene);
  new MutationObserver(syncGuide).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  new MutationObserver(()=>{render();renderModes();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('visibilitychange',syncGuide);
  addEventListener('pagehide',removeGuide);
  render();renderModes();
})();
