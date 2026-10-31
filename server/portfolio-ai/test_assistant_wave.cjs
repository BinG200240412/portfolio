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
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];}
  appendChild(child){this.children.push(child);child.parentElement=this;return child;}
  append(...children){for(const child of children)this.appendChild(child);}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...children);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;}}
 }
 const document={hidden:false,createElementNS(_namespace,name){return new Element(name);},addEventListener(type,handler){listeners.set(type,handler);},removeEventListener(type,handler){if(listeners.get(type)===handler)listeners.delete(type);}};
 const svg=new Element('svg');
 const sandbox={Math,Number,Map,Set,Object,TypeError,performance:{now:()=>now},requestAnimationFrame(callback){const id=++serial;frames.set(id,callback);return id;},cancelAnimationFrame(id){frames.delete(id);}};
 vm.runInNewContext(source,sandbox);
 const api=sandbox.createVoiceWave(svg,{isReducedMotion:()=>reduced,onLit:value=>lit.push(value)});
 const frameNow=()=>{const current=[...frames.values()];frames.clear();for(const callback of current)callback(now);};
 return{api,svg,frames,listeners,lit,document,
  dots(){return descendants(svg).filter(node=>node.tagName==='circle');},
  advance(ms){const until=now+ms;while(now<until){now=Math.min(until,now+16);frameNow();}},
  elapse(ms){now+=ms;},frameNow,
  speak(level,ms){for(let elapsed=0;elapsed<ms;elapsed+=80){api.setLevels(Array(27).fill(level));this.advance(Math.min(80,ms-elapsed));}},
  hidden(value){document.hidden=value;listeners.get('visibilitychange')?.();},
 };
}
function descendants(root){const result=[];for(const child of root.children){result.push(child,...descendants(child));}return result;}
// Read the public SVG geometry, including ancestor translations. No renderer
// state or sampling implementation is imported into the test harness.
function xPosition(node){
 let x=Number(node.attributes.cx||0);
 for(let current=node;current;current=current.parentElement){
  const transform=current.attributes.transform||'';
  for(const match of transform.matchAll(/translate\(\s*([-+\d.eE]+)(?:[ ,]+[-+\d.eE]+)?\s*\)/g))x+=Number(match[1]);
 }
 return x;
}
function samples(env){
 return descendants(env.svg).filter(node=>Object.hasOwn(node.attributes,'data-voice-sample')).map(node=>{
  const dots=descendants(node).filter(child=>child.tagName==='circle');
  return{id:node.attributes['data-voice-sample'],node,x:xPosition(node),dots,
   amplitude:Math.max(0,...dots.map(dot=>Math.abs(Number(dot.attributes.cy)-24))),
   glyph:dots.map(dot=>[dot.attributes.cx,dot.attributes.cy,dot.attributes.r,dot.attributes.opacity]).sort((a,b)=>Number(a[1])-Number(b[1])),
  };
 });
}
const visible=env=>samples(env).filter(sample=>sample.x>=-1.1&&sample.x<=321.1);
function centered(env){
 for(const sample of samples(env)){
  const positions=new Map(sample.dots.map(dot=>[Number(dot.attributes.cy),dot.attributes.opacity]));assert.ok(positions.size>0);
  for(const[y,opacity]of positions)assert.equal(positions.get(48-y),opacity,'every upper bead has an equally bright lower partner');
  assert.equal((Math.min(...positions.keys())+Math.max(...positions.keys()))/2,24);
 }
}
const ids=env=>new Set(samples(env).map(sample=>sample.id));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];

test('voiced time samples enter from the right as centred columns of equal round LEDs, with no idle grid',()=>{
 const env=fixture();env.api.start();assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);
 env.speak(.65,640);const bars=visible(env);assert.ok(bars.length>=4&&bars.length<=10);centered(env);
 assert.equal(env.svg.attributes.viewBox,'0 0 320 48');assert.equal(env.svg.attributes.fill,'none');
 assert.ok(env.dots().every(dot=>dot.tagName==='circle'&&dot.attributes.r==='1.1'&&Number(dot.attributes.cy)>=4&&Number(dot.attributes.cy)<=44));
 const xs=bars.map(bar=>bar.x).sort((a,b)=>a-b);assert.ok(Math.min(...xs)>255,'a short utterance starts at the right, not as a full-width spectrum');
 for(let i=1;i<xs.length;i++)assert.ok(Math.abs(xs[i]-xs[i-1]-6)<.05,'adjacent time samples keep equal spacing');
 assert.deepEqual(env.lit,[true]);env.api.destroy();
});

test('quiet/loud/quiet speech forms a spatial history rather than resizing every column together',()=>{
 const env=fixture();env.api.start();env.speak(.08,800);const first=ids(env);
 env.speak(.9,800);const second=new Set(samples(env).filter(bar=>!first.has(bar.id)).map(bar=>bar.id));
 const beforeThird=ids(env);env.speak(.08,800);const third=new Set(samples(env).filter(bar=>!beforeThird.has(bar.id)).map(bar=>bar.id));
 const bars=visible(env),a=bars.filter(bar=>first.has(bar.id)),b=bars.filter(bar=>second.has(bar.id)),c=bars.filter(bar=>third.has(bar.id));
 assert.ok(a.length>=4&&b.length>=4&&c.length>=4);centered(env);
 assert.ok(median(a.map(bar=>bar.x))<median(b.map(bar=>bar.x))&&median(b.map(bar=>bar.x))<median(c.map(bar=>bar.x)),'earlier sound remains left of later sound');
 assert.ok(median(b.slice(-5).map(bar=>bar.amplitude))>median(a.slice(-5).map(bar=>bar.amplitude))+8);
 assert.ok(median(b.slice(-5).map(bar=>bar.amplitude))>median(c.slice(-5).map(bar=>bar.amplitude))+8);
 env.api.destroy();
});

