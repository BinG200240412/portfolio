'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-voice.js'),'utf8')
  .replace("import.meta.url","'https://bing2002.com/assets/assistant-voice.js'")
  .replaceAll('export function ','function ')+'\nglobalThis.voice={record,encodeWav};';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({permission,level=.04,automaticFlush=true}={}){
  const timers=new Map(),frames=new Map(),nodes=[],levels=[],states=[],diagnostics=[],requests=[],contextEvents=new Map();let serial=0,stopped=0,closed=0;
  const track={readyState:'live',muted:false,enabled:true,stop(){stopped++;this.readyState='ended';},addEventListener(){},getSettings(){return{channelCount:1,sampleRate:48000,deviceId:'private-device-id',groupId:'private-group-id'};}};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const connect=()=>({connect(){},disconnect(){}});
  const analyser={...connect(),fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=Math.SQRT2*level*Math.sin(i*Math.PI/16);},getByteFrequencyData(a){a.fill(level?180:0);}};
  const context={sampleRate:48000,state:'running',destination:{},audioWorklet:{addModule:async()=>{}},createMediaStreamSource:connect,createAnalyser:()=>analyser,
    createGain:()=>({...connect(),gain:{value:1}}),close(){closed++;this.state='closed';return Promise.resolve();},resume:async()=>{},
    addEventListener(type,listener){contextEvents.set(type,listener);},removeEventListener(type,listener){if(contextEvents.get(type)===listener)contextEvents.delete(type);}};
  class AudioWorkletNode{constructor(_context,_name,options){Object.assign(this,connect());this.options=options;this.port={onmessage:null,postMessage:(message)=>{if(message==='stop'&&automaticFlush)queueMicrotask(()=>this.port.onmessage?.({data:{stopped:true}}));}};nodes.push(this);}}
  const sandbox={URL,Blob,Float32Array,Uint8Array,ArrayBuffer,DataView,Math,Number,Promise,Error,AudioWorkletNode,
    navigator:{mediaDevices:{getUserMedia:options=>{requests.push(options);return permission||Promise.resolve(stream);}}},performance:{now:()=>0},
    setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
    requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},
  };
  vm.runInNewContext(source,sandbox);
  return {api:sandbox.voice,context,stream,timers,frames,nodes,levels,states,diagnostics,requests,track,get stopped(){return stopped;},get closed(){return closed;},
    start(signal,options={}){return sandbox.voice.record({context,signal,onLevels:value=>levels.push(Array.from(value)),onState:value=>states.push(value),onDiagnostics:value=>diagnostics.push(value),...options});},
    frame(now){const entries=[...frames.entries()];frames.clear();for(const[,fn]of entries)fn(now);},
    setLevel(value){level=value;},
    interrupt(){context.state='suspended';contextEvents.get('statechange')?.();},
    samples(count=4800,rms=.2){const samples=Float32Array.from({length:count},(_,i)=>Math.SQRT2*rms*Math.sin(i*Math.PI/16));nodes[0].port.onmessage({data:{samples}});},
  };
}
async function wavRms(wav){const view=new DataView(await wav.arrayBuffer());let sum=0;for(let at=44;at<view.byteLength;at+=2)sum+=(view.getInt16(at,true)/32768)**2;return Math.sqrt(sum/((view.byteLength-44)/2));}

test('PCM resampling creates bounded mono 16k WAV with intact duration and signal',async()=>{
  const env=fixture();const wav=env.api.encodeWav([new Float32Array(48000).fill(.5)],48000),view=new DataView(await wav.arrayBuffer());
  assert.equal(wav.type,'audio/wav');assert.equal(wav.size,32044);assert.equal(view.getUint32(24,true),16000);assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint16(34,true),16);
  assert.equal(view.getInt16(44,true),16384);assert.equal(view.getInt16(wav.size-2,true),16384);
  const capped=env.api.encodeWav([new Float32Array(48000*21)],48000);assert.equal(capped.size,640044);
});

test('cancelling while microphone permission is pending stops a late stream and closes audio context',async()=>{
  let resolve;const env=fixture({permission:new Promise(done=>{resolve=done;})}),controller=new AbortController(),recording=env.start(controller.signal);
  const rejection=assert.rejects(recording.result,error=>error.code==='voice_cancelled');controller.abort();await rejection;
  resolve(env.stream);await tick();assert.equal(env.stopped,1);assert.equal(env.closed,1);assert.equal(env.nodes.length,0);assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);
});

