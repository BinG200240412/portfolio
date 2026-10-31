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

function ui(reply, voice = {}) {
  const nodes = new Map(); let popup;
  const matches=(node,selector)=>selector.startsWith('.')?node.className.split(/\s+/).includes(selector.slice(1)):selector.startsWith('#')?node.attributes.id===selector.slice(1):selector==='[inert]'?!!node.inert:node.tagName===selector;
  class Node {
    constructor(tagName='div') { this.tagName=tagName;this.className='';this.parentElement=null;this.listeners = {}; this.attributes = {}; this.children = []; this.dataset = {}; this.value = ''; this.style = { setProperty() {} }; this.classList = { add() {}, remove() {}, toggle() {} }; this.scrollHeight = 48; this.isConnected = true; }
    setAttribute(name, value) { this.attributes[name] = value;if(name==='class')this.className=value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    appendChild(node) { this.children.push(node);node.parentElement=this;return node; }
    replaceChildren() { this.children = []; }
    focus() {} closest(selector) { for(let current=this;current;current=current.parentElement)if(matches(current,selector))return current;return null; }
    contains(target) {for(let current=target;current;current=current.parentElement)if(current===this)return true;return false;}
    querySelectorAll(selector) {
      const parts=selector.split(/\s+/),found=[];
      const visit=node=>{for(const child of node.children){
        if(matches(child,parts.at(-1))){let ancestor=child.parentElement,index=parts.length-2;while(index>=0&&ancestor){if(matches(ancestor,parts[index]))index--;ancestor=ancestor.parentElement;}if(index<0)found.push(child);}
        visit(child);
      }};visit(this);return found;
    }
    querySelector(selector) {const node=this.querySelectorAll(selector)[0]||null;if(node)nodes.set(selector,node);return node;}
    set innerHTML(html) {
      this.html=html;this.children=[];const stack=[this];
      for(const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*?)(\/?)>/gi)){
        const [,closing,tag,attributes,selfClosing]=match;
        if(closing){stack.pop();continue;}
        const node=new Node(tag);for(const attribute of attributes.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gi))node.setAttribute(attribute[1],attribute[2]);
        stack.at(-1).appendChild(node);if(!selfClosing&&!['input','br','img','hr','meta','link'].includes(tag))stack.push(node);
      }
    }
    get innerHTML(){return this.html||'';}
  }
  const document = { hidden: false, activeElement: null, documentElement: { lang: 'zh' },
    createElement(name) {const node=new Node(name);if(name==='section')popup=node;return node;},
    body: new Node('body'), getElementById() { return null; }, addEventListener() {},
  };
  let available = false;
  const context = { document, URL, setTimeout, clearTimeout, location: {href:'https://bing2002.com/'}, innerHeight: 982, innerWidth: 1512, AbortController, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    addEventListener() {}, dispatchEvent() {}, window: { __testVoiceModule: voice.module, AudioContext: voice.module ? class { constructor(){this.state='running';} resume(){return Promise.resolve();} close(){this.state='closed';return Promise.resolve();} } : undefined, PortfolioNavigation: { assistantAvailable: () => available }, PortfolioAssistantConnection: { mode: 'transport', reply, supportsVoice: !!voice.module, transcribe: voice.transcribe } },
  };
  vm.runInNewContext(voice.module ? uiSource.replace('import(voiceModuleURL.href)', 'Promise.resolve(window.__testVoiceModule)') : uiSource, context);
  return { api: context.window.PortfolioAssistant, nodes, popup, context, allow() { available = true; }, submit() { nodes.get('.pa-form').listeners.submit({ preventDefault() {} }); } };
}

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

