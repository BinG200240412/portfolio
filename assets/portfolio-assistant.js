/* A non-modal conversation popover at the visible viewport's bottom centre.
 * API: PortfolioAssistant.open({focusClose?:boolean}), close({restoreFocus?:boolean}),
 * toggle(), isOpen(), clear(). State event: portfolio:assistant {open:boolean}.
 * The connection module owns transport. Only its ok/assistant result is a reply.
 */
(() => {
  'use strict';
  if (window.PortfolioAssistant) return;
  const columns=[1,1,3,3,5,7,5,3,1,3,5,7,9,7,5,3,1,3,5,7,5,3,1,3,3,1,1];
  const waveform=columns.map((count,column)=>Array.from({length:count},(_,row)=>
    `<circle cx="${4+column*4}" cy="${18+(row-(count-1)/2)*4}" r="1.1" style="--pa-column:${column}"/>`
  ).join('')).join('');
  const popup=document.createElement('section');
  popup.id='portfolio-assistant';popup.className='pa-popover';
  popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');
  popup.setAttribute('aria-describedby','pa-status');
  popup.setAttribute('data-i18n-ignore','');popup.setAttribute('aria-hidden','true');
  popup.dataset.open='false';popup.dataset.voiceExpanded='false';popup.dataset.suspended=String(document.hidden);popup.inert=true;
  popup.innerHTML=`<div class="pa-window">
    <div class="pa-history" hidden><div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div><p class="pa-notice" role="status" hidden></p></div>
    <div class="pa-voice-panel" id="pa-voice-panel" aria-hidden="true"><div class="pa-voice-inner"><svg class="pa-wave" viewBox="0 0 112 36" aria-hidden="true" focusable="false">${waveform}</svg></div></div>
    <form class="pa-form">
      <button class="pa-voice-toggle" type="button" aria-controls="pa-voice-panel" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6"/></svg></button>
      <textarea class="pa-input" rows="1" maxlength="1000"></textarea>
      <button class="pa-send" type="submit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5m-5 5 5-5 5 5"/></svg></button>
      <button class="pa-close" type="button"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m5 5 10 10M15 5 5 15"/></svg></button>
    </form>
    <span class="pa-status" id="pa-status" role="status"></span>
  </div>`;
  document.body.appendChild(popup);
  const find=selector=>popup.querySelector(selector),dot=()=>document.getElementById('dot');
  const input=find('.pa-input'),sendButton=find('.pa-send'),closeButton=find('.pa-close');
  const voiceButton=find('.pa-voice-toggle');
  const history=find('.pa-history'),log=find('.pa-log'),notice=find('.pa-notice');
  const status=find('.pa-status'),messages=[];
  let opened=false,voiceExpanded=false,busy=false,controller=null,generation=0,returnFocus=null;
  let feedback='',navigationMode=null,pendingMessage=null;
  const copy={
    zh:{title:'关于我的对话',close:'关闭对话',preview:'AI 尚未连接',ready:'可以提问',pending:'等待回复…',
      placeholder:'你想问我什么？',send:'发送',voiceOpen:'展开语音面板',voiceClose:'收起语音面板',
      offline:'尚未接入',error:'暂时无法回复，请稍后再试。',
      not_configured:'AI 还在准备，请稍后再来。',rate_limited:'问得有点快，请稍后再试。',
      budget_exhausted:'问答额度已用完，请稍后再来。',invalid_session:'会话已过期，请再发送一次。',
      upstream_error:'暂时无法回复，请稍后再试。',timeout:'回复超时了，请再试一次。',
      busy:'正在处理其他提问，请稍后再试。',invalid_messages:'请将问题控制在 1000 字以内。'},
    en:{title:'Ask about me',close:'Close conversation',preview:'AI is not connected',ready:'Ready for a question',pending:'Waiting for a reply…',
      placeholder:'Ask me a question',send:'Send',voiceOpen:'Expand voice panel',voiceClose:'Collapse voice panel',
      offline:'Not connected',error:'A reply is unavailable. Please try again later.',
      not_configured:'The assistant is being prepared. Please check back later.',rate_limited:'Please wait a moment before asking again.',
      budget_exhausted:'The question allowance is used up. Please check back later.',invalid_session:'Your session expired. Please send your question again.',
      upstream_error:'A reply is unavailable. Please try again later.',timeout:'The reply timed out. Please try again.',
      busy:'The assistant is busy. Please try again shortly.',invalid_messages:'Please keep your question within 1000 characters.'},
  };
  const serviceErrors=new Set(['not_configured','rate_limited','budget_exhausted','invalid_session','upstream_error','timeout','busy','invalid_messages']);
  const language=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang==='en'?'en':'zh';
  const text=()=>copy[language()];
  const configured=()=>!!window.PortfolioAssistantConnection&&window.PortfolioAssistantConnection.mode!=='not_connected';
  function update() {
    const t=text();popup.setAttribute('aria-label',t.title);
    status.textContent=busy?t.pending:configured()?t.ready:t.preview;
    closeButton.setAttribute('aria-label',t.close);
    input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);
    popup.dataset.voiceExpanded=String(voiceExpanded);
    voiceButton.setAttribute('aria-expanded',String(voiceExpanded));
    voiceButton.setAttribute('aria-label',voiceExpanded?t.voiceClose:t.voiceOpen);
    sendButton.setAttribute('aria-label',t.send);sendButton.disabled=busy||!input.value.trim();input.readOnly=busy;
    popup.classList.toggle('is-pending',busy);popup.setAttribute('aria-busy',String(busy));
    const hasHistory=messages.length>0||!!pendingMessage||!!feedback;
    history.hidden=!hasHistory;popup.classList.toggle('has-history',hasHistory);popup.classList.toggle('has-messages',messages.length>0||!!pendingMessage);
    notice.hidden=!feedback;notice.textContent=feedback?t[feedback]||t.error:'';
  }
  function render() {
    log.replaceChildren();
    for (const message of pendingMessage?[...messages,pendingMessage]:messages) {
      const block=document.createElement('div');block.className=`pa-message pa-message--${message.role}`;
      block.textContent=message.content;log.appendChild(block);
    }
    update();history.scrollTop=history.scrollHeight;
  }
  function resizeInput() {
    const viewportHeight=window.visualViewport?.height||innerHeight;
    const maxHeight=Math.min(96,Math.max(48,viewportHeight*.22));
    input.style.height='auto';input.style.height=`${Math.min(maxHeight,Math.max(48,input.scrollHeight))}px`;
  }
  function abort() {generation++;controller?.abort();controller=null;busy=false;pendingMessage=null;}
  function clear() {abort();messages.length=0;feedback='';voiceExpanded=false;render();if(opened)input.focus({preventScroll:true});}
  async function submit() {
    const content=input.value.trim();if(!opened||busy||!content)return;
    if(!configured()){feedback='offline';render();return;}
    if(content.length>1000){feedback='invalid_messages';render();return;}
    pendingMessage={role:'user',content};const question=pendingMessage;feedback='';busy=true;
    const token=++generation;controller=new AbortController();render();
    try {
      const connection=window.PortfolioAssistantConnection;
      const result=typeof connection?.reply==='function'
        ?await connection.reply([...messages,question].map(message=>({...message})),{signal:controller.signal})
        :{status:'not_connected'};
      if (token!==generation||!opened)return;
      const answer=result?.status==='ok'&&result.message?.role==='assistant'?result.message.content:null;
      if (typeof answer==='string'&&answer.trim()) {
        messages.push(question,{role:'assistant',content:answer.trim()});input.value='';resizeInput();
      }
      else if (result?.status==='not_connected') feedback='offline';
      else if (result?.status!=='aborted') feedback=serviceErrors.has(result?.error?.code)?result.error.code:'error';
    } catch(error) {
      if(token===generation&&opened&&error?.name!=='AbortError')feedback='error';
    } finally {
      if(token===generation){controller=null;busy=false;pendingMessage=null;render();}
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
    opened=false;voiceExpanded=false;abort();popup.dataset.open='false';popup.classList.remove('is-visible');
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
  // This is the voice UI preview; capture and transport are not connected yet.
  voiceButton.addEventListener('click',()=>{
    if(!opened)return;
    voiceExpanded=!voiceExpanded;update();position();
  });
  find('.pa-form').addEventListener('submit',event=>{event.preventDefault();submit();});
  input.addEventListener('input',()=>{resizeInput();sendButton.disabled=busy||!input.value.trim();});
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
  document.addEventListener('visibilitychange',()=>{popup.dataset.suspended=String(document.hidden);});
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
  addEventListener('pagehide',()=>{if(opened)close({restoreFocus:false});});
  window.PortfolioAssistant=Object.freeze({open,close,toggle:options=>opened?close(options):open(options),isOpen:()=>opened,clear});
  render();
})();
