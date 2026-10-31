'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const source=fs.readFileSync(path.resolve(__dirname,'../../assets/interaction-sound.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const gesture=(type='pointerdown')=>({type,isTrusted:true});

function target(initial={}){
  const listeners=new Map();
  return Object.assign(initial,{
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    dispatchEvent(event){for(const fn of [...(listeners.get(event.type)||[])])fn.call(this,event);return true;},
    listenerCount(){return [...listeners.values()].reduce((sum,set)=>sum+set.size,0);},
  });
}

function environment(options={}){
  let now=1000,serial=0;
  const timers=new Map(),contexts=[],storage=new Map(options.preference?[['portfolio-sound',options.preference]]:[]),cleanups=new Set(),published=[];
  const document=target({hidden:false,documentElement:{dataset:{}}});
  const window=target({});window.parent=options.parent||window;
  const schedule=(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:now+delay});return id;};
  class Audio{
    constructor(){this.state=options.running?'running':'suspended';this.sampleRate=48000;this.destination={};this.buffers=[];this.sources=[];this.gains=[];this.resumeCalls=0;this.suspendCalls=0;this.closeCalls=0;this.pending=[];contexts.push(this);}
    get currentTime(){return now/1000;}
    resume(){this.resumeCalls++;if(options.deferredResume)return new Promise(resolve=>this.pending.push(()=>{this.state='running';resolve();}));this.state='running';return Promise.resolve();}
    suspend(){this.suspendCalls++;this.state='suspended';return Promise.resolve();}
    close(){this.closeCalls++;this.state='closed';return Promise.resolve();}
    createBuffer(channels,length,sampleRate){const samples=new Float32Array(length),buffer={channels,length,sampleRate,getChannelData:()=>samples};this.buffers.push(buffer);return buffer;}
    createBufferSource(){const node={connects:[],stops:[],disconnects:0,onended:null,connect(to){this.connects.push(to);},disconnect(){this.disconnects++;},start(time){this.started=time;},stop(time){this.stops.push(time);}};this.sources.push(node);return node;}
    createGain(){const values=[],node={gain:{values,setValueAtTime(value,time){values.push({value,time});},cancelScheduledValues(){}},disconnects:0,connect(to){this.destination=to;},disconnect(){this.disconnects++;}};this.gains.push(node);return node;}
  }
  if(!options.unsupported)window.AudioContext=Audio;
  window.PortfolioLifecycle={onDispose(fn){cleanups.add(fn);return()=>cleanups.delete(fn);}};
  class CustomEvent{constructor(type,settings={}){this.type=type;this.detail=settings.detail;}}
  const context={window,document,CustomEvent,performance:{now:()=>now},Float32Array,Math,Promise,
    localStorage:{getItem:key=>{if(options.storageThrows)throw new Error('blocked');return storage.get(key)??null;},setItem:(key,value)=>{if(options.storageThrows)throw new Error('blocked');storage.set(key,value);}},
    setTimeout:schedule,clearTimeout:id=>timers.delete(id),
    fetch:()=>assert.fail('interaction sounds must not request network resources'),
  };
  window.addEventListener('portfolio:sound',event=>published.push(event.detail));
  vm.runInNewContext(source,context);
  return{api:window.PortfolioSound,window,document,contexts,timers,storage,cleanups,published,context,
    async unlock(event=gesture()){const result=window.PortfolioSound.unlock(event);await tick();return result;},
    finish(){for(const audio of contexts)for(const node of audio.sources)node.onended?.();},
    advance(ms){const end=now+ms;while(true){const entry=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const[id,timer]=entry;timers.delete(id);now=timer.at;timer.fn();}now=end;},
  };
}

test('no context, buffer or output exists before an allowed trusted gesture; play never unlocks audio',async()=>{
  const env=environment();assert.equal(env.api.enabled,true);assert.equal(env.document.documentElement.dataset.sound,'on');
  assert.equal(env.api.play('select'),false);env.api.setEnabled(true);assert.equal(env.contexts.length,0);
  for(const event of [undefined,{type:'click',isTrusted:false},{type:'input',isTrusted:true},{type:'mousemove',isTrusted:true}])assert.equal(env.api.unlock(event),false);
  assert.equal(env.contexts.length,0);
  await env.unlock();assert.equal(env.contexts.length,1);assert.equal(env.contexts[0].sources.length,0,'unlocking itself is silent');
  assert.equal(env.api.play('select'),true);assert.equal(env.contexts[0].sources.length,1);
  assert.equal(Object.isFrozen(env.api),true);
});

