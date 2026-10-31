'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');
const bridgeSource = fs.readFileSync(path.join(root, 'assets/assistant-connection.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'assets/portfolio-assistant.js'), 'utf8');
const hostedSource = fs.readFileSync(path.join(root, 'assets/assistant-hosted.js'), 'utf8');
const question = [{ role: 'user', content: '介绍一下数独' }];
const token = 'csrf_token_for_test_0123456789';
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const ok = (text = '这是作品集中的数独项目。') => response({ status: 'ok', message: { role: 'assistant', content: text } });
const session = (value = token) => response({ status: 'ok', csrfToken: value });
const error = (code, status = 429) => response({ status: 'error', error: { code } }, status);
const json = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve: value => resolve(value) }; };

function bridge(fetchImpl, origin = 'https://bing2002.com') {
  const calls = [], timers = new Map(); let serial = 0;
  const context = {
    window: {}, Blob, location: { origin, href: origin + '/?lang=zh' }, URL, AbortController,
    setTimeout(fn, ms) { const id = ++serial; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, options) => { calls.push({ url, options }); return fetchImpl(url, options, calls.length); },
  };
  vm.runInNewContext(bridgeSource, context);
  return { api: context.window.PortfolioAssistantConnection, calls, timers, context };
}

test('production bootstrap enables the hosted transport without requests and leaves other origins disconnected', () => {
  for (const origin of ['https://bing2002.com', 'https://www.bing2002.com', 'http://127.0.0.1:4176', 'https://other.example', 'https://bing2002.com.evil.example']) {
    const env = bridge(() => assert.fail('bootstrap must not send requests'), origin);
    vm.runInNewContext(hostedSource, env.context);
    assert.equal(env.api.mode, ['https://bing2002.com', 'https://www.bing2002.com'].includes(origin) ? 'transport' : 'not_connected');
    assert.equal(env.calls.length, 0);
  }
});

test('disconnected by default; explicit production activation makes no network requests', async () => {
  const env = bridge(() => assert.fail('unexpected fetch'));
  assert.equal(env.api.mode, 'not_connected');
  assert.equal((await env.api.reply(question)).status, 'not_connected');
  assert.equal(env.api.configureHosted().mode, 'transport');
  assert.equal(env.calls.length, 0);
  env.api.configure(); assert.equal(env.api.mode, 'not_connected');
});

test('hosted origins are exact; original same-origin endpoint validation remains strict', () => {
  for (const origin of ['http://127.0.0.1:4176', 'https://bing2002.com.evil.example', 'http://bing2002.com', 'https://other.example']) {
    const env = bridge(() => {}, origin);
    assert.throws(() => env.api.configureHosted(), /production portfolio origin/);
    assert.equal(env.api.mode, 'not_connected');
  }
  const env = bridge(() => {}, 'https://www.bing2002.com');
  assert.equal(env.api.configureHosted().mode, 'transport');
  const own = bridge(() => {});
  assert.equal(own.api.configure({ endpoint: '/local-ai' }).mode, 'endpoint');
  for (const endpoint of ['https://ai.bing2002.com/portfolio-ai/chat', 'https://user:pass@bing2002.com/chat', '/chat#secret', 'javascript:alert(1)']) {
    assert.throws(() => own.api.configure({ endpoint }), /this origin/);
  }
});

test('session is lazy, POST only, credentialed, cached in memory; reply body is not interpreted as markup', async () => {
  const env = bridge((_url, _options, n) => n === 1 ? session() : ok('<script>unsafe()</script>'));
  env.api.configureHosted();
  const first = await env.api.reply(question);
  assert.equal(first.message.content, '<script>unsafe()</script>');
  await env.api.reply(question);
  assert.equal(env.calls.length, 3);
  assert.equal(env.calls[0].url, 'https://ai.bing2002.com/portfolio-ai/session');
  assert.deepEqual(JSON.parse(env.calls[0].options.body), { version: 1 });
  for (const call of env.calls) {
    assert.equal(call.options.method, 'POST'); assert.equal(call.options.credentials, 'include');
    assert.equal(call.options.cache, 'no-store'); assert.equal(call.options.redirect, 'error');
    assert.ok(call.options.signal);
  }
  assert.equal(env.calls[1].options.headers['X-CSRF-Token'], token);
  assert.deepEqual(JSON.parse(env.calls[1].options.body), { version: 1, messages: question });
  assert.equal(env.timers.size, 0);
});

test('only invalid_session retries once, with a freshly issued session token', async () => {
  const env = bridge((_url, _options, n) => [session(), error('invalid_session', 403), session(token + '_new'), ok()][n - 1]);
  env.api.configureHosted(); assert.equal((await env.api.reply(question)).status, 'ok');
  assert.equal(env.calls.length, 4);
  assert.equal(env.calls[3].options.headers['X-CSRF-Token'], token + '_new');
  const repeated = bridge((_url, _options, n) => n % 2 ? session() : error('invalid_session', 403));
  repeated.api.configureHosted();
  assert.equal((await repeated.api.reply(question)).error.code, 'invalid_session');
  assert.equal(repeated.calls.length, 4);
});

test('rate, budget, busy, upstream and timeout responses are preserved without paid retries', async () => {
  for (const code of ['rate_limited', 'budget_exhausted', 'busy', 'upstream_error', 'timeout', 'not_configured']) {
    const env = bridge((_url, _options, n) => n === 1 ? session() : error(code, 503));
    env.api.configureHosted();
    const result = await env.api.reply(question);
    assert.equal(result.error.code, code); assert.equal(result.error.httpStatus, 503);
    assert.equal(env.calls.length, 2, code);
  }
  const noKey = bridge(() => error('not_configured', 503)); noKey.api.configureHosted();
  assert.equal((await noKey.api.reply(question)).error.code, 'not_configured');
  assert.equal(noKey.calls.length, 1);
});

