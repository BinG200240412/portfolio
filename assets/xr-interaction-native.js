/* Original control diagrams rebuilt as solid SVG geometry. These are visual
 * demonstrations, not a claim about the prototype's hardware button protocol. */
(() => {
  'use strict';
  const root=document.getElementById('gogo-interaction-native');
  if(!root||root.dataset.interactionReady)return;
  root.setAttribute('data-i18n-ignore','');root.setAttribute('data-media-corners-ignore','');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const dialog=document.getElementById('gogo-lightbox');
  let host=null,shown=true,frame=0,previous=0,lastAnnouncement=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const english=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang.startsWith('en');
  const copy={
    zh:{group:'手柄与机器狗交互示意',init:'初始化',move:'位置',pose:'姿态',power:'接通或重置机器狗',left:'向左移动',right:'向右移动',up:'向前移动',down:'向后移动',stand:'站立示意',crouch:'低伏示意',bow:'俯身示意',connected:'已接通，机器狗站起',disconnected:'已重置连接',moved:'机器狗位置已改变',posed:'机器狗姿态已改变'},
    en:{group:'Controller and robot dog interaction diagrams',init:'Connect',move:'Position',pose:'Posture',power:'Connect or reset the robot dog',left:'Move left',right:'Move right',up:'Move forwards',down:'Move backwards',stand:'Standing example',crouch:'Crouching example',bow:'Bowing example',connected:'Connected. The robot dog stands up.',disconnected:'Connection reset',moved:'Robot dog position changed',posed:'Robot dog posture changed'}
  };
  const text=()=>copy[english()?'en':'zh'];
  const poses={
    stand:{back:80,front:80,head:76,rearKneeX:136,frontKneeX:231,rearKneeY:133,frontKneeY:133,rearFoot:147,frontFoot:245,headAngle:0},
    crouch:{back:112,front:112,head:108,rearKneeX:125,frontKneeX:219,rearKneeY:143,frontKneeY:143,rearFoot:152,frontFoot:249,headAngle:0},
    bow:{back:82,front:115,head:120,rearKneeX:143,frontKneeX:261,rearKneeY:133,frontKneeY:146,rearFoot:148,frontFoot:282,headAngle:12}
  };
  const arrow=direction=>{
    const rotation={up:0,right:90,down:180,left:270}[direction];
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 20 17H4Z" transform="rotate(${rotation} 12 12)"/></svg>`;
  };
  const smallDog=pose=>`<svg viewBox="0 0 40 30" aria-hidden="true"><path d="${pose==='crouch'?'M6 13h22l5 4v4h-5l-3-3H11l-4 5H3l3-8Z':pose==='bow'?'M5 6h12l12 9 5 1v5h-6l-3-3-8-5-5 1-3 11H5l1-13Z':'M5 7h24l6 3v7h-6l-2-4H11L8 26H4l1-15Zm18 7h5l3 12h-5Z'}"/></svg>`;
  const dog=`<ellipse class="gin-floor" cx="202" cy="171" rx="91" ry="9"/><g class="gin-dog"><g class="gin-far-leg"><path class="gin-dog-limb" data-leg="rearFar"/><path class="gin-dog-limb" data-leg="frontFar"/></g><path class="gin-tail"/><path class="gin-dog-body"/><path class="gin-dog-limb" data-leg="rear"/><path class="gin-dog-limb" data-leg="front"/><circle class="gin-dog-joint" data-joint="rear" r="3"/><circle class="gin-dog-joint" data-joint="front" r="3"/><g class="gin-dog-head"><rect width="37" height="27" rx="7"/><rect class="gin-dog-eye" x="23" y="5" width="9" height="17" rx="3"/><circle class="gin-indicator" cx="27.5" cy="10" r="2"/></g></g>`;
  const controller=`<g transform="translate(91 241) rotate(-17)"><path class="gin-controller" d="M-18-1C-23 19-18 48-12 74Q-9 86 2 83L17 78Q26 74 22 62L13 9Z"/><ellipse class="gin-controller-face" cx="0" cy="0" rx="42" ry="28"/><path class="gin-controller" fill-rule="evenodd" d="M-47-9C-45-34 40-34 47-9L42 6C31-10-31-12-42 7ZM-36-10C-25-22 27-22 36-10C20-18-21-18-36-10Z"/><ellipse class="gin-controller-detail" cx="-12" cy="-3" rx="10" ry="8"/><circle class="gin-controller-detail" cx="12" cy="4" r="4"/><circle class="gin-controller-detail" cx="21" cy="-7" r="4"/><path class="gin-controller-detail" d="M-7 29h5v28h-5z" opacity=".3"/></g><path class="gin-link" d="M148 247H184"/><path class="gin-arrow" d="m184 247-7-4v8Z"/>`;
  function buttons(kind){
    if(kind==='init')return `<button type="button" class="gin-control gin-power" data-action="power" data-label="power" aria-pressed="false"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 4v10M8.5 7.8a9 9 0 1 0 11 0"/></svg></button>`;
    if(kind==='move')return ['up','right','down','left'].map(direction=>`<button type="button" class="gin-control gin-${direction}" data-action="move" data-direction="${direction}" data-label="${direction}">${arrow(direction)}</button>`).join('')+'<span class="gin-pad-dot" aria-hidden="true"></span>';
    return ['stand','crouch','bow'].map(pose=>`<button type="button" class="gin-control gin-pose-control gin-pose-${pose}" data-action="pose" data-pose="${pose}" data-label="${pose}" aria-pressed="${pose==='stand'}">${smallDog(pose)}</button>`).join('');
  }
  root.innerHTML=['init','move','pose'].map(kind=>`<section class="gin-demo" data-demo="${kind}" role="group"><div class="gin-scene"><svg class="gin-art" viewBox="0 0 420 360" aria-hidden="true" focusable="false">${dog}${controller}</svg><div class="gin-pad">${buttons(kind)}</div></div><h4 class="gin-title" data-title="${kind}"></h4></section>`).join('')+'<span class="gin-status" role="status" aria-live="polite"></span>';
  const status=root.querySelector('.gin-status');
  const models=Array.from(root.querySelectorAll('.gin-demo')).map(element=>({
    element,kind:element.dataset.demo,dog:element.querySelector('.gin-dog'),body:element.querySelector('.gin-dog-body'),head:element.querySelector('.gin-dog-head'),tail:element.querySelector('.gin-tail'),
    legs:Object.fromEntries(Array.from(element.querySelectorAll('[data-leg]')).map(e=>[e.dataset.leg,e])),joints:Object.fromEntries(Array.from(element.querySelectorAll('[data-joint]')).map(e=>[e.dataset.joint,e])),
    current:{...poses[element.dataset.demo==='init'?'crouch':'stand'],x:0,y:0},motion:null,visible:false,initialized:false,position:{x:0,y:0},pose:'stand'
  }));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function active(model){return model.visible&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));}
  function announce(key){lastAnnouncement=key;status.textContent=text()[key];}
  function render(model,stride=0){
    const s=model.current;
    model.dog.setAttribute('transform',`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`);
    model.body.setAttribute('d',`M137 ${s.back}L248 ${s.front}Q260 ${s.front} 260 ${s.front+11}L255 ${s.front+29}L139 ${s.back+29}Q128 ${s.back+27} 128 ${s.back+15}Q128 ${s.back} 137 ${s.back}Z`);
    model.head.setAttribute('transform',`translate(253 ${s.head}) rotate(${s.headAngle} 13 13)`);
    model.tail.setAttribute('d',`M130 ${s.back+10} 118 ${s.back-7} 109 ${s.back-10}`);
    const drawLeg=(key,hipX,hipY,kneeX,kneeY,footX,offset,phase)=>{
      const lift=Math.max(0,stride*phase)*8;
      model.legs[key].setAttribute('d',`M${hipX+offset} ${hipY}L${kneeX+offset+stride*phase*9} ${kneeY}L${footX+offset} ${165-lift}`);
    };
    drawLeg('rearFar',146,s.back+23,s.rearKneeX,s.rearKneeY,s.rearFoot,-13,-1);
    drawLeg('frontFar',245,s.front+23,s.frontKneeX,s.frontKneeY,s.frontFoot,-13,1);
    drawLeg('rear',146,s.back+23,s.rearKneeX,s.rearKneeY,s.rearFoot,0,1);
    drawLeg('front',245,s.front+23,s.frontKneeX,s.frontKneeY,s.frontFoot,0,-1);
    for(const key of ['rear','front']){
      model.joints[key].setAttribute('cx',key==='rear'?146:245);model.joints[key].setAttribute('cy',(key==='rear'?s.back:s.front)+23);
    }
    model.element.dataset.dogPosition=s.x.toFixed(1)+','+s.y.toFixed(1);
  }
  function motionState(){
    models.forEach(model=>{model.element.dataset.motion=model.motion?(active(model)?'running':'paused'):'idle';});
    root.dataset.interactionMotion=models.some(m=>m.motion&&active(m))?'running':models.some(m=>m.motion)?'paused':'idle';
  }
  function schedule(){if(!frame&&models.some(model=>model.motion&&active(model)))frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;const delta=previous?Math.min(48,now-previous):0;previous=now;
    for(const model of models){
      if(!model.motion||!active(model))continue;
      const motion=model.motion;motion.elapsed+=delta;const progress=Math.min(1,motion.elapsed/motion.duration),eased=1-(1-progress)**3;
      for(const key of Object.keys(motion.to))model.current[key]=motion.from[key]+(motion.to[key]-motion.from[key])*eased;
      render(model,motion.walk?Math.sin(progress*Math.PI*4)*(1-progress*.3):0);
      if(progress===1){model.current={...motion.to};model.motion=null;render(model);}
    }
    motionState();schedule();if(!frame)previous=0;
  }
  function animate(model,target,walk=false){
    const to={...target};
    if(reduced.matches||forced.matches){model.current=to;model.motion=null;render(model);motionState();return;}
    model.motion={from:{...model.current},to,duration:walk?680:540,elapsed:0,walk};motionState();schedule();
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;previous=0;
    if(reduced.matches||forced.matches)for(const model of models){if(model.motion){model.current={...model.motion.to};model.motion=null;render(model);}}
    motionState();schedule();
  }
  function language(){
    const t=text();root.setAttribute('aria-label',t.group);
    root.querySelectorAll('[data-label]').forEach(element=>element.setAttribute('aria-label',t[element.dataset.label]));
    models.forEach(model=>{model.element.setAttribute('aria-label',t[model.kind]);model.element.querySelector('[data-title]').textContent=t[model.kind];});
    if(lastAnnouncement)status.textContent=t[lastAnnouncement];
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||!root.contains(button))return;
    const model=models.find(m=>m.element===button.closest('.gin-demo'));if(!model)return;
    if(button.dataset.action==='power'){
      model.initialized=!model.initialized;model.element.dataset.initialized=String(model.initialized);button.setAttribute('aria-pressed',String(model.initialized));
      animate(model,{...poses[model.initialized?'stand':'crouch'],x:0,y:0});announce(model.initialized?'connected':'disconnected');
    }else if(button.dataset.action==='move'){
      const direction=button.dataset.direction;
      if(direction==='left')model.position.x=clamp(model.position.x-26,-52,52);
      if(direction==='right')model.position.x=clamp(model.position.x+26,-52,52);
      if(direction==='up')model.position.y=clamp(model.position.y-10,-20,20);
      if(direction==='down')model.position.y=clamp(model.position.y+10,-20,20);
      animate(model,{...poses.stand,...model.position},true);announce('moved');
    }else{
      model.pose=button.dataset.pose;model.element.dataset.pose=model.pose;
      model.element.querySelectorAll('[data-action="pose"]').forEach(e=>e.setAttribute('aria-pressed',String(e===button)));
      animate(model,{...poses[model.pose],x:0,y:0});announce('posed');
    }
  });
  models.forEach(model=>{render(model);model.element.dataset.motion='idle';if(model.kind==='init')model.element.dataset.initialized='false';if(model.kind==='pose')model.element.dataset.pose='stand';});
  // Observe each scene too, so actions in one phone row cannot animate an offscreen row.
  const visibility=new IntersectionObserver(entries=>{entries.forEach(entry=>{const model=models.find(m=>m.element===entry.target);if(model)model.visible=entry.isIntersecting;});sync();},{threshold:.01});
  models.forEach(model=>visibility.observe(model.element));
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  new MutationObserver(language).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  addEventListener('portfolio:language',language);addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});
  root.dataset.interactionReady='true';root.dataset.interactionMotion='idle';language();
})();