test('synthesis is a bounded short mono tick, with quieter type/reply sounds and no overlapping nodes',async()=>{
  const peaks={};
  for(const kind of ['select','open','close','send','type','reply']){
    const env=environment();await env.unlock();assert.equal(env.api.play(kind),true);
    const audio=env.contexts[0],buffer=audio.buffers[0],gain=audio.gains[0],node=audio.sources[0],samples=buffer.getChannelData(0);
    const peak=Math.max(...samples.map(Math.abs))*gain.gain.values[0].value;peaks[kind]=peak;
    assert.equal(buffer.channels,1);assert.ok(buffer.length/buffer.sampleRate>=.012&&buffer.length/buffer.sampleRate<=.028);
    assert.ok(samples.every(Number.isFinite));assert.ok(peak>0&&peak<=.04,'measured source times gain stays conservative');
    assert.equal(env.api.play(kind),false);assert.equal(audio.sources.length,1);assert.equal(audio.gains.length,1,'one event owns only a source and gain');
    env.finish();assert.ok(node.disconnects>0&&gain.disconnects>0);assert.equal(env.timers.size,0);
  }
  assert.ok(peaks.type<peaks.select*.5);assert.ok(peaks.reply<peaks.select*.5);
});

test('global 45ms and independent typing/reply cooldowns drop events rather than queueing them',async()=>{
  for(const[kind,minimum]of [['select',45],['type',70],['reply',120]]){
    const env=environment();await env.unlock();assert.equal(env.api.play(kind),true);env.finish();
    env.advance(minimum-1);assert.equal(env.api.play(kind),false);env.advance(1);assert.equal(env.api.play(kind),true,kind);
    env.finish();const count=env.contexts[0].sources.length;env.advance(1000);assert.equal(env.contexts[0].sources.length,count,'dropped events never replay');
  }
  const env=environment();await env.unlock();env.api.play('type');env.finish();env.advance(45);assert.equal(env.api.play('reply'),true);env.finish();
  env.advance(25);assert.equal(env.api.play('type'),false,'a different event still shares the global gap');env.advance(20);assert.equal(env.api.play('type'),true);
});

test('a pending resume is silent and cannot play a deferred event after visibility cancellation',async()=>{
  const env=environment({deferredResume:true});env.api.unlock(gesture());const audio=env.contexts[0];
  assert.equal(env.api.play('open'),false);env.document.hidden=true;env.document.dispatchEvent({type:'visibilitychange'});
  audio.pending.shift()();await tick();assert.equal(env.api.play('open'),false);assert.equal(audio.sources.length,0);assert.equal(audio.state,'suspended','late resume cannot undo a lifecycle suspension');
  env.document.hidden=false;env.document.dispatchEvent({type:'visibilitychange'});env.advance(1000);assert.equal(audio.sources.length,0);
  env.api.unlock(gesture('keydown'));audio.pending.shift()();await tick();assert.equal(env.api.play('open'),true,'only a new gesture may unlock the returned page');
});

test('preference changes persist and sync, but enabling does not create or resume audio',async()=>{
  const env=environment({preference:'off'});assert.equal(env.api.enabled,false);await env.unlock();assert.equal(env.contexts.length,0);
  env.api.setEnabled(true);assert.equal(env.storage.get('portfolio-sound'),'on');assert.equal(env.contexts.length,0);
  await env.unlock();env.api.play('send');const audio=env.contexts[0],node=audio.sources[0],resumes=audio.resumeCalls;
  env.api.setEnabled(false);assert.equal(env.api.enabled,false);assert.equal(env.document.documentElement.dataset.sound,'off');assert.ok(node.disconnects>0);assert.equal(env.timers.size,0);
  env.api.setEnabled(true);assert.equal(audio.resumeCalls,resumes);assert.equal(env.api.play('send'),false);
  env.window.dispatchEvent({type:'storage',key:'unrelated',newValue:'off'});assert.equal(env.api.enabled,true);
  env.window.dispatchEvent({type:'storage',key:'portfolio-sound',newValue:'off',storageArea:{}});assert.equal(env.api.enabled,true,'session storage cannot change the persisted local preference');
  env.window.dispatchEvent({type:'storage',key:'portfolio-sound',newValue:'off'});assert.equal(env.api.enabled,false);
  env.window.dispatchEvent({type:'storage',key:'portfolio-sound',newValue:'on'});assert.equal(env.api.enabled,true);assert.equal(audio.resumeCalls,resumes);
  assert.ok(env.published.some(event=>event.enabled===false)&&env.published.some(event=>event.enabled===true));
});