test('malformed session, invalid JSON, and success envelopes on HTTP errors do not become replies', async () => {
  for (const malformed of [{ status: 'ok' }, { status: 'ok', csrfToken: '\nnot-a-header' }, null]) {
    const env = bridge(() => response(malformed)); env.api.configureHosted();
    assert.equal((await env.api.reply(question)).error.code, 'invalid_response');
    assert.equal(env.calls.length, 1);
  }
  const invalidJSON = bridge(() => ({ ok: true, status: 200, json: async () => { throw new Error('not JSON'); } }));
  invalidJSON.api.configureHosted(); assert.equal((await invalidJSON.api.reply(question)).error.code, 'invalid_response');
  const statusError = bridge((_url, _options, n) => n === 1 ? session() : response({ status: 'ok', message: { role: 'assistant', content: 'wrong' } }, 503));
  statusError.api.configureHosted(); assert.equal((await statusError.api.reply(question)).error.code, 'http_error');
  const malformedReply = bridge((_url, _options, n) => n === 1 ? session() : response({ status: 'ok', message: { role: 'user', content: 'wrong' } }));
  malformedReply.api.configureHosted(); assert.equal((await malformedReply.api.reply(question)).error.code, 'invalid_response');
});

test('22 second deadline aborts pending transport even if fetch ignores its signal', async () => {
  const env = bridge(() => new Promise(() => {})); env.api.configureHosted();
  const result = env.api.reply(question); await tick();
  const deadline = [...env.timers.values()].find(item => item.ms === 22000); assert.ok(deadline);
  deadline.fn(); assert.equal((await result).error.code, 'timeout');
  assert.equal(env.calls[0].options.signal.aborted, true); assert.equal(env.timers.size, 0);
});

test('abort does not start chat after a late session completion, and does not retry', async () => {
  let resolveFetch;
  const env = bridge(() => new Promise(resolve => { resolveFetch = resolve; })); env.api.configureHosted();
  const controller = new AbortController();
  const result = env.api.reply(question, { signal: controller.signal }); await tick();
  controller.abort(); assert.equal((await result).status, 'aborted');
  resolveFetch(session()); await tick();
  assert.equal(env.calls.length, 1); assert.equal(env.timers.size, 0);
  assert.equal((await env.api.reply(question, { signal: controller.signal })).status, 'aborted');
  assert.equal(env.calls.length, 1);
});

test('history is capped at seven turns and 4000 characters, with the latest question intact', async () => {
  let sent;
  const env = bridge(() => {}); env.api.configure({ transport: async history => { sent = history; return { status: 'ok', message: { role: 'assistant', content: 'ok' } }; } });
  const history = Array.from({ length: 11 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index) }));
  await env.api.reply(history);
  assert.equal(sent.length, 7); assert.equal(sent[0].content, '4'); assert.equal(sent.at(-1).content, '10');
  const large = history.slice(-7).map((message, index) => ({ ...message, content: index === 6 ? 'latest' : 'a'.repeat(900) }));
  await env.api.reply(large);
  assert.equal(sent.length, 5); assert.ok(sent.reduce((sum, message) => sum + message.content.length, 0) <= 4000);
  assert.equal(sent[0].role, 'user'); assert.equal(sent.at(-1).role, 'user'); assert.equal(sent.at(-1).content, 'latest');
  assert.equal(large.length, 7, 'caller history is unchanged');
  for (const invalid of [[], [{ role: 'assistant', content: 'wrong' }], [...question, ...question], [...question, { role: 'assistant', content: 'answer' }], [{ role: 'user', content: 'a'.repeat(1001) }]]) {
    assert.equal((await env.api.reply(invalid)).error.code, 'invalid_messages');
  }
});