test('actual recorded PCM drives dots without RAF; manual stop releases every resource',async()=>{
  const env=fixture(),recording=env.start();await tick();env.samples(14400,.0004);env.samples();
  assert.ok(env.levels.at(-1).some(value=>value>.1));assert.deepEqual(env.states,['requesting','listening']);
  recording.stop();const wav=await recording.result;assert.equal(wav.size,12844);assert.equal(env.stopped,1);assert.equal(env.closed,1);
  assert.ok(env.levels.at(-1).every(value=>value===0));assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);
});

test('captured digital silence has its own input error and never becomes an ASR empty-result error',async()=>{
  const env=fixture({level:0}),recording=env.start(),rejection=assert.rejects(recording.result,error=>error.code==='voice_input_silent');await tick();
  env.samples(4800,0);assert.ok(env.levels.at(-1).every(value=>value===0));
  [...env.timers.values()].find(timer=>timer.ms===8000).fn();await rejection;assert.equal(env.stopped,1);assert.equal(env.closed,1);assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);
});

test('a manual stop without any PCM is a capture error, not silence or an ASR empty result',async()=>{
  const env=fixture(),recording=env.start(),rejection=assert.rejects(recording.result,error=>error.code==='voice_capture_error');await tick();recording.stop();await rejection;
  assert.equal(env.stopped,1);assert.equal(env.closed,1);assert.equal(env.timers.size,0);
});

test('manual stop accepts quiet captured speech even when the analyser never crosses its activity gate',async()=>{
  const env=fixture({level:.006}),recording=env.start();await tick();env.samples(24000,.006);env.frame(40);
  recording.stop();const wav=await recording.result;
  assert.equal(wav.size,16044);assert.ok(await wavRms(wav)>.005,'quiet PCM must not be discarded by the display gate');
  assert.equal(env.stopped,1);assert.equal(env.closed,1);
});

test('quiet speech above the room floor ends after a genuine pause, with bounded gain',async()=>{
  const env=fixture({level:0}),recording=env.start();await tick();env.samples(14400,.0004);env.samples(24000,.006);
  assert.ok(env.levels.at(-1).some(value=>value>.05),'quiet speech is visible even if the separate analyser is silent');
  assert.ok(![...env.timers.values()].some(timer=>timer.ms===8000),'quiet sustained speech clears the no-speech timer');
  env.samples(72000,.0004);
  assert.ok(!env.states.includes('stopping'),'a gap between words should not end the utterance');
  env.samples(19200,.0004);const wav=await recording.result,level=await wavRms(wav);
  assert.ok(level>.01&&level<.037,'gain makes quiet speech usable without arbitrary amplification');
  assert.equal(env.stopped,1);assert.equal(env.frames.size,0);
});

test('steady room noise leaves every dot off and PCM timeout fallback does not amplify it',async()=>{
  const env=fixture(),recording=env.start();await tick();env.samples(96000,.003);
  assert.ok(env.levels.at(-1).every(value=>value===0),'stationary room noise must not leave a lit baseline');
  const timer=[...env.timers.values()].find(timer=>timer.ms===8000);assert.ok(timer,'steady fan noise must not clear the no-speech timer');
  timer.fn();const level=await wavRms(await recording.result);assert.ok(level>.0029&&level<.0031,'PCM fallback preserves the actual room-noise level for ASR to judge');
  assert.equal(env.diagnostics.at(-1).heard,false);assert.equal(env.stopped,1);
});

test('speech already present at startup is not discarded by the eight-second VAD timeout',async()=>{
  const env=fixture(),recording=env.start();await tick();env.samples(96000,.0006);
  assert.equal(env.diagnostics.at(-1).heard,false);[...env.timers.values()].find(timer=>timer.ms===8000).fn();
  const wav=await recording.result;assert.ok(await wavRms(wav)>.0005);assert.equal(env.stopped,1);
});

test('listening requires actual worklet PCM; absent or stalled PCM fails explicitly',async()=>{
  const absent=fixture(),recording=absent.start(),noInput=assert.rejects(recording.result,error=>error.code==='voice_capture_error');await tick();
  assert.deepEqual(absent.states,['requesting']);[...absent.timers.values()].find(timer=>timer.ms===3000).fn();await noInput;
  const stalled=fixture(),second=stalled.start(),interrupted=assert.rejects(second.result,error=>error.code==='voice_interrupted');await tick();stalled.samples();
  assert.equal(stalled.states.at(-1),'listening');[...stalled.timers.values()].find(timer=>timer.ms===3000).fn();await interrupted;
  assert.equal(absent.stopped,1);assert.equal(stalled.stopped,1);assert.equal(stalled.timers.size,0);
});

