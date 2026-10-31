'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../assets/assistant-wave.js'),'utf8')
 .replace('export function createVoiceWave','function createVoiceWave')+'\nglobalThis.createVoiceWave=createVoiceWave;';
function fixture({reduced=false}={}){
 let now=0,serial=0;const frames=new Map(),listeners=new Map(),lit=[];
 class Element{
  constructor(name){this.tagName=name;this.attributes={};this.children=[];this.parentElement=null;this.ownerDocument=document;}
  setAttribute(name,value){this.attributes[name]=value;}
  appendChild(child){this.children.push(child);child.parentElement=this;}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];for(const child of children)this.appendChild(child);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;}}
 }
 const document={hidden:false,createElementNS(_namespace,name){return new Element(name);},addEventListener(type,handler){listeners.set(type,handler);},removeEventListener(type,handler){if(listeners.get(type)===handler)listeners.delete(type);}};
 const svg=new Element('svg');
 const sandbox={Math,Number,Map,Set,Object,TypeError,performance:{now:()=>now},requestAnimationFrame(callback){const id=++serial;frames.set(id,callback);return id;},cancelAnimationFrame(id){frames.delete(id);}};
 vm.runInNewContext(source,sandbox);
 const api=sandbox.createVoiceWave(svg,{isReducedMotion:()=>reduced,onLit:value=>lit.push(value)});
 return{api,svg,frames,listeners,lit,document,
  dots(){return svg.children.flatMap(layer=>layer.children);},
  advance(ms){const until=now+ms;while(now<until){now=Math.min(until,now+16);const current=[...frames.values()];frames.clear();for(const callback of current)callback(now);}},
  speak(level,ms){for(let elapsed=0;elapsed<ms;elapsed+=80){api.setLevels(Array(27).fill(level));this.advance(Math.min(80,ms-elapsed));}},
  hidden(value){document.hidden=value;listeners.get('visibilitychange')?.();},
 };
}
function excursion(env){return Math.max(0,...env.dots().map(dot=>Math.abs(Number(dot.attributes.cy)-24)));}

test('a real input envelope paints a left-to-right time trace of equal circles without a base matrix',()=>{
 const env=fixture();env.api.start();assert.equal(env.frames.size,0,'silence needs no idle animation');
 env.speak(.65,560);const dots=env.dots();assert.ok(dots.length>8&&dots.length<180);
 assert.equal(env.svg.attributes.viewBox,'0 0 320 48');assert.equal(env.svg.attributes.fill,'none');
 assert.equal(new Set(dots.map(dot=>dot.attributes.r)).size,1);assert.equal(dots[0].attributes.r,'1.1');
 const xs=dots.map(dot=>Number(dot.attributes.cx));assert.equal(Math.min(...xs),4);assert.ok(Math.max(...xs)>44,'new samples advance through time rather than pulsing all columns');
 assert.ok(dots.every(dot=>dot.tagName==='circle'&&Number(dot.attributes.cy)>=4&&Number(dot.attributes.cy)<=44));
 assert.deepEqual(env.lit,[true],'one speech burst must not flash its whole container on and off');env.api.destroy();
});

test('louder input increases vertical excursion while the sampling pace stays the same',()=>{
 const quiet=fixture(),loud=fixture();quiet.api.start();loud.api.start();quiet.speak(.07,1120);loud.speak(.9,1120);
 assert.ok(excursion(loud)>excursion(quiet)+8,'amplitude follows actual volume');
 assert.equal(Math.max(...quiet.dots().map(dot=>Number(dot.attributes.cx))),Math.max(...loud.dots().map(dot=>Number(dot.attributes.cx))));
 quiet.api.destroy();loud.api.destroy();
});

test('silence lets the short trail recede completely, then releases the animation frame',()=>{
 const env=fixture();env.api.start();env.speak(.7,640);const before=env.dots().length;
 env.api.setLevels(Array(27).fill(0));env.advance(320);assert.ok(env.dots().length>0,'a short trail remains instead of blinking off');
 env.advance(2400);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);assert.deepEqual(env.lit,[true,false]);assert.ok(before>0);
 env.api.destroy();
});

test('missing producer updates cannot keep an old voice waveform moving forever',()=>{
 const env=fixture();env.api.start();env.api.setLevels([.8]);env.advance(3000);
 assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});

test('stop, hidden pages and destroy cancel frames and do not revive stale audio',()=>{
 const env=fixture();env.api.start();env.speak(.6,400);env.hidden(true);
 assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);env.api.setLevels([1]);env.advance(500);assert.equal(env.dots().length,0);
 env.hidden(false);assert.equal(env.frames.size,0);env.speak(.6,240);assert.ok(env.dots().length>0,'fresh voice can resume');
 env.api.stop();assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);env.api.setLevels([1]);env.advance(200);assert.equal(env.dots().length,0);
 env.api.start();env.advance(160);assert.ok(env.dots().length>0);env.api.destroy();assert.equal(env.frames.size,0);assert.equal(env.listeners.size,0);assert.equal(env.svg.children.length,0);
 env.api.start();env.api.setLevels([1]);env.advance(200);assert.equal(env.svg.children.length,0);
});

test('reduced motion keeps a compact fixed trace and invalid levels never light a baseline',()=>{
 const env=fixture({reduced:true});env.api.start();env.api.setLevels([NaN,-1,Infinity]);env.advance(200);assert.equal(env.dots().length,0);
 env.speak(.6,720);const xs=env.dots().map(dot=>Number(dot.attributes.cx));assert.ok(xs.length>0);assert.ok(Math.min(...xs)>=140&&Math.max(...xs)<=176,'no sweep under reduced motion');
 env.api.setLevels(null);env.advance(1800);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});