function ui(reply, voice = {}, options = {}) {
  const nodes=new Map(),timers=new Map(),waves=[],resizeObservers=[];let popup,available=false,serial=0,now=0;
  const cardSize={width:options.cardSize?.width??440,height:options.cardSize?.height??88};
  function eventTarget(target={}) {
    const callbacks=new Map();
    target.addEventListener=(type,callback)=>{if(!callbacks.has(type))callbacks.set(type,new Set());callbacks.get(type).add(callback);};
    target.removeEventListener=(type,callback)=>callbacks.get(type)?.delete(callback);
    target.dispatchEvent=event=>{if(!event.target)event.target=target;event.preventDefault ||= ()=>{};event.stopPropagation ||= ()=>{};for(const callback of [...(callbacks.get(event.type)||[])])callback.call(target,event);return true;};
    return target;
  }
  const matches=(node,selector)=>selector.startsWith('.')?node.className.split(/\s+/).includes(selector.slice(1)):selector.startsWith('#')?node.attributes.id===selector.slice(1):selector==='[inert]'?!!node.inert:node.tagName===selector;
  class Node {
    constructor(tagName='div') {
      this.tagName=tagName;this.className='';this.parentElement=null;this.listeners={};this.attributes={};this.children=[];this.dataset={};this.value='';this._textContent='';this.textWrites=0;this.replaceCount=0;this.attributeWrites=0;this.rectReads=0;
      this.style={setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];}};
      this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');},contains:name=>this.className.split(/\s+/).includes(name),toggle:(name,force)=>{const active=force??!this.classList.contains(name);this.classList[active?'add':'remove'](name);return active;}};
      this.scrollHeight=48;this.scrollTop=0;this.clientHeight=120;this.isConnected=true;
      eventTarget(this);const add=this.addEventListener;this.addEventListener=(type,callback,...rest)=>{this.listeners[type]=callback;add(type,callback,...rest);};
    }
    setAttribute(name,value){this.attributes[name]=String(value);this.attributeWrites++;if(name==='class')this.className=String(value);if(name==='id')this.id=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
    appendChild(node){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(child=>child!==node);this.children.push(node);node.parentElement=this;return node;}
    append(...items){for(const item of items)this.appendChild(typeof item==='string'?document.createTextNode(item):item);}
    replaceChildren(...items){for(const child of this.children)child.parentElement=null;this.children=[];this._textContent='';this.replaceCount++;this.append(...items);}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;this.isConnected=false;}
    get textContent(){return this._textContent+this.children.map(child=>child.textContent).join('');}
    set textContent(value){this._textContent=String(value);this.textWrites++;for(const child of this.children)child.parentElement=null;this.children=[];}
    get data(){return this._textContent;}set data(value){this.textContent=value;}
    get lastElementChild(){return this.children.at(-1)||null;}
    focus(){document.activeElement=this;}
    setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
    getBoundingClientRect(){this.rectReads++;const size=this.classList.contains('pa-window')?cardSize:{width:0,height:0};return{x:0,y:0,left:0,top:0,right:size.width,bottom:size.height,...size};}
    closest(selector){for(let current=this;current;current=current.parentElement)if(matches(current,selector))return current;return null;}
    contains(target){for(let current=target;current;current=current.parentElement)if(current===this)return true;return false;}
    querySelectorAll(selector){
      const parts=selector.split(/\s+/),found=[];
      const visit=node=>{for(const child of node.children){
        if(matches(child,parts.at(-1))){let ancestor=child.parentElement,index=parts.length-2;while(index>=0&&ancestor){if(matches(ancestor,parts[index]))index--;ancestor=ancestor.parentElement;}if(index<0)found.push(child);}
        visit(child);
      }};visit(this);return found;
    }
    querySelector(selector){const node=this.querySelectorAll(selector)[0]||null;if(node)nodes.set(selector,node);return node;}
    set innerHTML(html){
      this.html=html;this.children=[];const stack=[this];
      for(const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*?)(\/?)>/gi)){
        const [,closing,tag,attributes,selfClosing]=match;if(closing){stack.pop();continue;}
        const node=new Node(tag);for(const attribute of attributes.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gi))node.setAttribute(attribute[1],attribute[2]);
        stack.at(-1).appendChild(node);if(!selfClosing&&!['input','br','img','hr','meta','link'].includes(tag))stack.push(node);
      }
    }
    get innerHTML(){return this.html||'';}
  }
  const document=eventTarget({hidden:false,activeElement:null,documentElement:{lang:'zh'},
    createElement(name){const node=new Node(name);if(name==='section')popup=node;return node;},
    createElementNS(_namespace,name){return this.createElement(name);},
    createTextNode(value){const node=new Node('#text');node.textContent=value;return node;},
    body:new Node('body'),getElementById(id){return this.body.querySelector('#'+id);},
  });
  const motion=eventTarget({matches:options.reducedMotion??true,media:'(prefers-reduced-motion: reduce)'});
  class FakeResizeObserver {
    constructor(callback){this.callback=callback;this.targets=new Set();this.observes=0;this.disconnects=0;resizeObservers.push(this);}
    observe(target){this.targets.add(target);this.observes++;}
    disconnect(){this.targets.clear();this.disconnects++;}
    deliver({queued=false}={}){if(queued||this.targets.size)this.callback([...this.targets].map(target=>({target})),this);}
  }
  const fakeWaveModule={createVoiceWave(svg,settings={}){
    const state={svg,settings,starts:0,stops:0,destroys:0,levels:[],active:false,
      start(){state.starts++;state.active=true;settings.onLit?.(false);},
      stop(){state.stops++;state.active=false;settings.onLit?.(false);},
      destroy(){state.destroys++;state.active=false;settings.onLit?.(false);},
      setLevels(values){state.levels.push(Array.from(values));settings.onLit?.(state.active&&values.some(value=>value>0));},
    };waves.push(state);return state;
  }};
  const schedule=(fn,ms=0)=>{const id=++serial;timers.set(id,{fn,ms,at:now+Math.max(0,Number(ms)||0)});return id;};
  const clear=id=>timers.delete(id);
  const window=eventTarget({__testVoiceModule:voice.module,__testWaveModule:fakeWaveModule,matchMedia:()=>motion,
    AudioContext:voice.module?class {constructor(){this.state='running';}resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}:undefined,
    PortfolioNavigation:{assistantAvailable:()=>available},PortfolioAssistantConnection:{mode:'transport',reply,supportsVoice:!!voice.module,transcribe:voice.transcribe},
  });
  class CustomEvent{constructor(type,settings={}){this.type=type;this.detail=settings.detail;}}
  const context={document,window,URL,Intl,Blob,Float32Array,performance:{now:()=>now},setTimeout:schedule,clearTimeout:clear,
    requestAnimationFrame:fn=>schedule(()=>fn(now),16),cancelAnimationFrame:clear,
    location:{href:'https://bing2002.com/'},innerHeight:982,innerWidth:1512,AbortController,CustomEvent,
    addEventListener:window.addEventListener,removeEventListener:window.removeEventListener,dispatchEvent:window.dispatchEvent,
  };
  if(options.resizeObserver){context.ResizeObserver=FakeResizeObserver;window.ResizeObserver=FakeResizeObserver;}
  const executable=uiSource.replace('import(voiceModuleURL.href)','Promise.resolve(window.__testVoiceModule)').replace('import(waveModuleURL.href)','Promise.resolve(window.__testWaveModule)');
  vm.runInNewContext(executable,context);
  const emit=(target,type,detail)=>target.dispatchEvent(new CustomEvent(type,{detail}));
  return {api:window.PortfolioAssistant,nodes,popup,context,timers,waves,motion,resizeObservers,
    allow(){available=true;},submit(){nodes.get('.pa-form').dispatchEvent(new CustomEvent('submit'));},
    emitWindow(type,detail){emit(window,type,detail);},emitDocument(type,detail){emit(document,type,detail);},
    resizeCard(width,height){Object.assign(cardSize,{width,height});resizeObservers.forEach(observer=>observer.deliver());},
    setReducedMotion(value){if(motion.matches!==value){motion.matches=value;motion.dispatchEvent({type:'change',matches:value,media:motion.media});}},
    advance(ms){const target=now+ms;let count=0;while(true){const due=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;if(++count>10000)throw new Error('unbounded scheduled UI work');const[id,timer]=due;timers.delete(id);now=timer.at;timer.fn();}now=target;return count;},
  };
}

