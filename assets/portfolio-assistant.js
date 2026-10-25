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
  popup.dataset.open='false';popup.dataset.suspended=String(document.hidden);popup.inert=true;
  popup.innerHTML=`<div class="pa-window">
    <div class="pa-top"><svg class="pa-wave" viewBox="0 0 112 36" aria-hidden="true" focusable="false">${waveform}</svg><button class="pa-close" type="button"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>
    <div class="pa-history" hidden><div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div><p class="pa-notice" role="status" hidden></p></div>
    <form class="pa-form"><textarea class="pa-input" rows="1" maxlength="3000"></textarea><button class="pa-send" type="submit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5m-5 5 5-5 5 5"/></svg></button></form>
    <span class="pa-status" id="pa-status" role="status"></span>
  </div>`;
  document.body.appendChild(popup);
  const find=selector=>popup.querySelector(selector),dot=()=>document.getElementById('dot');
  const input=find('.pa-input'),sendButton=find('.pa-send'),closeButton=find('.pa-close');
  const history=find('.pa-history'),log=find('.pa-log'),notice=find('.pa-notice');
  const status=find('.pa-status'),messages=[];
  let opened=false,busy=false,controller=null,generation=0,returnFocus=null;
  let feedback='',navigationMode=null;
  const copy={
    zh:{title:'关于我的对话',close:'关闭对话',preview:'AI 尚未连接',ready:'可以提问',pending:'等待回复…',
      placeholder:'想了解什么？',send:'发送',
      offline:'AI 尚未连接。',error:'暂时无法回复，请稍后再试。'},
    en:{title:'Ask about me',close:'Close conversation',preview:'AI is not connected',ready:'Ready for a question',pending:'Waiting for a reply…',
      placeholder:'Ask me something…',send:'Send',
      offline:'AI is not connected yet.',error:'A reply is unavailable. Please try again later.'},
  };
  const language=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang==='en'?'en':'zh';
  const text=()=>copy[language()];
  const configured=()=>!!window.PortfolioAssistantConnection&&window.PortfolioAssistantConnection.mode!=='not_connected';
  function update() {
    const t=text();popup.setAttribute('aria-label',t.title);
    status.textContent=busy?t.pending:configured()?t.ready:t.preview;
    closeButton.setAttribute('aria-label',t.close);
    input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);
    sendButton.setAttribute('aria-label',t.send);sendButton.disabled=busy||!input.value.trim();
    popup.classList.toggle('is-pending',busy);popup.setAttribute('aria-busy',String(busy));
    const hasHistory=messages.length>0||!!feedback;
    history.hidden=!hasHistory;popup.classList.toggle('has-history',hasHistory);
    notice.hidden=!feedback;notice.textContent=feedback?t[feedback]||t.error:'';
  }
  function render() {
    log.replaceChildren();
    for (const message of messages) {
      const block=document.createElement('div');block.className=`pa-message pa-message--${message.role}`;
      block.textContent=message.content;log.appendChild(block);
    }
    update();history.scrollTop=history.scrollHeight;
  }
  function resizeInput() {
    const viewportHeight=window.visualViewport?.height||innerHeight;
    const maxHeight=Math.min(96,Math.max(44,viewportHeight*.22));
    input.style.height='auto';input.style.height=`${Math.min(maxHeight,Math.max(44,input.scrollHeight))}px`;
  }
  function abort() {generation++;controller?.abort();controller=null;busy=false;}
  function clear() {abort();messages.length=0;feedback='';render();if(opened)input.focus({preventScroll:true});}
  async function submit() {
    const content=input.value.trim();if(!opened||busy||!content)return;
    messages.push({role:'user',content});input.value='';resizeInput();feedback='';busy=true;
    const token=++generation;controller=new AbortController();render();
    try {
      const connection=window.PortfolioAssistantConnection;
      const result=typeof connection?.reply==='function'
        ?await connection.reply(messages.map(message=>({...message})),{signal:controller.signal})
        :{status:'not_connected'};
      if (token!==generation||!opened)return;
      const answer=result?.status==='ok'&&result.message?.role==='assistant'?result.message.content:null;
      if (typeof answer==='string'&&answer.trim()) messages.push({role:'assistant',content:answer.trim()});
      else if (result?.status==='not_connected') feedback='offline';
      else if (result?.status!=='aborted') feedback='error';
    } catch(error) {
      if(token===generation&&opened&&error?.name!=='AbortError')feedback='error';
    } finally {
      if(token===generation){controller=null;busy=false;render();}
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
    opened=false;abort();popup.dataset.open='false';popup.classList.remove('is-visible');
    popup.inert=true;popup.setAttribute('aria-hidden','true');announce(false);
    if(options?.restoreFocus!==false&&focusedInside) {
      const target=returnFocus?.isConnected&&!returnFocus.closest('[inert]')?returnFocus:dot();
      if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});
    }
    returnFocus=null;update();
  }
  function outside(event) {
    if(!opened)return;
    const anchor=dot(),path=event.composedPath?.()||[];
    if(popup.contains(event.target)||anchor?.contains(event.target)||path.includes(popup)||path.includes(anchor))return;
    close({restoreFocus:false});
  }
  closeButton.addEventListener('click',()=>close());
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
