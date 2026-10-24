/* Body-level modal UI. The connection module owns transport and credentials.
 * API: PortfolioAssistant.open(), close(), toggle(), isOpen(), clear().
 * State event: portfolio:assistant, detail {open:boolean}.
 */
(() => {
  'use strict';
  if (window.PortfolioAssistant) return;
  const dialog=document.createElement('dialog');
  dialog.id='portfolio-assistant';dialog.className='pa-dialog';
  dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','pa-title');
  dialog.setAttribute('aria-describedby','pa-status');dialog.setAttribute('data-i18n-ignore','');
  dialog.innerHTML=`<div class="pa-window">
    <header class="pa-head"><h2 class="pa-title" id="pa-title">Who am I</h2><button class="pa-close" type="button">×</button></header>
    <div class="pa-beacon"><button class="pa-eye" type="button" aria-pressed="false"><span class="pa-orbits" aria-hidden="true"><span class="pa-ring pa-ring--one"></span><span class="pa-ring pa-ring--two"></span><span class="pa-ring pa-ring--three"></span><span class="pa-core"></span></span></button><p class="pa-status" id="pa-status" role="status"></p></div>
    <section class="pa-panel"><div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div><div class="pa-chips"></div><p class="pa-notice" role="status" hidden></p>
      <form class="pa-form"><textarea class="pa-input" rows="2" maxlength="3000"></textarea><button class="pa-send" type="submit"></button></form>
    </section><footer class="pa-foot"><span class="pa-key-hint"></span><button class="pa-clear" type="button" hidden></button></footer>
  </div>`;
  document.body.appendChild(dialog);
  const find=selector=>dialog.querySelector(selector);
  const input=find('.pa-input'),sendButton=find('.pa-send'),closeButton=find('.pa-close');
  const eye=find('.pa-eye'),log=find('.pa-log'),chips=find('.pa-chips'),notice=find('.pa-notice');
  const status=find('.pa-status'),clearButton=find('.pa-clear');
  const messages=[];
  let opened=false,busy=false,controller=null,generation=0,returnFocus=null;
  let feedback='';
  const copy={
    zh:{close:'关闭对话',eye:'放大或缩小呼吸圈',preview:'界面预览 · AI 尚未连接',ready:'关于作品，你可以直接提问',pending:'等待回复…',
      empty:'你想了解什么？',placeholder:'写下你的问题…',send:'发送',clear:'清空对话',hint:'Enter 发送 · Shift + Enter 换行',
      offline:'AI 尚未连接。这是本地界面预览，暂时不会生成回答。',error:'暂时无法取得回复，请稍后再试。',
      chips:['数独是怎么做的？','你如何使用 AI？','聊聊你的设计方法']},
    en:{close:'Close conversation',eye:'Expand or shrink the breathing rings',preview:'Interface preview · AI not connected',ready:'Ask a question about the work',pending:'Waiting for a reply…',
      empty:'What would you like to know?',placeholder:'Write your question…',send:'Send',clear:'Clear conversation',hint:'Enter to send · Shift + Enter for a new line',
      offline:'AI is not connected. This is a local interface preview; no answer will be generated yet.',error:'A reply is unavailable right now. Please try again later.',
      chips:['How was Sudoku made?','How do you use AI?','What is your design process?']},
  };
  const language=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang==='en'?'en':'zh';
  const text=()=>copy[language()];
  const configured=()=>!!window.PortfolioAssistantConnection&&window.PortfolioAssistantConnection.mode!=='not_connected';
  function update() {
    const t=text();
    status.textContent=busy?t.pending:configured()?t.ready:t.preview;
    closeButton.setAttribute('aria-label',t.close);eye.setAttribute('aria-label',t.eye);
    input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);
    sendButton.textContent=t.send;sendButton.disabled=busy||!input.value.trim();
    clearButton.textContent=t.clear;clearButton.hidden=!messages.length;
    find('.pa-key-hint').textContent=t.hint;
    dialog.classList.toggle('is-pending',busy);dialog.setAttribute('aria-busy',String(busy));
    notice.hidden=!feedback;notice.textContent=feedback?t[feedback]||t.error:'';
    chips.replaceChildren();
    for (const question of t.chips) {
      const button=document.createElement('button');button.type='button';button.className='pa-chip';
      button.textContent=question;button.disabled=busy;
      button.addEventListener('click',()=>{
        input.value=question;resizeInput();submit();input.focus({preventScroll:true});
      });chips.appendChild(button);
    }
    chips.hidden=messages.length>0;
    const empty=find('.pa-empty');if(empty)empty.textContent=t.empty;
  }
  function render() {
    log.replaceChildren();
    if (!messages.length) {
      const empty=document.createElement('p');empty.className='pa-empty';empty.textContent=text().empty;log.appendChild(empty);
    }
    for (const message of messages) {
      const block=document.createElement('div');block.className=`pa-message pa-message--${message.role}`;
      block.textContent=message.content;log.appendChild(block);
    }
    log.scrollTop=log.scrollHeight;update();
  }
  function resizeInput() {input.style.height='auto';input.style.height=`${Math.min(120,Math.max(48,input.scrollHeight))}px`;}
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
  function viewport() {
    const visual=window.visualViewport;
    const height=visual?.height||innerHeight;
    dialog.dataset.compact=String(height<570);
    dialog.style.setProperty('--pa-viewport',`${height}px`);
    dialog.style.setProperty('--pa-visual-top',`${visual?.offsetTop||0}px`);
  }
  function announce(open) {dispatchEvent(new CustomEvent('portfolio:assistant',{detail:{open}}));}
  function open() {
    if(opened)return;
    returnFocus=document.activeElement;feedback='';opened=true;update();viewport();
    announce(true);
    dialog.showModal();
    // Focus the close control first so opening never summons a mobile keyboard.
    closeButton.focus({preventScroll:true});
  }
  function close() {
    if(!opened)return;
    opened=false;abort();
    // The shell restores its stage before the trigger receives focus again.
    announce(false);
    if(dialog.open)dialog.close();
    if(returnFocus?.isConnected&&!returnFocus.closest('[inert]'))returnFocus.focus({preventScroll:true});
    returnFocus=null;update();
  }
  closeButton.addEventListener('click',close);clearButton.addEventListener('click',clear);
  eye.addEventListener('click',()=>eye.setAttribute('aria-pressed',String(eye.getAttribute('aria-pressed')!=='true')));
  find('.pa-form').addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();submit();});
  input.addEventListener('input',()=>{resizeInput();sendButton.disabled=busy||!input.value.trim();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(opened&&!dialog.open)close();});
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='Enter'&&event.target===input&&!event.shiftKey&&!event.isComposing){event.preventDefault();submit();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(dialog.querySelectorAll('button:not(:disabled),textarea:not(:disabled),[tabindex="0"]'))
      .filter(element=>!element.closest('[hidden]'));
    const first=controls[0],last=controls[controls.length-1],focused=document.activeElement;
    if(event.shiftKey&&(focused===first||!dialog.contains(focused))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(focused===last||!dialog.contains(focused))){event.preventDefault();first?.focus();}
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
  });
  addEventListener('portfolio:language',update);
  addEventListener('resize',viewport,{passive:true});window.visualViewport?.addEventListener('resize',viewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',viewport,{passive:true});
  addEventListener('pagehide',()=>{if(opened)close();});
  window.PortfolioAssistant=Object.freeze({open,close,toggle:()=>opened?close():open(),isOpen:()=>opened,clear});
  render();
})();