test('edge lamps follow the actual rounded card perimeter and resize without replacing unchanged geometry',()=>{
  for(const resizeObserver of [false,true]){
    const env=ui(()=>assert.fail('opening visual feedback must not send a request'),{},{resizeObserver,cardSize:{width:320,height:96}});
    const card=env.popup.querySelector('.pa-window'),svg=env.popup.querySelector('.pa-edge-svg'),beads=env.popup.querySelector('#pa-edge-beads'),mask=env.popup.querySelector('#pa-edge-scan'),track=env.popup.querySelector('.pa-edge-track');
    const mutationCount=()=>[svg,mask,track,...beads.children].reduce((sum,node)=>sum+node.attributeWrites,0);
    const assertPerimeter=(width,height)=>{
      assert.equal(svg.getAttribute('viewBox'),`0 0 ${width} ${height}`);
      assert.equal(Number(mask.getAttribute('width')),width);assert.equal(Number(mask.getAttribute('height')),height);
      const x=Number(track.getAttribute('x')),y=Number(track.getAttribute('y')),w=Number(track.getAttribute('width')),h=Number(track.getAttribute('height')),radius=Number(track.getAttribute('rx'));
      assert.ok(x>0&&y>0&&x+w<width&&y+h<height,'mask track fits within the actual card');
      assert.ok(radius>0&&radius<=Math.min(w,h)/2,'the scan follows rounded corners');
      assert.ok(beads.children.length>20,'the perimeter is composed of individual lamps');
      assert.ok(beads.children.every(node=>node.tagName==='circle'),'the lamp field has circles rather than a continuous rectangular line');
      const points=beads.children.map(node=>({x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy')),r:Number(node.getAttribute('r'))}));
      assert.equal(new Set(points.map(point=>point.r)).size,1,'lamps keep a consistent round size');
      assert.ok(points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.r>0&&point.x-point.r>=0&&point.y-point.r>=0&&point.x+point.r<=width&&point.y+point.r<=height),'no lamp is clipped outside the card');
      assert.ok(points.every(point=>Math.min(point.x,width-point.x,point.y,height-point.y)<Math.min(width,height)*.3),'lamps stay on the boundary instead of filling the chat content');
      assert.ok(points.some(point=>point.x<width*.1)&&points.some(point=>point.x>width*.9)&&points.some(point=>point.y<height*.1)&&points.some(point=>point.y>height*.9),'lamps cover all four sides');
      assert.ok(points.some(point=>point.x>x+.1&&point.x<x+radius&&point.y>y+.1&&point.y<y+radius),'corner lamps turn through the rounded corner');
    };
    assert.equal(beads.children.length,0);assert.equal(card.rectReads,0,'closed chat is not measured');
    env.allow();env.api.open();assertPerimeter(320,96);
    const original=[...beads.children],writes=mutationCount();
    if(resizeObserver)env.resizeObservers[0].deliver();else env.emitWindow('resize');
    assert.equal(mutationCount(),writes,'unchanged dimensions do not rewrite SVG attributes');
    assert.ok(beads.children.every((node,index)=>node===original[index]),'unchanged lamps keep their existing nodes');
    env.resizeCard(440,180);if(!resizeObserver)env.emitWindow('resize');assertPerimeter(440,180);
    assert.equal(beads.children[0],original[0],'resizing reuses existing lamp nodes');
    env.resizeCard(180,72);if(!resizeObserver)env.emitWindow('resize');assertPerimeter(180,72);
    assert.equal(beads.children[0],original[0],'shrinking removes excess lamps without replacing retained ones');
    assert.equal(env.advance(60000),0,'CSS scanning does not schedule a JavaScript animation loop');assert.equal(env.timers.size,0);
  }
});

test('edge observers suspend for hidden or closed chat and ignore already queued resize notifications',()=>{
  const env=ui(()=>assert.fail('visual lifecycle must not send a request'),{},{resizeObserver:true,cardSize:{width:440,height:96}});
  const card=env.popup.querySelector('.pa-window'),svg=env.popup.querySelector('.pa-edge-svg'),beads=env.popup.querySelector('#pa-edge-beads'),observer=env.resizeObservers[0];
  assert.equal(observer.targets.size,0,'closed chat does not subscribe to layout changes');
  env.allow();env.api.open();assert.ok(observer.targets.has(card));
  const snapshot=()=>({viewBox:svg.getAttribute('viewBox'),reads:card.rectReads,nodes:[...beads.children],writes:beads.children.reduce((sum,node)=>sum+node.attributeWrites,0)});
  const assertNoWork=before=>{
    assert.equal(svg.getAttribute('viewBox'),before.viewBox);assert.equal(card.rectReads,before.reads,'inactive chat cannot read layout');
    assert.ok(beads.children.every((node,index)=>node===before.nodes[index]));
    assert.equal(beads.children.reduce((sum,node)=>sum+node.attributeWrites,0),before.writes,'inactive chat cannot mutate lamp geometry');
    assert.equal(env.advance(60000),0);assert.equal(env.timers.size,0);
  };
  env.context.document.hidden=true;env.emitDocument('visibilitychange');assert.equal(observer.targets.size,0);assert.ok(observer.disconnects>0);
  const hidden=snapshot();env.resizeCard(380,160);observer.deliver({queued:true});env.emitWindow('resize');assertNoWork(hidden);
  env.context.document.hidden=false;env.emitDocument('visibilitychange');assert.ok(observer.targets.has(card));assert.equal(svg.getAttribute('viewBox'),'0 0 380 160','returning to the page catches up to its current size');
  env.api.close();assert.equal(observer.targets.size,0);
  const closed=snapshot();env.resizeCard(340,220);observer.deliver({queued:true});env.emitWindow('resize');assertNoWork(closed);
  env.api.open();assert.ok(observer.targets.has(card));assert.equal(svg.getAttribute('viewBox'),'0 0 340 220');
  env.emitWindow('pagehide');assert.equal(env.api.isOpen(),false);assert.equal(observer.targets.size,0);
  const departed=snapshot();observer.deliver({queued:true});assertNoWork(departed);
});

test('UI keeps first-entry gate, retains failed question, and never commits consecutive user turns', async () => {
  const calls = []; let n = 0;
  const env = ui(async messages => { calls.push(json(messages)); return ++n === 1 ? { status: 'error', error: { code: 'rate_limited' } } : { status: 'ok', message: { role: 'assistant', content: '<b>text only</b>' } }; });
  env.api.open(); assert.equal(env.api.isOpen(), false);
  env.allow(); env.api.open(); assert.equal(env.api.isOpen(), true);
  const input = env.nodes.get('.pa-input'); input.value = '我的项目有哪些？'; env.submit(); await tick();
  assert.equal(input.value, '我的项目有哪些？'); assert.equal(input.readOnly, false);
  assert.equal(env.nodes.get('.pa-notice').textContent, '问得有点快，请稍后再试。');
  assert.equal(env.nodes.get('.pa-log').children.length, 0);
  env.submit(); await tick(); assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[1].length, 1);
  assert.equal(input.value, ''); assert.equal(env.nodes.get('.pa-log').children.length, 2);
  assert.equal(env.nodes.get('.pa-log').children[1].textContent, '<b>text only</b>');
  input.value = '再说一下'; env.submit(); await tick();
  assert.deepEqual(calls[2].map(message => message.role), ['user', 'assistant', 'user']);
});

test('UI close cancels pending question without losing its input or leaking an unfinished turn', async () => {
  let complete; const calls = [];
  const env = ui(async messages => { calls.push(json(messages)); return new Promise(resolve => { complete = resolve; }); });
  env.allow(); env.api.open(); const input = env.nodes.get('.pa-input'); input.value = '保留这个问题';
  env.submit(); await tick(); assert.equal(input.readOnly, true);
  env.api.close(); assert.equal(input.value, '保留这个问题'); assert.equal(input.readOnly, false);
  assert.equal(env.nodes.get('.pa-log').children.length, 0);
  complete({ status: 'ok', message: { role: 'assistant', content: 'too late' } }); await tick();
  assert.equal(env.nodes.get('.pa-log').children.length, 0);
  env.api.open(); env.submit(); await tick(); assert.deepEqual(calls[1], calls[0]);
});

test('reply reveals complete graphemes on a controllable clock without remounting or repeated announcements',async()=>{
  const answer='👩🏽‍💻你好，这是完整的作品回答。';
  const env=ui(async()=>({status:'ok',message:{role:'assistant',content:answer}}),{},{reducedMotion:false});
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='介绍我的作品';env.submit();await tick();
  const log=env.nodes.get('.pa-log'),reply=log.children[1],announcer=env.nodes.get('.pa-announcer');
  assert.notEqual(reply.textContent,answer,'the visual answer is not revealed all at once');
  assert.equal(input.readOnly,false,'presentation does not keep the composer network-busy');
  assert.equal(log.getAttribute('aria-live'),'off');assert.equal(announcer.getAttribute('aria-live'),'polite');assert.equal(announcer.getAttribute('aria-atomic'),'true');
  assert.equal(announcer.textContent,answer,'assistive technology receives one complete answer');
  const remounts=log.replaceCount,announcements=announcer.textWrites;
  env.advance(22);assert.equal(reply.textContent,'👩🏽‍💻','a ZWJ emoji and skin-tone modifier stay together');
  env.advance(22);assert.ok(reply.textContent.length>2&&reply.textContent.length<answer.length);
  assert.equal(log.children[1],reply);assert.equal(log.replaceCount,remounts,'character updates do not rebuild history');
  env.advance(10000);assert.equal(reply.textContent,answer);assert.equal(announcer.textWrites,announcements,'characters are not announced repeatedly');assert.equal(env.timers.size,0);
});

test('presentation completion preserves a new draft and a new request uses the full previous answer exactly once',async()=>{
  const answer='这是已经完整收到、正在逐字显示的回答。',calls=[];let second;
  const env=ui(async messages=>{calls.push(json(messages));return calls.length===1?{status:'ok',message:{role:'assistant',content:answer}}:new Promise(resolve=>{second=resolve;});},{},{reducedMotion:false});
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='第一个问题';env.submit();await tick();env.advance(22);
  input.value='尚未发送的新草稿';input.dispatchEvent({type:'input'});env.advance(10000);
  assert.equal(input.value,'尚未发送的新草稿','finishing presentation must never clear text typed meanwhile');
  input.value='第二个问题';env.submit();env.submit();await tick();
  assert.equal(calls.length,2,'duplicate submission while the request is pending does not send twice');
  assert.deepEqual(calls[1],[{role:'user',content:'第一个问题'},{role:'assistant',content:answer},{role:'user',content:'第二个问题'}]);
  second({status:'ok',message:{role:'assistant',content:'第二个完整回答。'}});await tick();
  input.value='还要继续保留';env.advance(22);env.api.close();env.advance(10000);assert.equal(input.value,'还要继续保留');
});

test('submitting during a partial reveal sends the complete canonical answer and stops its presentation timer',async()=>{
  const answer='上一条回答还没有显示完，但模型历史必须包含它的全文。',calls=[];
  const env=ui(async messages=>{calls.push(json(messages));return calls.length===1?{status:'ok',message:{role:'assistant',content:answer}}:new Promise(()=>{});},{},{reducedMotion:false});
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='第一问';env.submit();await tick();env.advance(22);
  assert.ok(env.nodes.get('.pa-log').children[1].textContent.length<answer.length);
  input.value='紧接着问';env.submit();await tick();
  assert.deepEqual(calls[1],[{role:'user',content:'第一问'},{role:'assistant',content:answer},{role:'user',content:'紧接着问'}]);
  assert.equal(env.nodes.get('.pa-log').children[1].textContent,answer);assert.equal(env.timers.size,0);
  env.context.document.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(env.api.isOpen(),false);assert.equal(input.value,'紧接着问');
});

test('closing or clearing during reply presentation cancels every future character without discarding accepted history on close',async()=>{
  const answer='这条回复在关闭之前只显示一小部分。';
  for(const action of ['close','clear']){
    const env=ui(async()=>({status:'ok',message:{role:'assistant',content:answer}}),{},{reducedMotion:false});
    env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='问题';env.submit();await tick();env.advance(22);
    assert.ok(env.nodes.get('.pa-log').children[1].textContent.length<answer.length);
    input.value='保留新的草稿';env.api[action]();const log=env.nodes.get('.pa-log'),remounts=log.replaceCount,writes=env.nodes.get('.pa-announcer').textWrites;
    assert.equal(env.timers.size,0);env.advance(10000);assert.equal(log.replaceCount,remounts);assert.equal(env.nodes.get('.pa-announcer').textWrites,writes);assert.equal(input.value,'保留新的草稿');
    if(action==='close'){env.api.open();assert.equal(log.children.length,2);assert.equal(log.children[1].textContent,answer);}
    else {assert.equal(log.children.length,0);assert.equal(env.nodes.get('.pa-announcer').textContent,'','clear removes the accessible answer as well as visual history');}
  }
});

test('language changes keep the reveal position and reduced-motion changes finish it immediately without replay',async()=>{
  const answer='语言按钮只更新控件，不会重新播放回答。';
  const env=ui(async()=>({status:'ok',message:{role:'assistant',content:answer}}),{},{reducedMotion:false});
  env.allow();env.api.open();env.nodes.get('.pa-input').value='问题';env.submit();await tick();env.advance(22);
  const reply=env.nodes.get('.pa-log').children[1],prefix=reply.textContent,announcer=env.nodes.get('.pa-announcer'),writes=announcer.textWrites;
  env.context.document.documentElement.lang='en';env.emitWindow('portfolio:language',{language:'en'});
  assert.equal(env.nodes.get('.pa-input').placeholder,'Ask me a question');assert.equal(reply.textContent,prefix);assert.equal(announcer.textWrites,writes);
  env.advance(22);assert.ok(reply.textContent.startsWith(prefix)&&reply.textContent.length>prefix.length,'the next step continues rather than restarting');
  env.setReducedMotion(true);assert.equal(reply.textContent,answer);assert.equal(env.timers.size,0);assert.equal(announcer.textWrites,writes);
  env.setReducedMotion(false);env.advance(10000);assert.equal(reply.textContent,answer);assert.equal(env.timers.size,0);
});

test('character updates respect readers who scroll upwards while continuing to follow the bottom when requested',async()=>{
  const answer='这是一段逐字展开、需要保持阅读位置的回复。';
  const env=ui(async()=>({status:'ok',message:{role:'assistant',content:answer}}),{},{reducedMotion:false});
  env.allow();env.api.open();env.nodes.get('.pa-input').value='问题';env.submit();await tick();
  const history=env.nodes.get('.pa-history');history.scrollHeight=900;history.clientHeight=200;history.scrollTop=125;
  env.advance(44);assert.equal(history.scrollTop,125,'typing must not drag a reader away from earlier messages');
  history.scrollTop=700;env.advance(22);assert.ok(history.scrollTop>=700,'a reader at the end continues to follow the answer');
  env.api.close();
});

test('a new reply arriving while the reader is above the bottom preserves that reading position',async()=>{
  let complete;let count=0;
  const env=ui(async()=>++count===1?{status:'ok',message:{role:'assistant',content:'第一条已完成的回复。'}}:new Promise(resolve=>{complete=resolve;}));
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='先问一个';env.submit();await tick();
  env.setReducedMotion(false);input.value='再问一个';env.submit();await tick();
  const history=env.nodes.get('.pa-history');history.scrollHeight=900;history.clientHeight=200;history.scrollTop=100;
  complete({status:'ok',message:{role:'assistant',content:'第二条正在到来的回复。'}});await tick();
  assert.equal(history.scrollTop,100,'new reply rendering must not force an upward reader to the end');
  env.advance(44);assert.equal(history.scrollTop,100);env.api.close();
});

test('hidden documents and page departure finish pending presentation without leaving timers running',async()=>{
  const answer='这条已收到的回答不能在离开后继续逐字更新。';
  for(const action of ['hidden','pagehide']){
    const env=ui(async()=>({status:'ok',message:{role:'assistant',content:answer}}),{},{reducedMotion:false});
    env.allow();env.api.open();env.nodes.get('.pa-input').value='问题';env.submit();await tick();env.advance(22);
    if(action==='hidden'){env.context.document.hidden=true;env.emitDocument('visibilitychange');}
    else env.emitWindow('pagehide');
    const log=env.nodes.get('.pa-log');assert.equal(log.children[1].textContent,answer);assert.equal(env.timers.size,0);
    const writes=log.children[1].textWrites;env.advance(10000);assert.equal(log.children[1].textWrites,writes);
  }
});

test('starting voice during reply presentation preserves selection insertion and never submits a second question',async()=>{
  let questions=0;
  const env=ui(async()=>{questions++;return{status:'ok',message:{role:'assistant',content:'一段仍在逐字展开的作品回答。'}};},{
    module:{record({onState}){onState('listening');return{result:Promise.resolve(new Blob(['audio'])),cancel(){},stop(){}};}},
    transcribe:async()=>({status:'ok',text:'数独'}),
  },{reducedMotion:false});
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='第一个问题';env.submit();await tick();env.advance(22);
  input.value='关于这个作品';input.selectionStart=2;input.selectionEnd=4;env.nodes.get('.pa-voice-toggle').dispatchEvent({type:'click'});await tick();
  assert.equal(input.value,'关于数独作品');assert.equal(input.readOnly,false);assert.equal(questions,1);env.advance(10000);assert.equal(input.value,'关于数独作品');
});


test('UI service failure notices follow the selected language and reject arbitrary notice codes', async () => {
  for (const [code, expected] of [
    ['not_configured', 'The assistant is being prepared. Please check back later.'],
    ['rate_limited', 'Please wait a moment before asking again.'],
    ['budget_exhausted', 'The question allowance is used up. Please check back later.'],
    ['invalid_session', 'Your session expired. Please send your question again.'],
    ['upstream_error', 'A reply is unavailable. Please try again later.'],
    ['timeout', 'The reply timed out. Please try again.'],
    ['busy', 'The assistant is busy. Please try again shortly.'],
    ['title', 'A reply is unavailable. Please try again later.'],
  ]) {
    const env = ui(async () => ({ status: 'error', error: { code } }));
    env.context.document.documentElement.lang = 'en'; env.allow(); env.api.open();
    const input = env.nodes.get('.pa-input'); input.value = 'Keep this question'; env.submit(); await tick();
    assert.equal(env.nodes.get('.pa-notice').textContent, expected, code);
    assert.equal(input.value, 'Keep this question');
  }
});

test('voice upload shares the text session and never sends a transcript as a chat message', async () => {
  const env=bridge((_url,_options,n)=>n===1?session():n===2?ok():response({status:'ok',text:'  数独是怎样做的？  '}));
  env.api.configureHosted();assert.equal(env.api.supportsVoice,true);await env.api.reply(question);
  const audio=new Blob([new Uint8Array(32044)],{type:'audio/wav'});
  assert.equal((await env.api.transcribe(audio)).text,'数独是怎样做的？');assert.equal(env.calls.length,3);
  const request=env.calls[2];assert.equal(request.url,'https://ai.bing2002.com/portfolio-ai/transcribe');
  assert.equal(request.options.headers['Content-Type'],'audio/wav');assert.equal(request.options.headers['X-CSRF-Token'],token);
  assert.equal(request.options.body,audio);assert.equal(request.options.credentials,'include');assert.equal(env.timers.size,0);
  env.api.configure({transport:async()=>({status:'not_connected'})});assert.equal(env.api.supportsVoice,false);
  assert.equal((await env.api.transcribe(audio)).error.code,'voice_unavailable');
});

test('voice rejects non-WAV and overlong input before any network call', async () => {
  const env=bridge(()=>assert.fail('invalid audio must not be uploaded'));env.api.configureHosted();
  for(const input of [null,new Blob(['x'],{type:'audio/webm'}),new Blob([new Uint8Array(44)],{type:'audio/wav'}),new Blob([new Uint8Array(640045)],{type:'audio/wav'})]){
    assert.equal((await env.api.transcribe(input)).error.code,'invalid_audio');
  }
  assert.equal(env.calls.length,0);
});

test('voice refreshes only a rejected session; ASR errors never trigger retries', async () => {
  const audio=new Blob([new Uint8Array(32044)],{type:'audio/wav'});
  const refresh=bridge((_url,_options,n)=>[session(),error('invalid_session',403),session(token+'_new'),response({status:'ok',text:'hello'})][n-1]);
  refresh.api.configureHosted();assert.equal((await refresh.api.transcribe(audio)).text,'hello');assert.equal(refresh.calls.length,4);
  for(const code of ['voice_busy','voice_unavailable','voice_empty','quota_exceeded','upstream_error']){
    const env=bridge((_url,_options,n)=>n===1?session():error(code,503));env.api.configureHosted();
    assert.equal((await env.api.transcribe(audio)).error.code,code);assert.equal(env.calls.length,2);
  }
});

test('voice uses a bounded 40 second deadline and cancellation prevents a late upload', async () => {
  const audio=new Blob([new Uint8Array(32044)],{type:'audio/wav'});
  const timed=bridge(()=>new Promise(()=>{}));timed.api.configureHosted();const pending=timed.api.transcribe(audio);await tick();
  [...timed.timers.values()].find(timer=>timer.ms===40000).fn();assert.equal((await pending).error.code,'timeout');assert.equal(timed.timers.size,0);
  let resolve;const env=bridge(()=>new Promise(done=>{resolve=done;}));env.api.configureHosted();const controller=new AbortController();
  const cancelled=env.api.transcribe(audio,{signal:controller.signal});await tick();controller.abort();assert.equal((await cancelled).status,'aborted');
  resolve(session());await tick();assert.equal(env.calls.length,1);assert.equal(env.timers.size,0);
});


test('voice UI inserts at the draft selection and leaves the question unsent and editable',async()=>{
  let uploads=0;
  const env=ui(()=>assert.fail('voice must never automatically send a question'),{
    module:{record({onState}){onState('listening');return{result:Promise.resolve(new Blob(['audio'])),cancel(){},stop(){}};}},
    transcribe:async()=>{uploads++;return{status:'ok',text:'数独'};},
  });
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='关于这个作品';input.selectionStart=2;input.selectionEnd=4;
  env.nodes.get('.pa-voice-toggle').listeners.click();await tick();
  assert.equal(input.value,'关于数独作品');assert.equal(input.readOnly,false);assert.equal(uploads,1);
  assert.equal(env.nodes.get('.pa-log').children.length,0);assert.equal(env.popup.dataset.voiceExpanded,'false');
});

test('voice processing stays busy through recorder flush and deferred ASR, then restores the editable draft immediately',async()=>{
  const audioReady=deferred(),transcriptReady=deferred();let stops=0,uploads=0;
  const env=ui(()=>assert.fail('recording or recognition must not submit a question'),{
    module:{record({onState}){
      onState('listening');
      return{result:audioReady.promise,cancel(){},stop(){stops++;onState('stopping');}};
    }},
    transcribe:()=>{uploads++;return transcriptReady.promise;},
  });
  env.allow();env.api.open();const input=env.nodes.get('.pa-input'),mic=env.nodes.get('.pa-voice-toggle'),send=env.nodes.get('.pa-send');
  input.value='关于这个作品';input.selectionStart=2;input.selectionEnd=4;
  mic.dispatchEvent({type:'click'});await tick();
  assert.equal(env.popup.dataset.voiceState,'listening');assert.equal(env.popup.dataset.voiceProcessing,'false');
  assert.equal(env.nodes.get('.pa-status').textContent,'正在听…');assert.equal(input.readOnly,true);
  const processingIcon=mic.querySelector('.pa-processing-icon');
  assert.ok(processingIcon,'the microphone has its own processing feedback rather than a second floating control');
  assert.equal(processingIcon.getAttribute('aria-hidden'),'true');

  mic.dispatchEvent({type:'click'});
  assert.equal(stops,1);assert.equal(env.popup.dataset.voiceState,'stopping');
  for(const stage of ['recorder flush','ASR upload']){
    assert.equal(env.popup.dataset.voiceProcessing,'true',stage);
    assert.equal(env.popup.getAttribute('aria-busy'),'true',stage);
    assert.equal(env.nodes.get('.pa-status').textContent,'正在转成文字…',stage);
    assert.equal(input.value,'关于这个作品',stage);assert.equal(input.readOnly,true,stage);
    assert.equal(send.disabled,true,stage);assert.equal(mic.disabled,false,'processing remains cancellable');
    assert.equal(env.waves[0].active,false,'the recording waveform stops while recognition is pending');
    env.advance(5000);await tick();
    assert.equal(env.popup.dataset.voiceProcessing,'true','feedback lasts as long as actual work remains pending');
    assert.equal(input.value,'关于这个作品');env.submit();await tick();
    if(stage==='recorder flush'){
      assert.equal(uploads,0,'ASR cannot start before the recorder has flushed its audio');
      audioReady.resolve(new Blob(['audio']));await tick();
      assert.equal(uploads,1);assert.equal(env.popup.dataset.voiceState,'transcribing');
    }
  }
  transcriptReady.resolve({status:'ok',text:'数独'});await tick();
  assert.equal(input.value,'关于数独作品');assert.equal(input.readOnly,false);assert.equal(send.disabled,false);
  assert.equal(env.popup.dataset.voiceProcessing,'false');assert.equal(env.popup.getAttribute('aria-busy'),'false');
  assert.equal(env.nodes.get('.pa-status').textContent,'可以提问');assert.equal(mic.getAttribute('aria-pressed'),'false');
  assert.equal(env.popup.dataset.voiceExpanded,'false');assert.equal(env.nodes.get('.pa-log').children.length,0);
  assert.equal(env.timers.size,0,'successful recognition has no artificial minimum processing delay');
});

test('closing or cancelling either processing phase aborts it without allowing late work to replace a new draft',async()=>{
  for(const phase of ['stopping','transcribing'])for(const action of ['close','cancel']){
    const audioReady=deferred(),transcriptReady=deferred();let signal,uploads=0,cancels=0;
    const label=`${action} during ${phase}`;
    const env=ui(()=>assert.fail('must not auto-send'),{
      module:{record(options){
        signal=options.signal;options.onState('listening');
        return{result:audioReady.promise,cancel(){cancels++;},stop(){options.onState('stopping');}};
      }},
      transcribe:()=>{uploads++;return transcriptReady.promise;},
    });
    env.allow();env.api.open();const input=env.nodes.get('.pa-input'),mic=env.nodes.get('.pa-voice-toggle');input.value='保留原有草稿';
    mic.dispatchEvent({type:'click'});await tick();mic.dispatchEvent({type:'click'});
    if(phase==='transcribing'){audioReady.resolve(new Blob(['audio']));await tick();}
    assert.equal(env.popup.dataset.voiceState,phase,label);assert.equal(env.popup.dataset.voiceProcessing,'true',label);
    if(action==='close')env.api.close();else mic.dispatchEvent({type:'click'});
    assert.equal(signal.aborted,true,label);assert.equal(input.readOnly,false,label);assert.equal(input.value,'保留原有草稿',label);
    assert.equal(env.popup.dataset.voiceProcessing,'false',label);assert.equal(env.popup.getAttribute('aria-busy'),'false',label);
    if(phase==='stopping')assert.equal(cancels,1,'cancelling flush stops its still-active recorder');
    if(action==='close'){assert.equal(env.api.isOpen(),false);env.api.open();}
    input.value='取消后重新写下的问题';input.dispatchEvent({type:'input'});
    audioReady.resolve(new Blob(['late audio']));transcriptReady.resolve({status:'ok',text:'过期识别不应出现'});await tick();env.advance(10000);await tick();
    assert.equal(uploads,phase==='transcribing'?1:0,'cancelled recorder completion cannot start a late upload');
    assert.equal(input.value,'取消后重新写下的问题',label);assert.equal(input.readOnly,false,label);
    assert.equal(env.popup.dataset.voiceProcessing,'false',label);assert.equal(env.popup.getAttribute('aria-busy'),'false',label);
    assert.equal(env.nodes.get('.pa-status').textContent,'可以提问',label);assert.equal(env.nodes.get('.pa-log').children.length,0,label);
  }
});


test('voice timeline has its own row above the input and delegates live levels to its renderer',async()=>{
  let finish,levels;
  const env=ui(()=>assert.fail('voice must not auto-send'),{
    module:{record({onState,onLevels}){levels=onLevels;onState('listening');return{result:new Promise(resolve=>{finish=resolve;}),cancel(){},stop(){}};}},
    transcribe:async()=>({status:'ok',text:'数独'}),
  });
  const card=env.popup.querySelector('.pa-window'),form=env.popup.querySelector('.pa-form'),wave=env.popup.querySelector('.pa-wave'),panel=env.popup.querySelector('.pa-voice-panel'),mic=env.nodes.get('.pa-voice-toggle');
  assert.equal(panel.parentElement,card);assert.ok(card.children.indexOf(panel)<card.children.indexOf(form),'timeline has a separate row before the composer');
  assert.equal(panel.contains(env.nodes.get('.pa-input')),false,'wave cannot cover text or placeholder');
  assert.equal(wave.getAttribute('viewBox'),'0 0 320 48');assert.equal(wave.querySelectorAll('circle').length,0,'no prefilled background matrix');
  assert.equal(env.waves.length,0,'renderer remains lazy before the microphone is pressed');
  assert.equal(panel.attributes['aria-hidden'],'true');assert.equal(mic.attributes['aria-controls'],panel.attributes.id);
  assert.ok(mic.querySelector('.pa-stop-icon'),'active microphone has a distinct stop glyph');
  env.allow();env.api.open();mic.listeners.click();await tick();
  assert.equal(mic.attributes['aria-expanded'],'true');assert.equal(mic.attributes['aria-pressed'],'true');assert.equal(env.popup.dataset.voiceDraft,'false');
  assert.equal(env.nodes.get('.pa-input').placeholder,'你想问我什么？','placeholder stays visible in its independent input row');
  assert.equal(env.waves.length,1);assert.equal(env.waves[0].svg,wave);assert.equal(env.waves[0].starts,1);assert.equal(env.waves[0].settings.isReducedMotion(),true);
  levels(Array(27).fill(0));assert.equal(env.popup.dataset.voiceLit,'false');
  const signal=[.1,.8,...Array(25).fill(0)];levels(signal);assert.equal(env.popup.dataset.voiceLit,'true');assert.deepEqual(env.waves[0].levels.at(-1),signal);
  levels(Array(27).fill(0));assert.equal(env.popup.dataset.voiceLit,'false');
  finish(new Blob(['audio']));await tick();assert.equal(mic.attributes['aria-expanded'],'false');assert.equal(mic.attributes['aria-pressed'],'false');assert.equal(env.popup.dataset.voiceLit,'false');
  assert.equal(env.waves[0].active,false);assert.ok(env.waves[0].stops>=1);
});

test('voice composition marks existing draft text for its own row and preserves it until transcription',async()=>{
  let finish;
  const env=ui(()=>assert.fail('must not auto-send'),{
    module:{record({onState}){onState('listening');return{result:new Promise(resolve=>{finish=resolve;}),cancel(){},stop(){}};}},
    transcribe:async()=>({status:'ok',text:'数独'}),
  });
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='原有草稿';input.selectionStart=input.selectionEnd=input.value.length;
  env.nodes.get('.pa-voice-toggle').listeners.click();await tick();assert.equal(env.popup.dataset.voiceDraft,'true');assert.equal(input.value,'原有草稿');assert.equal(input.readOnly,true);
  const compose=env.popup.querySelector('.pa-compose');assert.equal(compose.children[0],input);assert.equal(compose.contains(env.popup.querySelector('.pa-voice-panel')),false);
  assert.equal(input.placeholder,'你想问我什么？');
  finish(new Blob(['audio']));await tick();assert.equal(input.value,'原有草稿数独');assert.equal(input.readOnly,false);assert.equal(env.popup.dataset.voiceExpanded,'false');
});


test('silent microphone PCM gives a specific localised input-device notice, preserving the draft without ASR upload',async()=>{
  for(const [language,expected] of [['zh','没有收到麦克风声音，请检查输入设备。'],['en','No microphone sound was received. Check your input device.']]){
    const env=ui(()=>assert.fail('must not send'),{
      module:{record({onState}){onState('listening');return{result:Promise.reject(Object.assign(new Error('silent input'),{code:'voice_input_silent'})),cancel(){},stop(){}};}},
      transcribe:()=>assert.fail('digital silence must not reach ASR'),
    });
    env.context.document.documentElement.lang=language;env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='Keep draft';
    env.nodes.get('.pa-voice-toggle').listeners.click();await tick();assert.equal(env.nodes.get('.pa-notice').textContent,expected);
    assert.equal(input.value,'Keep draft');assert.equal(input.readOnly,false);assert.equal(env.popup.dataset.voiceLit,'false');
  }
});