test('voice/video quiet reasons immediately disconnect output and remain independent without delayed replay',async()=>{
  const env=environment();await env.unlock();env.api.play('select');const audio=env.contexts[0];
  env.api.setQuiet('voice',true);assert.ok(audio.sources[0].disconnects>0&&audio.gains[0].disconnects>0);assert.equal(env.timers.size,0);
  env.api.setQuiet('video',true);env.advance(1000);assert.equal(env.api.play('select'),false);
  env.api.setQuiet('voice',false);assert.equal(env.api.play('select'),false,'another active quiet reason remains in force');
  env.api.setQuiet('video',false);assert.equal(audio.sources.length,1,'unmuting is silent');assert.equal(env.api.play('select'),true);
  env.advance(100);assert.equal(env.timers.size,0);assert.ok(audio.sources.at(-1).disconnects>0,'fallback cleanup bounds nodes even without onended');
});

test('hidden and BFCache states suspend audio, clear nodes and require a new gesture on return',async()=>{
  const env=environment();await env.unlock();env.api.play('close');const audio=env.contexts[0];
  env.document.hidden=true;env.document.dispatchEvent({type:'visibilitychange'});assert.equal(audio.state,'suspended');assert.equal(env.timers.size,0);
  env.document.hidden=false;env.document.dispatchEvent({type:'visibilitychange'});assert.equal(env.api.play('close'),false);
  await env.unlock(gesture('click'));env.advance(100);assert.equal(env.api.play('close'),true);
  env.window.dispatchEvent({type:'pagehide',persisted:true});assert.equal(audio.closeCalls,0);assert.equal(audio.state,'suspended');
  env.window.dispatchEvent({type:'pageshow',persisted:true});assert.equal(env.api.play('close'),false);await env.unlock();env.advance(100);assert.equal(env.api.play('close'),true);
});

test('dispose and actual frame lifecycle close only the owned context and release all registered work',async()=>{
  const env=environment();await env.unlock();env.api.play('select');const audio=env.contexts[0];
  for(const cleanup of [...env.cleanups])cleanup();assert.equal(audio.closeCalls,1);assert.equal(env.timers.size,0);assert.equal(env.cleanups.size,0);
  assert.equal(env.document.listenerCount(),0);assert.equal(env.window.listenerCount(),1,'only the test observer remains');
  env.api.dispose();env.window.dispatchEvent({type:'pagehide',persisted:false});await env.unlock();assert.equal(audio.closeCalls,1);assert.equal(env.api.play('select'),false);
});

test('same-origin iframe facade shares parent cooldown, preference and quiet reasons without owning parent audio',async()=>{
  const parent=environment();await parent.unlock();const child=environment({parent:parent.window});
  assert.equal(child.contexts.length,0);assert.equal(child.api.play('select'),true);parent.finish();assert.equal(parent.api.play('select'),false);
  parent.advance(100);child.api.setQuiet('video',true);parent.api.setQuiet('voice',true);child.api.setQuiet('video',false);assert.equal(parent.api.play('select'),false);
  child.api.setEnabled(false);assert.equal(parent.api.enabled,false);assert.equal(child.document.documentElement.dataset.sound,'off');
  child.api.setEnabled(true);await child.unlock();parent.api.setQuiet('voice',false);await child.unlock();parent.advance(100);assert.equal(child.api.play('select'),true);
  child.api.setQuiet('video',true);child.api.dispose();assert.equal(child.contexts.length,0);assert.equal(parent.contexts[0].closeCalls,0);assert.equal(child.cleanups.size,0);
  parent.advance(100);assert.equal(parent.api.play('select'),true,'iframe disposal releases its own quiet reason without destroying the parent engine');
});

test('a hidden iframe remains paused until its next gesture and never resumes the parent itself',async()=>{
  const parent=environment();await parent.unlock();const child=environment({parent:parent.window});
  child.document.hidden=true;child.document.dispatchEvent({type:'visibilitychange'});assert.equal(parent.api.play('select'),false);
  child.document.hidden=false;child.document.dispatchEvent({type:'visibilitychange'});assert.equal(child.api.play('select'),false);
  await child.unlock();assert.equal(child.api.play('select'),true);assert.equal(child.contexts.length,0);
});

test('unsupported audio, denied storage and inaccessible ancestors fail silently without network or extra engines',async()=>{
  const inaccessible={get PortfolioSound(){throw new Error('cross origin');}};inaccessible.parent=inaccessible;
  const env=environment({unsupported:true,storageThrows:true,parent:inaccessible});assert.equal(env.api.enabled,true);
  await env.unlock();env.api.setEnabled(false);env.api.setEnabled(true);assert.equal(env.api.play('type'),false);assert.equal(env.contexts.length,0);env.api.dispose();
});
