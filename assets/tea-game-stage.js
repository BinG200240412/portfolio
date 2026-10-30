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
  const center=root.querySelector('.tea-stage-center'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const whiskSurface=document.createElement('div');whiskSurface.className='tea-stage-center tea-whisk-surface';whiskSurface.append(mount);cards[3].querySelector('.tea-tablet-screen').append(whiskSurface);
  let position=selected,target=selected,velocity=0,rolling=false,frame=0,lastFrame=0,dragging=false,wheelTimer=0,layoutBlend=selected===3?1:0;
  const wrap=i=>(i%4+4)%4;
  let guideRun=0;
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
    if(mount.querySelector('iframe')){if(rolling)mount.querySelector('iframe').contentWindow?.TeaWhiskGuide?.suspend();else mount.querySelector('iframe').contentWindow?.TeaWhiskGuide?.resume();return;}
    const frame=document.createElement('iframe');frame.title=english()?'Whisking mechanism demonstration':'击拂机制演示';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.allow='autoplay';const guideURL='../assets/works/tea/play/chazhan.html?guide&v=play-font-subset-20261031&run='+(++guideRun);
    audioButton.disabled=true;whiskSurface.style.visibility='hidden';let attempt=0;
    frame.addEventListener('load',()=>{
      // A newly inserted subframe can emit its initial about:blank load first.
      if(!frame.contentDocument?.querySelector('#c')){if(attempt++<2)setTimeout(()=>{if(frame.isConnected)frame.src=guideURL+'&retry='+attempt;},60);return;}
      frame.dataset.loaded='true';whiskSurface.style.visibility='';fit();send();if(rolling)frame.contentWindow?.TeaWhiskGuide?.suspend();audioButton.disabled=false;
    });mount.append(frame);frame.src=guideURL;fit();
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
    cards.forEach((card,i)=>{const on=i===selected;card.dataset.active=String(on);const pick=card.querySelector('.tea-card-pick');pick.tabIndex=on?-1:0;});
    const screen=cards[selected].querySelector('.tea-tablet-screen');
    if(!guided&&center.parentElement!==screen)screen.append(center);
    center.hidden=guided;whiskSurface.hidden=!guided;
    picks.forEach((b,i)=>b.setAttribute('aria-pressed',String(selected===i)));
    root.querySelectorAll('[data-stage-copy]').forEach(el=>el.hidden=el.dataset.stageCopy!==keys[selected]);
    record.hidden=guided;mount.hidden=!guided;
    root.querySelector('.tea-guide-controls').hidden=false;root.querySelector('.tea-guide-controls').dataset.inactive=String(!guided);root.querySelector('.tea-guide-controls').inert=!guided;
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
  // Every card owns its pose on one continuous wheel. The live surface travels
  // with the outgoing card and changes owner only after the wheel settles.
  function paint(){
    const w=scene.clientWidth,mw=parseFloat(scene.style.getPropertyValue('--media-width'))||640,mh=mw*.75;
    const guided=innerWidth>1400?layoutBlend:0;
    const side=mw*.69*(1-guided)+(w+mw)/4*guided;
    const radius=side/Math.sin(Math.PI/3),rise=mh*(.12+.43*guided);
    cards.forEach((card,i)=>{
      const d=((i-position+6)%4+4)%4-2,a=d*Math.PI/3,ad=Math.abs(d);
      const scale=1/(1+(.38+.52*guided)*d*d);
      card.style.transform=`translate(-50%,-50%) translate3d(${radius*Math.sin(a)}px,${-rise*(1-Math.cos(a))}px,${-50*d*d}px) rotateY(${-d*22}deg) scale(${scale})`;
      card.style.opacity=String(Math.max(0,Math.min(1,(1.85-ad)/.85))*(1-.34*Math.min(1,ad)));
      card.style.zIndex=String(10-Math.round(ad*4));card.style.pointerEvents=ad>1.7?'none':'auto';
      card.setAttribute('aria-hidden',String(ad>1.7));card.querySelector('.tea-card-pick').tabIndex=ad>1.7||i===selected?-1:0;
    });
    scene.dataset.wheelPosition=position.toFixed(4);
  }
  function begin(){
    if(rolling)return;rolling=true;scene.dataset.rolling='true';video.pause();
    mount.querySelector('iframe')?.contentWindow?.TeaWhiskGuide?.suspend();
    document.dispatchEvent(new CustomEvent('tea:media-sync'));
  }
  function finish(){
    position=target;velocity=0;selected=wrap(Math.round(target));rolling=false;scene.dataset.rolling='false';
    render();paint();fit();
  }
  function tick(now){
    frame=0;const dt=Math.min(.032,(now-lastFrame)/1000||.016);lastFrame=now;
    const blendTarget=wrap(Math.round(target))===3?1:0;
    layoutBlend+=(blendTarget-layoutBlend)*Math.min(1,dt*9);
    if(!dragging&&!wheelTimer){
      const steps=Math.ceil(dt/.008),h=dt/steps;
      for(let j=0;j<steps;j++){velocity+=((target-position)*105-velocity*20)*h;position+=velocity*h;}
    }
    paint();
    if(!dragging&&!wheelTimer&&Math.abs(target-position)<.0007&&Math.abs(velocity)<.008&&Math.abs(blendTarget-layoutBlend)<.002){layoutBlend=blendTarget;finish();}
    else frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame){lastFrame=performance.now();frame=requestAnimationFrame(tick);}}
  function go(to){
    target=to;begin();picks.forEach((b,i)=>b.setAttribute('aria-pressed',String(wrap(Math.round(target))===i)));
    if(reduced.matches){cancelAnimationFrame(frame);frame=0;layoutBlend=wrap(target)===3?1:0;finish();}else start();
  }
  function select(i){let d=wrap(i)-wrap(Math.round(target));if(d>2)d-=4;if(d<-2)d+=4;if(d)go(Math.round(target)+d);}
  cards.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
  picks.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
  root.querySelector('[data-stage-prev]').addEventListener('click',()=>go(Math.round(target)-1));
  root.querySelector('[data-stage-next]').addEventListener('click',()=>go(Math.round(target)+1));
  scene.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(Math.round(target)+(e.key==='ArrowRight'?1:-1));scene.focus({preventScroll:true});}});
  scene.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.closest('.tea-tablet-screen'))return;down={x:e.clientX,y:e.clientY,p:position,t:performance.now(),last:e.clientX,id:e.pointerId};});
  scene.addEventListener('pointermove',e=>{
    if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;
    if(!dragging){if(Math.abs(dy)>Math.abs(dx)*1.3&&Math.abs(dy)>9){down=null;return;}if(Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy)*1.2)return;dragging=true;begin();scene.setPointerCapture(e.pointerId);}
    e.preventDefault();const now=performance.now(),unit=Math.max(180,parseFloat(scene.style.getPropertyValue('--media-width'))*.7);
    const v=-(e.clientX-down.last)/unit/Math.max(.008,(now-down.t)/1000);
    velocity=velocity*.35+Math.max(-5,Math.min(5,v))*.65;position=down.p-dx/unit;target=position;
    down.last=e.clientX;down.t=now;start();
  });
  function release(){if(!down)return;if(dragging){dragging=false;swipedAt=performance.now();target=Math.round(position+velocity*.14);go(target);}down=null;}
  scene.addEventListener('pointerup',release);scene.addEventListener('pointercancel',release);
  scene.addEventListener('click',e=>{if(performance.now()-swipedAt<400){e.preventDefault();e.stopImmediatePropagation();}},true);
  scene.addEventListener('wheel',e=>{
    const delta=e.shiftKey?e.deltaY:e.deltaX;if((!e.shiftKey&&Math.abs(e.deltaX)<=Math.abs(e.deltaY)*1.2)||Math.abs(delta)<.1||reduced.matches)return;
    e.preventDefault();begin();clearTimeout(wheelTimer);position+=delta/Math.max(300,scene.clientWidth*.5);target=position;velocity=0;
    wheelTimer=setTimeout(()=>{wheelTimer=0;go(Math.round(position));},140);start();
  },{passive:false});
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
    scene.style.setProperty('--media-width',width+'px');scene.style.setProperty('--media-height',width*.75+'px');paint();
  }).observe(scene);
  new ResizeObserver(fit).observe(mount);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;syncGuide();},{threshold:.05}).observe(scene);
  new MutationObserver(syncGuide).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  new MutationObserver(()=>{render();renderModes();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('visibilitychange',syncGuide);
  addEventListener('pagehide',removeGuide);
  render();renderModes();paint();
})();
