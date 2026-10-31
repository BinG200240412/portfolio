'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-voice.js'),'utf8')
  .replace("import.meta.url","'https://bing2002.com/assets/assistant-voice.js'")
  .replaceAll('export function ','function ')+'\nglobalThis.voice={record,encodeWav};';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({permission,level=.04}={}){
  const timers=new Map(),frames=new Map(),nodes=[],levels=[],states=[];let serial=0,stopped=0,closed=0;
  const track={stop(){stopped++;},addEventListener(){}};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const connect=()=>({connect(){},disconnect(){}});
  const analyser={...connect(),fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData(a){a.fill(level);},getByteFrequencyData(a){a.fill(level?180:0);}};
  const context={sampleRate:48000,state:'running',destination:{},audioWorklet:{addModule:async()=>{}},createMediaStreamSource:connect,createAnalyser:()=>analyser,
    createGain:()=>({...connect(),gain:{value:1}}),close(){closed++;this.state='closed';return Promise.resolve();},resume:async()=>{}};
  class AudioWorkletNode{constructor(){Object.assign(this,connect());this.port={onmessage:null,postMessage:(message)=>{if(message==='stop')queueMicrotask(()=>this.port.onmessage?.({data:{stopped:true}}));}};nodes.push(this);}}
  const sandbox={URL,Blob,Float32Array,Uint8Array,ArrayBuffer,DataView,Math,Number,Promise,Error,AudioWorkletNode,
    navigator:{mediaDevices:{getUserMedia:()=>permission||Promise.resolve(stream)}},performance:{now:()=>0},
    setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
    requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},
  };
  vm.runInNewContext(source,sandbox);
  return {api:sandbox.voice,context,stream,timers,frames,nodes,levels,states,track,get stopped(){return stopped;},get closed(){return closed;},
    start(signal){return sandbox.voice.record({context,signal,onLevels:value=>levels.push(Array.from(value)),onState:value=>states.push(value)});},
    frame(now){const entries=[...frames.entries()];frames.clear();for(const[,fn]of entries)fn(now);},
    samples(count=4800){nodes[0].port.onmessage({data:{samples:new Float32Array(count).fill(.2)}});},
  };
}

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

test('actual analyser samples drive dots; manual stop returns audio and releases every resource',async()=>{
  const env=fixture(),recording=env.start();await tick();env.samples();env.frame(40);
  assert.ok(env.levels.at(-1).some(value=>value>.1));assert.deepEqual(env.states,['requesting','listening']);
  recording.stop();const wav=await recording.result;assert.equal(wav.size,3244);assert.equal(env.stopped,1);assert.equal(env.closed,1);
  assert.ok(env.levels.at(-1).every(value=>value===0));assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);
});

test('silence produces no pretend waveform and times out without uploading audio',async()=>{
  const env=fixture({level:0}),recording=env.start(),rejection=assert.rejects(recording.result,error=>error.code==='voice_empty');await tick();
  env.frame(40);assert.ok(env.levels.at(-1).every(value=>value===0));
  [...env.timers.values()].find(timer=>timer.ms===8000).fn();await rejection;assert.equal(env.stopped,1);assert.equal(env.closed,1);assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);
});

test('AudioWorklet batches samples, caps recording at twenty seconds and acknowledges manual flush',()=>{
  const worklet=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-audio-worklet.js'),'utf8');let Processor;
  class AudioWorkletProcessor{constructor(){this.messages=[];this.port={postMessage:message=>this.messages.push(message)};}}
  vm.runInNewContext(worklet,{AudioWorkletProcessor,Float32Array,sampleRate:16000,Math,registerProcessor(_name,klass){Processor=klass;}});
  const node=new Processor(),audio=new Float32Array(128).fill(.3);
  for(let i=0;i<2600;i++)node.process([[audio]]);
  assert.equal(node.messages.filter(message=>message.samples).reduce((sum,message)=>sum+message.samples.length,0),320000);assert.equal(node.messages.at(-1).limit,true);
  const manual=new Processor();manual.process([[audio]]);manual.port.onmessage({data:'stop'});assert.equal(manual.messages[0].samples.length,128);assert.equal(manual.messages.at(-1).stopped,true);
});
