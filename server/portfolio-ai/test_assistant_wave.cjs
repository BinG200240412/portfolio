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

function columns(env){
 const result=new Map();for(const dot of env.dots()){
  const x=Number(dot.attributes.cx);if(!result.has(x))result.set(x,[]);result.get(x).push(dot);
 }return result;
}
function centered(env){
 for(const dots of columns(env).values()){
  const positions=new Map(dots.map(dot=>[Number(dot.attributes.cy),dot.attributes.opacity]));
  for(const[y,opacity]of positions)assert.equal(positions.get(48-y),opacity,'each upper bead has an equally bright lower partner');
  assert.equal((Math.min(...positions.keys())+Math.max(...positions.keys()))/2,24);
 }
}

test('the 27 real audio bands become fixed, centred columns of uniform lit circles without idle dots',()=>{
 const env=fixture();env.api.start();assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);
 const input=Array.from({length:27},(_,i)=>.08+i*.028);env.api.setLevels(input);
 for(let elapsed=0;elapsed<640;elapsed+=80){env.api.setLevels(input);env.advance(80);}
 assert.equal(columns(env).size,27);centered(env);
 assert.equal(env.svg.attributes.viewBox,'0 0 320 48');assert.equal(env.svg.attributes.fill,'none');
 assert.ok(env.dots().every(dot=>dot.tagName==='circle'&&dot.attributes.r==='1.1'&&Number(dot.attributes.cy)>=4&&Number(dot.attributes.cy)<=44));
 assert.deepEqual([...columns(env).keys()].sort((a,b)=>a-b),Array.from({length:27},(_,i)=>4+i*12));
 assert.ok(Math.max(...columns(env).get(316).map(dot=>Number(dot.attributes.cy)))>Math.max(...columns(env).get(4).map(dot=>Number(dot.attributes.cy))),'bar length follows its own band');
 assert.deepEqual(env.lit,[true]);env.api.destroy();
});

test('unequal input bands remain independent and silent bands never acquire baseline beads',()=>{
 const env=fixture();env.api.start();const input=Array(27).fill(0);input[2]=.12;input[19]=.9;
 for(let elapsed=0;elapsed<800;elapsed+=80){env.api.setLevels(input);env.advance(80);}
 assert.deepEqual([...columns(env).keys()].sort((a,b)=>a-b),[28,232]);centered(env);
 const quiet=Math.max(...columns(env).get(28).map(dot=>Math.abs(Number(dot.attributes.cy)-24)));
 const loud=Math.max(...columns(env).get(232).map(dot=>Math.abs(Number(dot.attributes.cy)-24)));
 assert.ok(loud>quiet+8);env.api.destroy();
});

test('real volume changes ease through edge-bead brightness instead of flashing the whole visual',()=>{
 const env=fixture();env.api.start();env.speak(.7,400);const before=excursion(env);
 env.api.setLevels(Array(27).fill(0));env.advance(80);assert.ok(env.dots().length>0,'a pause decays rather than disappearing in one frame');centered(env);
 assert.ok(env.dots().some(dot=>Number(dot.attributes.opacity)>0&&Number(dot.attributes.opacity)<.9),'edge pairs soften length transitions');
 assert.ok(excursion(env)<=before);env.advance(1400);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);assert.deepEqual(env.lit,[true,false]);env.api.destroy();
});

test('louder voice increases amplitude without moving any column sideways',()=>{
 const quiet=fixture(),loud=fixture();quiet.api.start();loud.api.start();quiet.speak(.07,640);loud.speak(.9,640);
 assert.ok(excursion(loud)>excursion(quiet)+8);assert.deepEqual([...columns(quiet).keys()].sort((a,b)=>a-b),[...columns(loud).keys()].sort((a,b)=>a-b));
 quiet.api.destroy();loud.api.destroy();
});

test('stale producer updates decay to complete silence and release the animation frame',()=>{
 const env=fixture();env.api.start();env.api.setLevels([.8]);env.advance(2200);
 assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});

test('stop, hidden pages and destroy cancel frames and cannot revive old audio',()=>{
 const env=fixture();env.api.start();env.speak(.6,400);env.hidden(true);
 assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);env.api.setLevels([1]);env.advance(500);assert.equal(env.dots().length,0);
 env.hidden(false);assert.equal(env.frames.size,0);env.speak(.6,240);assert.ok(env.dots().length>0);
 env.api.stop();assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);env.api.setLevels([1]);env.advance(200);assert.equal(env.dots().length,0);
 env.api.start();env.advance(160);assert.ok(env.dots().length>0);env.api.destroy();assert.equal(env.frames.size,0);assert.equal(env.listeners.size,0);assert.equal(env.svg.children.length,0);
 env.api.start();env.api.setLevels([1]);env.advance(200);assert.equal(env.svg.children.length,0);
});

test('reduced motion keeps the same centred audio information, slower updates, and no idle matrix',()=>{
 const env=fixture({reduced:true});env.api.start();env.api.setLevels([NaN,-1,Infinity]);env.advance(200);assert.equal(env.dots().length,0);
 env.speak(.6,720);assert.equal(columns(env).size,27);centered(env);assert.ok(env.dots().every(dot=>dot.attributes.r==='1.1'));
 env.api.setLevels(null);env.advance(2000);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});
