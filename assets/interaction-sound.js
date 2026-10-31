/* Local, gesture-gated tactile ticks. No media assets, requests or sound queue. */
(() => {
  'use strict';
  if(window.PortfolioSound)return;
  const KEY='portfolio-sound',listeners=[];
  let disposed=false;
  const trusted=event=>event?.isTrusted===true&&['pointerdown','keydown','click'].includes(event.type);
  const listen=(target,type,callback)=>{target.addEventListener(type,callback);listeners.push(()=>target.removeEventListener(type,callback));};
  const publish=enabled=>{document.documentElement.dataset.sound=enabled?'on':'off';window.dispatchEvent(new CustomEvent('portfolio:sound',{detail:{enabled}}));};
  const detach=()=>{listeners.splice(0).forEach(remove=>remove());unregister?.();};
  let unregister;

  // Same-origin nested cases borrow the nearest engine, including its throttle.
  // A facade owns only its listeners and quiet reasons, never the parent audio.
  let ancestor=window,parentSound=null,parentWindow=null;
  for(let depth=0;depth<16;depth++){
    try{const next=ancestor.parent;if(!next||next===ancestor)break;ancestor=next;}catch(_){break;}
    try{
      const sound=ancestor.PortfolioSound;
      if(sound&&['play','unlock','setEnabled','setQuiet'].every(name=>typeof sound[name]==='function')){parentSound=sound;parentWindow=ancestor;break;}
    }catch(_){}
  }
  if(parentSound){
    const prefix='frame-'+Math.random().toString(36).slice(2)+':',reasons=new Set(),life=prefix+'lifecycle';
    let active=!document.hidden,known=!!parentSound.enabled;
    document.documentElement.dataset.sound=known?'on':'off';
    const sync=()=>{if(disposed)return;const enabled=!!parentSound.enabled;if(enabled!==known){known=enabled;publish(enabled);}};
    const pause=()=>{active=false;parentSound.setQuiet(life,true);};
    const dispose=()=>{
      if(disposed)return;disposed=true;detach();
      reasons.forEach(reason=>parentSound.setQuiet(prefix+'quiet:'+reason,false));reasons.clear();parentSound.setQuiet(life,false);
    };
    window.PortfolioSound=Object.freeze({
      play:kind=>!disposed&&active&&!document.hidden?parentSound.play(kind):false,
      unlock(event){if(disposed||document.hidden||!trusted(event))return false;active=true;parentSound.setQuiet(life,false);return parentSound.unlock(event);},
      setEnabled(value){if(!disposed){parentSound.setEnabled(!!value);sync();}},
      get enabled(){return !!parentSound.enabled;},
      setQuiet(reason,value){
        if(disposed||typeof reason!=='string'||!reason||reason.length>256)return;
        if(value)reasons.add(reason);else reasons.delete(reason);
        parentSound.setQuiet(prefix+'quiet:'+reason,!!value);
      },dispose,
    });
    listen(parentWindow,'portfolio:sound',sync);
    listen(document,'visibilitychange',()=>{if(document.hidden)pause();else parentSound.setQuiet(life,false);});
    listen(window,'pagehide',event=>event.persisted?pause():dispose());
    listen(window,'pageshow',()=>{if(!document.hidden)parentSound.setQuiet(life,false);});
    unregister=window.PortfolioLifecycle?.onDispose?.(dispose);
    if(document.hidden)pause();
    return;
  }

  let enabled=true,context=null,unlocked=false,resuming=null,lifecyclePaused=false,epoch=0,active=null,lastPlay=-Infinity;
  const quiet=new Set(),lastKind={type:-Infinity,reply:-Infinity};
  const presets={select:[20,.027],open:[26,.030],close:[18,.024],send:[24,.029],type:[14,.009],reply:[12,.007]};
  try{enabled=localStorage.getItem(KEY)!=='off';}catch(_){}
  document.documentElement.dataset.sound=enabled?'on':'off';
  const silence=()=>{
    const current=active;if(!current)return;active=null;clearTimeout(current.timer);current.source.onended=null;
    try{current.gain.gain.cancelScheduledValues(context.currentTime);current.gain.gain.setValueAtTime(0,context.currentTime);}catch(_){}
    try{current.source.stop();}catch(_){}
    for(const node of [current.source,current.gain])try{node.disconnect();}catch(_){}
  };
  function pause(){
    epoch++;unlocked=false;resuming=null;lifecyclePaused=true;silence();
    if(context&&context.state!=='closed')try{Promise.resolve(context.suspend()).catch(()=>{});}catch(_){}
  }
  function unlock(event){
    if(disposed||!enabled||document.hidden||quiet.size||!trusted(event))return false;
    try{
      if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(typeof Audio!=='function')return false;context=new Audio({latencyHint:'interactive'});}
      if(context.state==='closed')return false;
      lifecyclePaused=false;
      if(context.state==='running'){unlocked=true;return true;}
      if(!resuming){
        const token=++epoch;resuming=token;
        Promise.resolve(context.resume()).then(()=>{
          if(token!==epoch||disposed){
            // An old resume may settle after the page was hidden. Never let
            // that completion undo suspension, or interrupt a newer gesture.
            if(!disposed&&lifecyclePaused&&context?.state!=='closed')try{Promise.resolve(context.suspend()).catch(()=>{});}catch(_){}
            return;
          }
          resuming=null;unlocked=enabled&&!document.hidden&&!quiet.size&&context.state==='running';
        },()=>{if(token===epoch){resuming=null;unlocked=false;}});
      }
    }catch(_){unlocked=false;resuming=null;}
    return false;
  }
  function makeBuffer(milliseconds){
    const rate=context.sampleRate,length=Math.max(1,Math.ceil(rate*milliseconds/1000)),buffer=context.createBuffer(1,length,rate),samples=buffer.getChannelData(0);
    const fast=1-Math.exp(-2*Math.PI*1750/rate),slow=1-Math.exp(-2*Math.PI*260/rate);
    let high=0,low=0,peak=0;
    for(let index=0;index<length;index++){
      const t=index/rate,noise=Math.random()*2-1;high+=fast*(noise-high);low+=slow*(noise-low);
      const envelope=Math.min(1,t/.0012)*Math.pow(Math.max(0,1-index/length),2.3);
      const body=.065*Math.sin(2*Math.PI*145*t)*Math.exp(-t/.005);
      samples[index]=((high-low)*.82+body)*envelope;peak=Math.max(peak,Math.abs(samples[index]));
    }
    // Baked DSP keeps the source bounded before its deliberately tiny gain.
    if(peak>0)for(let index=0;index<length;index++)samples[index]*=.8/peak;
    return buffer;
  }
  function play(kind='select'){
    if(disposed||!enabled||!unlocked||document.hidden||quiet.size||!context||context.state!=='running'||active)return false;
    kind=typeof kind==='string'&&Object.hasOwn(presets,kind)?kind:'select';
    const now=performance.now(),minimum=kind==='reply'?120:kind==='type'?70:45;
    if(now-lastPlay<45||(kind==='type'||kind==='reply')&&now-lastKind[kind]<minimum)return false;
    const [duration,volume]=presets[kind];let source,gain;
    try{
      const buffer=makeBuffer(duration);source=context.createBufferSource();gain=context.createGain();
      source.buffer=buffer;gain.gain.setValueAtTime(volume,context.currentTime);source.connect(gain);gain.connect(context.destination);
      const current={source,gain,timer:0};active=current;
      source.onended=()=>{if(active===current)silence();};
      current.timer=setTimeout(()=>{if(active===current)silence();},duration+20);
      source.start(context.currentTime);source.stop(context.currentTime+duration/1000+.002);
      lastPlay=now;if(kind==='type'||kind==='reply')lastKind[kind]=now;
      return true;
    }catch(_){
      if(active?.source===source)silence();else for(const node of [source,gain])try{node?.disconnect();}catch(_){}
      return false;
    }
  }
  function setEnabled(value,persist=true){
    if(disposed)return;value=!!value;
    if(persist)try{localStorage.setItem(KEY,value?'on':'off');}catch(_){}
    if(value===enabled)return;enabled=value;if(!value)pause();publish(value);
  }
  function dispose(){
    if(disposed)return;disposed=true;epoch++;unlocked=false;resuming=null;silence();detach();quiet.clear();
    if(context&&context.state!=='closed')try{Promise.resolve(context.close()).catch(()=>{});}catch(_){}
    context=null;
  }
  window.PortfolioSound=Object.freeze({play,unlock,setEnabled,get enabled(){return enabled;},
    setQuiet(reason,value){if(disposed||typeof reason!=='string'||!reason||reason.length>512)return;if(value){quiet.add(reason);silence();}else quiet.delete(reason);},dispose});
  listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
  listen(window,'pagehide',event=>event.persisted?pause():dispose());
  listen(window,'storage',event=>{
    if(event.storageArea)try{if(event.storageArea!==localStorage)return;}catch(_){return;}
    if(event.key===KEY||event.key===null)setEnabled(event.newValue!=='off',false);
  });
  unregister=window.PortfolioLifecycle?.onDispose?.(dispose);
})();