test('past samples keep their original heights and opacity when new input becomes silent',()=>{
 const env=fixture();env.api.start();env.speak(.8,720);const old=visible(env).at(-3);assert.ok(old);
 env.api.setLevels(Array(27).fill(0));env.advance(640);const shifted=samples(env).find(bar=>bar.id===old.id);assert.ok(shifted);
 assert.deepEqual(shifted.glyph,old.glyph,'only a sample position changes after it is drawn');
 assert.ok(Math.abs((old.x-shifted.x)-48)<2,'history moves at about75 pixels/second');assert.deepEqual(env.lit,[true]);
 env.advance(5200);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);assert.deepEqual(env.lit,[true,false]);env.api.destroy();
});

test('history travels between PCM callbacks with fractional motion instead of flashing in eighty-millisecond jumps',()=>{
 const env=fixture();env.api.start();env.speak(.7,240);const tracked=visible(env).at(-2);assert.ok(tracked);let previous=tracked.x;const deltas=[],positions=[];
 for(let i=0;i<8;i++){
  env.advance(16);const bar=samples(env).find(sample=>sample.id===tracked.id);assert.ok(bar);assert.deepEqual(bar.glyph,tracked.glyph);
  deltas.push(previous-bar.x);positions.push(bar.x);previous=bar.x;
 }
 assert.ok(deltas.filter(delta=>delta>.01).length>=4,'the trace continues moving while the microphone has not delivered its next batch');
 assert.ok(deltas.every(delta=>delta>=-.01&&delta<5),'motion advances less than a whole sample spacing');
 assert.ok(positions.some(x=>Math.abs(x-Math.round(x))>.01),'subpixel translation keeps scrolling smooth');env.api.destroy();
});

test('a short syllable between animation frames is retained in the next history sample',()=>{
 const env=fixture();env.api.start();env.api.setLevels(Array(27).fill(.9));env.elapse(20);env.api.setLevels(Array(27).fill(0));env.advance(180);
 assert.ok(visible(env).some(bar=>bar.amplitude>0),'a later silent callback must not erase a voiced bucket before its animation frame');
 env.advance(6000);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});

test('a stale producer stops adding voice and the existing history eventually exits completely',()=>{
 const env=fixture();env.api.start();env.api.setLevels(Array(27).fill(.8));env.advance(6400);
 assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});

test('a stalled animation does not replay a backlog of fictional fresh samples',()=>{
 const env=fixture();env.api.start();env.speak(.8,160);const previousIds=ids(env);
 env.elapse(2000);env.api.setLevels(Array(27).fill(.8));env.frameNow();const additions=samples(env).filter(bar=>!previousIds.has(bar.id));
 assert.ok(additions.length<=2,'resume skips old sampling slots after a long frame gap');
 env.speak(.8,240);assert.ok(visible(env).length>0);centered(env);env.api.destroy();
});

test('reduced motion keeps the same history, but moves only at sample boundaries',()=>{
 const env=fixture({reduced:true});env.api.start();env.speak(.6,320);const old=visible(env).at(-2);assert.ok(old);centered(env);
 env.advance(32);const held=samples(env).find(bar=>bar.id===old.id);assert.ok(held);assert.ok(Math.abs(held.x-old.x)<.01,'no interpolated sweep between sample boundaries');assert.deepEqual(held.glyph,old.glyph);
 env.advance(64);const moved=samples(env).find(bar=>bar.id===old.id);assert.ok(moved);assert.ok(Math.abs((old.x-moved.x)-6)<.05);assert.deepEqual(moved.glyph,old.glyph);
 env.api.setLevels(null);env.advance(6000);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);env.api.destroy();
});

test('stop, hidden pages and destroy cancel frames and cannot revive old audio',()=>{
 const env=fixture();env.api.start();env.api.setLevels([NaN,-1,Infinity]);env.advance(200);assert.equal(env.dots().length,0);assert.equal(env.frames.size,0);
 env.speak(.6,400);env.hidden(true);assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);
 env.api.setLevels([1]);env.advance(500);assert.equal(env.dots().length,0);env.hidden(false);assert.equal(env.frames.size,0);
 env.speak(.6,240);assert.ok(env.dots().length>0);env.api.stop();assert.equal(env.frames.size,0);assert.equal(env.dots().length,0);
 env.api.setLevels([1]);env.advance(200);assert.equal(env.dots().length,0);env.api.start();env.advance(160);assert.ok(env.dots().length>0);
 env.api.destroy();assert.equal(env.frames.size,0);assert.equal(env.listeners.size,0);assert.equal(env.svg.children.length,0);env.api.start();env.api.setLevels([1]);env.advance(200);assert.equal(env.svg.children.length,0);
});