test('closing during transcription aborts the upload, keeps the draft and ignores a late result',async()=>{
  let finish,signal;
  const env=ui(()=>assert.fail('must not submit'),{
    module:{record({onState}){onState('listening');return{result:Promise.resolve(new Blob(['audio'])),cancel(){},stop(){}};}},
    transcribe:(_audio,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});},
  });
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='保留输入';
  env.nodes.get('.pa-voice-toggle').listeners.click();await tick();assert.equal(input.readOnly,true);
  env.api.close();assert.equal(signal.aborted,true);assert.equal(input.readOnly,false);
  finish({status:'ok',text:'不应该出现'});await tick();assert.equal(input.value,'保留输入');
});


test('voice dots stay inside the input composition and paint only live points, with silence fully empty',async()=>{
  let finish,levels;
  const env=ui(()=>assert.fail('voice must not auto-send'),{
    module:{record({onState,onLevels}){levels=onLevels;onState('listening');return{result:new Promise(resolve=>{finish=resolve;}),cancel(){},stop(){}};}},
    transcribe:async()=>({status:'ok',text:'数独'}),
  });
  const card=env.popup.querySelector('.pa-window'),compose=env.popup.querySelector('.pa-compose'),wave=env.popup.querySelector('.pa-wave'),panel=env.popup.querySelector('.pa-voice-panel'),mic=env.nodes.get('.pa-voice-toggle');
  assert.equal(panel.parentElement,compose);assert.equal(card.contains(wave),true);assert.equal(panel.contains(env.nodes.get('.pa-input')),false,'wave cannot cover an ancestor containing the text');
  const dots=wave.querySelectorAll('circle');assert.equal(dots.length,243);assert.ok(dots.every(dot=>dot.attributes.opacity==='0'),'no initial dim matrix');
  assert.equal(panel.attributes['aria-hidden'],'true');assert.equal(mic.attributes['aria-controls'],panel.attributes.id);
  assert.ok(mic.querySelector('.pa-stop-icon'),'active microphone has a distinct stop glyph');
  env.allow();env.api.open();mic.listeners.click();await tick();
  assert.equal(mic.attributes['aria-expanded'],'true');assert.equal(mic.attributes['aria-pressed'],'true');assert.equal(env.popup.dataset.voiceDraft,'false');
  assert.equal(env.nodes.get('.pa-input').placeholder,'','empty recording does not layer a label behind the dots');
  levels(Array(27).fill(0));assert.equal(env.popup.dataset.voiceLit,'false');assert.ok(dots.every(dot=>dot.attributes.opacity==='0'));
  levels([.1,.8,...Array(25).fill(0)]);assert.equal(env.popup.dataset.voiceLit,'true');assert.ok(dots.some(dot=>dot.attributes.opacity==='.92'));
  assert.ok(dots.every(dot=>['0','.92'].includes(dot.attributes.opacity)),'off points never form a faint background grid');
  levels(Array(27).fill(0));assert.equal(env.popup.dataset.voiceLit,'false');assert.ok(dots.every(dot=>dot.attributes.opacity==='0'));
  finish(new Blob(['audio']));await tick();assert.equal(mic.attributes['aria-expanded'],'false');assert.equal(mic.attributes['aria-pressed'],'false');assert.equal(env.popup.dataset.voiceLit,'false');
});

test('voice composition marks existing draft text for its own row and preserves it until transcription',async()=>{
  let finish;
  const env=ui(()=>assert.fail('must not auto-send'),{
    module:{record({onState}){onState('listening');return{result:new Promise(resolve=>{finish=resolve;}),cancel(){},stop(){}};}},
    transcribe:async()=>({status:'ok',text:'数独'}),
  });
  env.allow();env.api.open();const input=env.nodes.get('.pa-input');input.value='原有草稿';input.selectionStart=input.selectionEnd=input.value.length;
  env.nodes.get('.pa-voice-toggle').listeners.click();await tick();assert.equal(env.popup.dataset.voiceDraft,'true');assert.equal(input.value,'原有草稿');assert.equal(input.readOnly,true);
  const compose=env.popup.querySelector('.pa-compose');assert.equal(compose.children[0],input);assert.equal(compose.children[1],env.popup.querySelector('.pa-voice-panel'));
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
