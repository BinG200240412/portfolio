/* Presentation-only scenarios. Without ?guide, the original game is untouched. */
(() => {
  'use strict';
  if(!new URLSearchParams(location.search).has('guide'))return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const nativeDraw=draw;
  let mode='motion',pour=0,keepWhisking=false,en=false,elapsed=0,last=0,cycle=-1,kind='short',dirty=true,audio=false,penalty=0,nextBeat=0,result="",resultUntil=0,lastOutcome=null;
  const levels=[.02,.18,.34,.49,.64,.80,.96];
  const names={motion:['同一动作，两端交互','ONE GESTURE, TWO RESPONSES'],short:['短波 · 绕圈接住','SHORT WAVE · CIRCLE'],long:['长波 · 持续切奏','LONG WAVE · KEEP WHISKING'],mine:['红波 · 停手候汤','RED WAVE · REST'],foam:['白沫与七汤','FOAM AND SEVEN POURS'],sound:['用手奏出击拂','PLAY THROUGH WHISKING']};
  const style=document.createElement('style');style.textContent=`body{cursor:default}#back,#title,#sub,#foot,#start,#win,#combo,#comboL{display:none!important}#phase{top:30px;width:65%}#phaseName{font-size:25px;letter-spacing:3px}#phaseEn{letter-spacing:2px;font-size:13px;color:#a4b6aa}#panel{display:none;right:28px;top:27px;width:160px}#resBarBg{width:160px}body[data-guide-mode=foam] #panel{display:block}body[data-guide-mode=foam] #phase{left:30px;transform:none;text-align:left;width:55%}#guide-status{position:fixed;bottom:28px;width:100%;text-align:center;font-size:18px;color:#c3d7c9;pointer-events:none}`;document.head.append(style);
  const status=document.createElement('div');status.id='guide-status';document.body.append(status);
  document.getElementById('resTxt').firstChild.textContent='演示进度 ';
  // Controlled demonstrations reuse the real renderers, wave constructors,
  // ward coverage, hit judgments and Web Audio voices. No scores are saved.
  scheduler=()=>{};clock=()=>elapsed;running=true;silent=true;
  function reset(){
    elapsed=0;last=0;cycle=-1;penalty=0;nextBeat=0;result="";resultUntil=0;lastOutcome=null;dirty=true;
    waves.length=0;foam.length=0;hints.length=0;bursts.length=0;comet.length=0;ward.fill(-99);
    activeLong=null;finale=null;won=false;winShown=false;outFade=1;combo=0;best=0;fx=0;fy=0;
    virtualAngle=0;lastWhiskT=-9;
    document.body.dataset.guideMode=mode;
  }
  function soundWave(w){if(!audio||!ac||ac.state!=='running')return;
    const at=ac.currentTime+Math.max(0,w.tHit-elapsed);
    if(w.type==='long')longTone(at,w.freq,w.dwell);
    else if(w.type==='mine')mineTone(at,w.freq);
    else bell(at,w.freq,.15,false);
  }
  function dot(x,y,size,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();}
  function physical(){
    const x=W*.12,top=H*.27,neck=H*.45,bottom=H*.67,rim=H*.66,bR=W*.065;
    const shift=Math.sin(virtualAngle)*5;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    for(let y=top;y<neck;y+=5)for(let q=-7;q<=7;q+=3.5)dot(x+q+shift,y,1.2,'#b5a075');
    for(let j=0;j<16;j++){
      const a=j/16*Math.PI*2+virtualAngle;
      for(let t=0;t<=1;t+=.025){const r=8+29*Math.sin(t*Math.PI*.5)-8*Math.max(0,(t-.85)/.15)**2;dot(x+Math.sin(a)*r+shift,neck+t*(bottom-neck),1.15,Math.cos(a)>.1?'#dfc58f':'#82704e');}
    }
    for(let a=0;a<Math.PI;a+=.035)dot(x+Math.cos(a)*bR,rim+Math.sin(a)*H*.1,1.4,'#9eafa6');
    for(let q=-bR;q<=bR;q+=5)dot(x+q,rim,1.25,'#91a69a');
    for(let q=0;q<54;q++){const a=q*2.4,rr=Math.sqrt(q/54)*bR*.7;dot(x+Math.cos(a)*rr,rim+Math.sin(a)*rr*.1,1.1,'#d7dfcf');}
    const from=x+bR+8,to=cx-R-15;
    for(let q=from;q<to;q+=7)dot(q,cy,1,'#6c9381');
    ctx.font='18px "GenWanMin",serif';ctx.textAlign='center';ctx.fillStyle='#bac7b9';ctx.fillText(en?'Physical gesture study':'真实动作示意',x,H*.84);
    ctx.textAlign='left';
  }
  draw=function(time){
    if(document.hidden){last=0;setTimeout(()=>requestAnimationFrame(draw),200);return;}
    if(reduced.matches&&!dirty){setTimeout(()=>requestAnimationFrame(draw),150);return;}
    const dt=last?Math.max(0,Math.min(.05,(time-last)/1000)):0;last=time;
    if(!reduced.matches)elapsed+=dt;
    const ci=Math.floor(elapsed/6);
    if(ci!==cycle&&!finale){
      cycle=ci;penalty=0;waves.length=0;ward.fill(-99);activeLong=null;hints.length=0;
      kind=mode==='mine'?'mine':mode==='long'?'long':mode==='sound'?['short','long','mine'][ci%3]:'short';
      if(mode!=='foam'){
        const hit=Math.ceil((elapsed+TRAVEL+.15)/SPB)*SPB;
        if(kind==='mine')spawnMine(hit);else if(kind==='long')spawnLong(hit,7,3);else spawnShort(hit,5,false);
        soundWave(waves[waves.length-1]);
      }
    }
    const level=mode==='foam'?levels[pour]:.49;
    if(!finale){resonance=Math.max(0,level-penalty);soupIdx=mode==='foam'?pour:3;curSoup=SOUPS[soupIdx];}
    const resting=kind==='mine'&&!keepWhisking&&mode!=='foam';
    virtualHz=finale||resting?0:kind==='long'?2.4:1.8;
    if(audio&&ac&&elapsed>=nextBeat&&!finale){
      const at=ac.currentTime;nextBeat=elapsed+SPB;
      bass(at,SCALE[(Math.floor(elapsed/SPB)%2)?3:0]);
      if(curSoup.kick)kick(at);
      if(curSoup.arp&&Math.floor(elapsed/SPB)%2)guzheng(at);
      if(curSoup.fast)hat(at+.5*SPB);
    }
    const wave=waves.find(w=>w.type===kind);
    nativeDraw();
    if(wave?.type==='mine'&&wave.judged&&wave.hit===false)penalty=.04;
    if(wave?.judged&&wave!==lastOutcome){
      lastOutcome=wave;resultUntil=elapsed+1.5;
      result=wave.type==='mine'?(wave.hit?(en?'Safe passage · the rest counts':'安全经过 · 停顿也是节奏'):(en?'Contact · combo breaks and resonance falls':'误触：断连击，共振回退')):wave.type==='long'?(en?'Long wave complete · a ring of particles':'长波完成 · 粒子绽放'):(en?'Short wave caught · a brighter note':'短波命中 · 亮音叠加');
    }
    if(mode==='motion')physical();
    document.getElementById('phaseName').textContent=mode==='foam'?(en?SOUPS[pour].en:SOUPS[pour].name+' · '+SOUPS[pour].note):names[mode][en?1:0];
    document.getElementById('phaseEn').textContent=en?'DIRECTED DEMONSTRATION · AUTOMATIC INPUT':'定向机制演示 · 自动操作';
    if(finale)status.textContent=en?'Foam gathers into a tea pattern':'白沫收束为茶纹';
    else if(elapsed<resultUntil)status.textContent=result;
    else if(kind==='mine'&&mode!=='foam')status.textContent=penalty?(en?'Contact: combo breaks, resonance falls':'误触：断连击，共振回退'):(resting?(en?'Resting · let the red wave pass':'停手 · 等红波经过'):(en?'Keep whisking · compare the contact':'继续击拂 · 观察误触反馈'));
    else if(activeLong)status.textContent=(en?'Continuous cuts: ':'持续切奏：')+activeLong.cuts;
    else status.textContent=en?(mode==='foam'?'Particle foam study':'Circle · light the rim · catch the wave'):(mode==='foam'?'粒子茶沫的阶段演绎':'绕圈 · 点亮盏沿 · 接住光轮');
    cv.dataset.guideMode=mode;cv.dataset.pour=String(pour+1);cv.dataset.wave=kind;cv.dataset.input=resting?'rest':'whisk';cv.dataset.ready='true';dirty=false;
  };
  window.TeaWhiskGuide={
    select(options){if(!names[options.mode])return;mode=options.mode;pour=Math.max(0,Math.min(6,+options.pour||0));keepWhisking=options.keep===true;en=options.en===true;reset();},
    async sound(){
      if(!ac)initAudio();await ac.resume();audio=!audio&&ac.state==='running';silent=!audio;
      master.gain.setValueAtTime(audio ? 0.3 : 0,ac.currentTime);padGain.gain.setValueAtTime(audio ? 0.09 : 0,ac.currentTime);nextBeat=elapsed;dirty=true;return audio;
    },
    dispose(){audio=false;silent=true;if(ac)ac.close().catch(()=>{});},
    finish(){mode='foam';pour=6;reset();resonance=1;won=true;startFinale(clock());dirty=true;}
  };
  reset();
})();
