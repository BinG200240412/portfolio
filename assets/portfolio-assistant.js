/* A non-modal conversation popover at the visible viewport's bottom centre.
 * API: PortfolioAssistant.open({focusClose?:boolean}), close({restoreFocus?:boolean}),
 * toggle(), isOpen(), clear(). State event: portfolio:assistant {open:boolean}.
 * The connection module owns transport. Only its ok/assistant result is a reply.
 */
(() => {
  'use strict';
  if (window.PortfolioAssistant) return;
  const voiceModuleURL=new URL('assistant-voice.js?v=b07463c086',document.currentScript?.src||new URL('/assets/portfolio-assistant.js',location.href));
  const waveModuleURL=new URL('assistant-wave.js?v=e597d1e93b',document.currentScript?.src||new URL('/assets/portfolio-assistant.js',location.href));
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion=()=>!!motion?.matches;
  let voiceModule,waveModule,waveRenderer;
  const popup=document.createElement('section');
  popup.id='portfolio-assistant';popup.className='pa-popover';
  popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');
  popup.setAttribute('aria-describedby','pa-status');
  popup.setAttribute('data-i18n-ignore','');popup.setAttribute('aria-hidden','true');
  popup.dataset.open='false';popup.dataset.voiceExpanded='false';popup.dataset.voiceLit='false';popup.dataset.voiceDraft='false';popup.dataset.suspended=String(document.hidden);popup.inert=true;
  popup.innerHTML=`<div class="pa-window">
    <div class="pa-edge-glow" aria-hidden="true"><svg preserveAspectRatio="none"><rect class="pa-edge-track" x="1" y="1" rx="33" pathLength="1000"/></svg></div>
    <div class="pa-history" hidden><div class="pa-log" role="log" aria-live="off"></div><p class="pa-notice" role="status" hidden></p></div>
    <div class="pa-voice-panel" id="pa-voice-panel" aria-hidden="true"><svg class="pa-wave" viewBox="0 0 320 48" aria-hidden="true" focusable="false"></svg></div>
    <form class="pa-form">
      <button class="pa-voice-toggle" type="button" aria-controls="pa-voice-panel" aria-expanded="false"><svg class="pa-microphone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6"/></svg><svg class="pa-stop-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1"/></svg></button>
      <div class="pa-compose"><textarea class="pa-input" rows="1" maxlength="1000"></textarea></div>
      <button class="pa-send" type="submit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5m-5 5 5-5 5 5"/></svg></button>
      <button class="pa-close" type="button"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m5 5 10 10M15 5 5 15"/></svg></button>
    </form>
    <span class="pa-status" id="pa-status" role="status"></span>
    <span class="pa-status pa-announcer" aria-live="polite" aria-atomic="true"></span>
  </div>`;
  document.body.appendChild(popup);
  const find=selector=>popup.querySelector(selector),dot=()=>document.getElementById('dot');
  const input=find('.pa-input'),sendButton=find('.pa-send'),closeButton=find('.pa-close');
  const voiceButton=find('.pa-voice-toggle');
  // Match the site's native LED fan without a second module or asset request.
  const fanRows=['....................','.............##.....','....##.....######...','..#####....######...','..#####...########..','.#######..########..','.#######.########...','..######.######.....','..##########........','....##########......','......##########....','........##########..','.....######.######..','...########.#######.','..########..#######.','..########...#####..','...######....#####..','...######.....##....','.....##.............','....................'];
  const fan=document.createElementNS('http://www.w3.org/2000/svg','svg');
  fan.setAttribute('class','pa-processing-icon');fan.setAttribute('viewBox','0 0 40 40');fan.setAttribute('aria-hidden','true');fan.setAttribute('focusable','false');
  const rotor=document.createElementNS('http://www.w3.org/2000/svg','g');rotor.setAttribute('class','pa-processing-rotor');fan.appendChild(rotor);
  fanRows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell!=='#')return;const bead=document.createElementNS('http://www.w3.org/2000/svg','circle');bead.setAttribute('cx',String(1+x*2));bead.setAttribute('cy',String(1+y*2));bead.setAttribute('r','.65');bead.setAttribute('fill','currentColor');rotor.appendChild(bead);}));
  voiceButton.appendChild(fan);
  const history=find('.pa-history'),log=find('.pa-log'),notice=find('.pa-notice');
  const status=find('.pa-status'),announcer=find('.pa-announcer'),messages=[],messageNodes=new Map();
  let opened=false,voiceExpanded=false,busy=false,controller=null,generation=0,returnFocus=null;
  let feedback='',navigationMode=null,pendingMessage=null;
  let voiceState='',voiceCapture=null,voiceController=null,voiceContext=null,voiceGeneration=0,voiceSetupTimer=0;
  let replyReveal=null,replyTimer=0;
  const copy={
    zh:{title:'关于我的对话',close:'关闭对话',preview:'AI 尚未连接',ready:'可以提问',pending:'等待回复…',
      placeholder:'你想问我什么？',send:'发送',voiceOpen:'开始语音输入',voiceClose:'停止录音',
      voiceRequesting:'请允许使用麦克风',voiceListening:'正在听…',voiceTranscribing:'正在转成文字…',voiceCancel:'取消语音输入',
      voice_unavailable:'语音暂不可用，请用文字提问。',voice_unsupported:'这个浏览器暂不支持录音，请使用新版 Safari 或 Chrome。',
      voice_permission_denied:'麦克风未获授权，请在浏览器设置中允许。',voice_permission_timeout:'尚未获得麦克风权限，请再试一次。',
      voice_no_microphone:'没有找到麦克风。',voice_input_silent:'没有收到麦克风声音，请检查输入设备。',voice_empty:'没听清，请再说一次。',voice_interrupted:'录音中断了，请再试一次。',
      voice_capture_error:'录音未能开始，请检查麦克风后再试。',voice_busy:'语音识别正在忙，请稍后再试。',
      voice_error:'语音识别暂不可用，请稍后再试。',voice_too_long:'输入已满，请删减后再录音。',quota_exceeded:'语音额度已用完，请稍后再来。',
      offline:'尚未接入',error:'暂时无法回复，请稍后再试。',
      not_configured:'AI 还在准备，请稍后再来。',rate_limited:'问得有点快，请稍后再试。',
      budget_exhausted:'问答额度已用完，请稍后再来。',invalid_session:'会话已过期，请再发送一次。',
      upstream_error:'暂时无法回复，请稍后再试。',timeout:'回复超时了，请再试一次。',
      busy:'正在处理其他提问，请稍后再试。',invalid_messages:'请将问题控制在 1000 字以内。'},
    en:{title:'Ask about me',close:'Close conversation',preview:'AI is not connected',ready:'Ready for a question',pending:'Waiting for a reply…',
      placeholder:'Ask me a question',send:'Send',voiceOpen:'Start voice input',voiceClose:'Stop recording',
      voiceRequesting:'Allow microphone access',voiceListening:'Listening…',voiceTranscribing:'Transcribing…',voiceCancel:'Cancel voice input',
      voice_unavailable:'Voice input is unavailable. Please type your question.',voice_unsupported:'Please use a current Safari or Chrome browser for voice input.',
      voice_permission_denied:'Allow microphone access in your browser settings.',voice_permission_timeout:'Microphone access is still pending. Please try again.',
      voice_no_microphone:'No microphone was found.',voice_input_silent:'No microphone sound was received. Check your input device.',voice_empty:'No speech was recognised. Please try again.',voice_interrupted:'Recording was interrupted. Please try again.',
      voice_capture_error:'Recording could not start. Please check your microphone.',voice_busy:'Voice recognition is busy. Please try again shortly.',
      voice_error:'Voice recognition is unavailable. Please try again later.',voice_too_long:'The input is full. Please shorten it before recording.',quota_exceeded:'The voice allowance is used up. Please check back later.',
      offline:'Not connected',error:'A reply is unavailable. Please try again later.',
      not_configured:'The assistant is being prepared. Please check back later.',rate_limited:'Please wait a moment before asking again.',
      budget_exhausted:'The question allowance is used up. Please check back later.',invalid_session:'Your session expired. Please send your question again.',
      upstream_error:'A reply is unavailable. Please try again later.',timeout:'The reply timed out. Please try again.',
      busy:'The assistant is busy. Please try again shortly.',invalid_messages:'Please keep your question within 1000 characters.'},
  };
  const serviceErrors=new Set(['not_configured','rate_limited','budget_exhausted','invalid_session','upstream_error','timeout','busy','invalid_messages']);
  const voiceErrors=new Set(['voice_unavailable','voice_unsupported','voice_permission_denied','voice_permission_timeout','voice_no_microphone','voice_input_silent','voice_empty','voice_interrupted','voice_capture_error','voice_busy','voice_too_long','quota_exceeded','rate_limited','budget_exhausted','invalid_session']);
  const language=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang==='en'?'en':'zh';
  const text=()=>copy[language()];
  const configured=()=>!!window.PortfolioAssistantConnection&&window.PortfolioAssistantConnection.mode!=='not_connected';
  function update() {
    const t=text();popup.setAttribute('aria-label',t.title);
    const recording=!!voiceState,processing=voiceState==='stopping'||voiceState==='transcribing',showWave=voiceExpanded&&!processing;
    status.textContent=recording?(voiceState==='requesting'?t.voiceRequesting:processing?t.voiceTranscribing:t.voiceListening):busy?t.pending:configured()?t.ready:t.preview;
    closeButton.setAttribute('aria-label',t.close);
    input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);
    popup.dataset.voiceExpanded=String(showWave);popup.dataset.voiceDraft=String(!!input.value.trim());popup.dataset.voiceProcessing=String(processing);
    voiceButton.setAttribute('aria-expanded',String(showWave));
    voiceButton.setAttribute('aria-label',recording?(voiceState==='listening'?t.voiceClose:t.voiceCancel):t.voiceOpen);
    voiceButton.setAttribute('aria-pressed',String(recording));voiceButton.disabled=busy;popup.dataset.voiceState=voiceState;
    sendButton.setAttribute('aria-label',t.send);sendButton.disabled=busy||recording||!input.value.trim();input.readOnly=busy||recording;
    popup.classList.toggle('is-pending',busy);popup.setAttribute('aria-busy',String(busy||processing));
    const hasHistory=messages.length>0||!!pendingMessage||!!feedback;
    history.hidden=!hasHistory;popup.classList.toggle('has-history',hasHistory);popup.classList.toggle('has-messages',messages.length>0||!!pendingMessage);
    notice.hidden=!feedback;notice.textContent=feedback?t[feedback]||t.error:'';
  }
  function render({follow=false}={}) {
    const top=history.scrollTop||0,atBottom=history.scrollHeight-top-(history.clientHeight||0)<32;
    log.replaceChildren();messageNodes.clear();
    for (const message of pendingMessage?[...messages,pendingMessage]:messages) {
      const block=document.createElement('div');block.className=`pa-message pa-message--${message.role}`;
      block.textContent=replyReveal?.message===message?replyReveal.visible:message.content;log.appendChild(block);messageNodes.set(message,block);
    }
    update();history.scrollTop=follow||atBottom?history.scrollHeight:top;
  }
  function finishReplyReveal() {
    clearTimeout(replyTimer);replyTimer=0;
    if(!replyReveal)return;
    const state=replyReveal;replyReveal=null;
    const follow=history.scrollHeight-history.scrollTop-(history.clientHeight||0)<32;
    const block=messageNodes.get(state.message);if(block)block.textContent=state.message.content;
    if(follow)history.scrollTop=history.scrollHeight;
  }
  function revealReply(message) {
    finishReplyReveal();
    if(reducedMotion()||document.hidden){render();return;}
    const segments=typeof Intl.Segmenter==='function'
      ?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(message.content),part=>part.segment)
      :Array.from(message.content);
    const state={message,visible:'',count:0};replyReveal=state;render();
    const step=Math.max(1,Math.ceil(segments.length/260));
    function advance() {
      if(replyReveal!==state||!opened)return;
      const follow=history.scrollHeight-history.scrollTop-(history.clientHeight||0)<32;
      state.count=Math.min(segments.length,state.count+step);state.visible=segments.slice(0,state.count).join('');
      const block=messageNodes.get(message);if(block)block.textContent=state.visible;
      if(follow)history.scrollTop=history.scrollHeight;
      if(state.count===segments.length){replyReveal=null;replyTimer=0;return;}
      const punctuation=/[，。！？、,.!?;；：:]$/.test(state.visible);
      replyTimer=setTimeout(advance,punctuation?90:22);
    }
    replyTimer=setTimeout(advance,22);
  }
  function resizeInput() {
    const viewportHeight=window.visualViewport?.height||innerHeight;
    const maxHeight=Math.min(96,Math.max(48,viewportHeight*.22));
    input.style.height='auto';input.style.height=`${Math.min(maxHeight,Math.max(48,input.scrollHeight))}px`;
  }
  function abort() {generation++;controller?.abort();controller=null;busy=false;pendingMessage=null;finishReplyReveal();}
  function clear() {cancelVoice();abort();messages.length=0;announcer.textContent='';feedback='';voiceExpanded=false;render();if(opened)input.focus({preventScroll:true});}
  async function submit() {
    const content=input.value.trim();if(!opened||busy||voiceState||!content)return;
    if(!configured()){feedback='offline';render();return;}
    if(content.length>1000){feedback='invalid_messages';render();return;}
    finishReplyReveal();announcer.textContent='';
    pendingMessage={role:'user',content};const question=pendingMessage;feedback='';busy=true;
    const token=++generation;controller=new AbortController();render({follow:true});
    let completedReply=null;
    try {
      const connection=window.PortfolioAssistantConnection;
      const result=typeof connection?.reply==='function'
        ?await connection.reply([...messages,question].map(message=>({...message})),{signal:controller.signal})
        :{status:'not_connected'};
      if (token!==generation||!opened)return;
      const answer=result?.status==='ok'&&result.message?.role==='assistant'?result.message.content:null;
      if (typeof answer==='string'&&answer.trim()) {
        completedReply={role:'assistant',content:answer.trim()};messages.push(question,completedReply);input.value='';resizeInput();announcer.textContent=completedReply.content;
      }
      else if (result?.status==='not_connected') feedback='offline';
      else if (result?.status!=='aborted') feedback=serviceErrors.has(result?.error?.code)?result.error.code:'error';
    } catch(error) {
      if(token===generation&&opened&&error?.name!=='AbortError')feedback='error';
    } finally {
      if(token===generation){controller=null;busy=false;pendingMessage=null;if(completedReply)revealReply(completedReply);else render();}
    }
  }
  function paintVoice(levels=[]) {
    waveRenderer?.setLevels(levels);
  }
  function cancelVoice() {
    voiceGeneration++;clearTimeout(voiceSetupTimer);voiceSetupTimer=0;voiceController?.abort();voiceCapture?.cancel();voiceCapture=null;voiceController=null;
    if(voiceContext&&voiceContext.state!=='closed')Promise.resolve(voiceContext.close()).catch(()=>{});
    waveRenderer?.stop();popup.dataset.voiceLit='false';voiceContext=null;voiceState='';voiceExpanded=false;
  }
  async function startVoice() {
    if(!opened||busy)return;
    if(voiceState){if(voiceState==='listening')voiceCapture?.stop();else{cancelVoice();update();position();}return;}
    const connection=window.PortfolioAssistantConnection;
    if(!connection?.supportsVoice){feedback='voice_unavailable';render();return;}
    if(input.value.length>=1000){feedback='voice_too_long';render();return;}
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext){feedback='voice_unsupported';render();return;}
    finishReplyReveal();
    const draft=input.value,start=input.selectionStart??draft.length,end=input.selectionEnd??start;
    const token=++voiceGeneration;voiceController=new AbortController();const signal=voiceController.signal;
    voiceState='requesting';voiceExpanded=true;feedback='';paintVoice();render();position();
    voiceSetupTimer=setTimeout(()=>{if(token===voiceGeneration){cancelVoice();feedback='voice_permission_timeout';render();position();}},15000);
    try{
      // Resume during the actual click, before the lazy module or permission await.
      voiceContext=new AudioContext();Promise.resolve(voiceContext.resume()).catch(()=>{});
      voiceModule ||= import(voiceModuleURL.href);
      waveModule ||= import(waveModuleURL.href).catch(()=>{waveModule=null;return null;});
      const [module,wave]=await Promise.all([voiceModule,waveModule]);
      if(token!==voiceGeneration||!opened)return;
      if(!waveRenderer&&wave?.createVoiceWave){
        try{waveRenderer=wave.createVoiceWave(find('.pa-wave'),{isReducedMotion:reducedMotion,onLit:lit=>{popup.dataset.voiceLit=String(!!lit&&voiceState==='listening');}});}catch(_){}
      }
      voiceCapture=module.record({context:voiceContext,signal,onLevels:paintVoice,onState:state=>{
        if(token!==voiceGeneration||!opened)return;
        voiceState=state;if(state==='listening'){clearTimeout(voiceSetupTimer);voiceSetupTimer=0;waveRenderer?.start();}else waveRenderer?.stop();update();
      }});
      const audio=await voiceCapture.result;
      if(token!==voiceGeneration||!opened)return;
      voiceCapture=null;voiceContext=null;voiceState='transcribing';waveRenderer?.stop();popup.dataset.voiceLit='false';update();
      const result=await connection.transcribe(audio,{signal});
      if(token!==voiceGeneration||!opened)return;
      if(result?.status==='ok'&&typeof result.text==='string'){
        // Capture cannot edit the draft. Insert at the original selection, never send.
        const available=1000-(draft.length-(end-start)),words=result.text.slice(0,available);
        input.value=draft.slice(0,start)+words+draft.slice(end);resizeInput();
        input.setSelectionRange?.(start+words.length,start+words.length);
        if(words.length<result.text.length)feedback='voice_too_long';
      }else if(result?.status!=='aborted')feedback=voiceErrors.has(result?.error?.code)?result.error.code:'voice_error';
    }catch(error){
      if(token===voiceGeneration&&opened&&error?.code!=='voice_cancelled'){
        feedback=voiceErrors.has(error?.code)?error.code:'voice_capture_error';
        // A failed download can be retried on the next click.
        if(!voiceCapture)voiceModule=null;
      }
    }finally{
      if(token===voiceGeneration){cancelVoice();render();position();if(opened)input.focus({preventScroll:true});}
    }
  }
  function position() {
    if(!opened)return;
    const visual=window.visualViewport,height=visual?.height||innerHeight,width=visual?.width||innerWidth;
    const viewTop=visual?.offsetTop||0,viewLeft=visual?.offsetLeft||0;
    const margin=12,boxWidth=Math.min(440,Math.max(0,width-margin*2));
    const left=viewLeft+(width-boxWidth)/2;
    // Fixed positioning uses the layout viewport; lift the bottom edge above
    // a software keyboard, then retain the ordinary safe-area breathing room.
    const bottom=Math.max(0,innerHeight-viewTop-height)+16;
    const maxHeight=`max(0px, min(480px, calc(${Math.max(0,height-32)}px - env(safe-area-inset-bottom, 0px))))`;
    popup.style.width=`${boxWidth}px`;popup.style.left=`${left}px`;popup.style.top='auto';
    popup.style.bottom=`calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
    popup.style.maxHeight=maxHeight;
    popup.style.setProperty('--pa-available-height',maxHeight);
    popup.style.setProperty('--pa-viewport',`${height}px`);
    popup.dataset.compact=String(height<400);resizeInput();
  }
  function announce(open) {dispatchEvent(new CustomEvent('portfolio:assistant',{detail:{open}}));}
  function open(options={}) {
    if(opened||window.PortfolioNavigation?.assistantAvailable?.()!==true)return;
    returnFocus=document.activeElement;feedback='';opened=true;
    popup.inert=false;popup.dataset.open='true';popup.setAttribute('aria-hidden','false');
    update();position();popup.classList.add('is-visible');announce(true);
    if(options?.focusClose)closeButton.focus({preventScroll:true});
  }
  function close(options={}) {
    if(!opened)return;
    const focusedInside=popup.contains(document.activeElement);
    opened=false;cancelVoice();voiceExpanded=false;abort();popup.dataset.open='false';popup.classList.remove('is-visible');
    popup.inert=true;popup.setAttribute('aria-hidden','true');announce(false);
    if(options?.restoreFocus!==false&&focusedInside) {
      const target=returnFocus?.isConnected&&!returnFocus.closest('[inert]')?returnFocus:dot();
      if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});
    }
    returnFocus=null;render();
  }
  function outside(event) {
    if(!opened)return;
    const anchor=dot(),path=event.composedPath?.()||[];
    if(popup.contains(event.target)||anchor?.contains(event.target)||path.includes(popup)||path.includes(anchor))return;
    close({restoreFocus:false});
  }
  closeButton.addEventListener('click',()=>close());
  voiceButton.addEventListener('click',startVoice);
  find('.pa-form').addEventListener('submit',event=>{event.preventDefault();submit();});
  input.addEventListener('input',()=>{resizeInput();update();});
  popup.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==='Enter'&&event.target===input&&!event.shiftKey&&!event.isComposing){
      event.preventDefault();event.stopPropagation();submit();
    }
  });
  document.addEventListener('keydown',event=>{
    if(opened&&event.key==='Escape'){event.preventDefault();close();}
  });
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('click',outside,true);
  document.addEventListener('visibilitychange',()=>{popup.dataset.suspended=String(document.hidden);if(document.hidden){finishReplyReveal();if(voiceState){cancelVoice();update();position();}}});
  motion?.addEventListener?.('change',()=>{if(reducedMotion())finishReplyReveal();});
  addEventListener('portfolio:navigation',event=>{
    const mode=event.detail?.mode,reason=event.detail?.reason,previous=navigationMode;
    if(typeof mode==='string')navigationMode=mode;
    if(reason==='assistant'||reason==='typing')return;
    if(opened&&(reason==='navigation'||(previous!==null&&typeof mode==='string'&&mode!==previous)))close({restoreFocus:false});
  });
  addEventListener('portfolio:language',()=>{update();position();});
  addEventListener('resize',position,{passive:true});addEventListener('scroll',position,{passive:true});
  window.visualViewport?.addEventListener('resize',position,{passive:true});
  window.visualViewport?.addEventListener('scroll',position,{passive:true});
  addEventListener('pagehide',()=>{finishReplyReveal();waveRenderer?.destroy();waveRenderer=null;if(opened)close({restoreFocus:false});});
  window.PortfolioAssistant=Object.freeze({open,close,toggle:options=>opened?close(options):open(options),isOpen:()=>opened,clear});
  render();
})();