test('diagnostics expose signal state without device identifiers and selected input stays optional',async()=>{
  const env=fixture(),recording=env.start(undefined,{deviceId:'chosen-test-device',processing:false});await tick();env.samples();
  assert.equal(env.requests[0].audio.deviceId.exact,'chosen-test-device');assert.equal(env.requests[0].audio.noiseSuppression,false);
  assert.ok(env.diagnostics.some(value=>value.stage==='pcm'&&value.frames===4800&&value.rms>0));
  assert.ok(!JSON.stringify(env.diagnostics).includes('private-device-id'));assert.ok(!JSON.stringify(env.diagnostics).includes('private-group-id'));
  recording.stop();await recording.result;
});

test('manual stop waits for a quiet final worklet batch instead of rejecting before its flush',async()=>{
  const env=fixture({level:.006,automaticFlush:false}),recording=env.start();await tick();recording.stop();
  assert.equal(env.states.at(-1),'stopping');assert.equal(env.stopped,0);
  env.samples(4800,.006);env.nodes[0].port.onmessage({data:{stopped:true}});
  const wav=await recording.result;assert.equal(wav.size,3244);assert.ok(await wavRms(wav)>.005);
  assert.equal(env.nodes[0].port.onmessage,null);assert.equal(env.timers.size,0);assert.equal(env.stopped,1);
});

test('a failed processor or interrupted audio context releases capture and reports a capture failure',async()=>{
  for(const [trigger,code]of [[env=>env.nodes[0].onprocessorerror(),'voice_capture_error'],[env=>env.interrupt(),'voice_interrupted']]){
    const env=fixture(),recording=env.start(),rejection=assert.rejects(recording.result,error=>error.code===code);await tick();trigger(env);await rejection;
    assert.equal(env.stopped,1);assert.equal(env.closed,1);assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);assert.equal(env.nodes[0].onprocessorerror,null);
  }
});

test('AudioWorklet batches samples, caps recording at twenty seconds and acknowledges manual flush',()=>{
  const worklet=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-audio-worklet.js'),'utf8');let Processor;
  class AudioWorkletProcessor{constructor(){this.messages=[];this.port={postMessage:message=>this.messages.push(message)};}}
  vm.runInNewContext(worklet,{AudioWorkletProcessor,Float32Array,sampleRate:16000,Math,registerProcessor(_name,klass){Processor=klass;}});
  const node=new Processor(),audio=new Float32Array(128).fill(.3);
  for(let i=0;i<2600;i++)node.process([[audio]]);
  assert.equal(node.messages.filter(message=>message.samples).reduce((sum,message)=>sum+message.samples.length,0),320000);assert.equal(node.messages.at(-1).limit,true);
  const manual=new Processor();manual.process([[audio]]);manual.port.onmessage({data:'stop'});assert.equal(manual.messages.find(message=>message.samples).samples.length,128);assert.equal(manual.messages.at(-1).stopped,true);
});

test('AudioWorklet captures a live right channel and avoids opposite-phase stereo cancellation',()=>{
  const worklet=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-audio-worklet.js'),'utf8');let Processor;
  class AudioWorkletProcessor{constructor(){this.messages=[];this.port={postMessage:message=>this.messages.push(message)};}}
  vm.runInNewContext(worklet,{AudioWorkletProcessor,Float32Array,sampleRate:16000,Math,registerProcessor(_name,klass){Processor=klass;}});
  for(const opposite of [false,true]){
    const node=new Processor(),right=new Float32Array(128).fill(.1),left=new Float32Array(128).fill(opposite?-.1:0),output=new Float32Array(128);
    node.process([[left,right]],[[output]]);node.port.onmessage({data:'stop'});
    const samples=node.messages.find(message=>message.samples).samples;
    assert.ok(samples.every(sample=>Math.abs(sample)>.09));assert.ok(output.every(sample=>Math.abs(sample)>.09));
    assert.equal(node.messages.find(message=>message.channels===2).channel,opposite?0:1);
  }
});
