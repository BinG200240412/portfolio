/* A non-modal conversation popover anchored to the existing red #dot.
 * API: PortfolioAssistant.open({focusClose?:boolean}), close({restoreFocus?:boolean}),
 * toggle(), isOpen(), clear(). State event: portfolio:assistant {open:boolean}.
 * The connection module owns transport. Only its ok/assistant result is a reply.
 */
(() => {
  'use strict';
  if (window.PortfolioAssistant) return;
  const popup=document.createElement('section');
  popup.id='portfolio-assistant';popup.className='pa-popover';
  popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');
  popup.setAttribute('aria-labelledby','pa-title');popup.setAttribute('aria-describedby','pa-status');
  popup.setAttribute('data-i18n-ignore','');popup.setAttribute('aria-hidden','true');
  popup.dataset.open='false';popup.inert=true;
  popup.innerHTML=`<div class="pa-window">
    <header class="pa-head"><h2 class="pa-title" id="pa-title"></h2><button class="pa-close" type="button">×</button></header>
    <p class="pa-status" id="pa-status" role="status"></p>
    <section class="pa-panel"><div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div><div class="pa-chips"></div><p class="pa-notice" role="status" hidden></p>
      <form class="pa-form"><textarea class="pa-input" rows="1" maxlength="3000"></textarea><button class="pa-send" type="submit"></button></form>
    </section><footer class="pa-foot"><button class="pa-clear" type="button" hidden></button></footer>
  </div>`;
  document.body.appendChild(popup);
  const find=selector=>popup.querySelector(selector),dot=()=>document.getElementById('dot');
  const input=find('.pa-input'),sendButton=find('.pa-send'),closeButton=find('.pa-close');
  const log=find('.pa-log'),chips=find('.pa-chips'),notice=find('.pa-notice');
  const status=find('.pa-status'),clearButton=find('.pa-clear'),messages=[];
  let opened=false,busy=false,controller=null,generation=0,returnFocus=null;
  let feedback='',navigationMode=null;
  const copy={
    zh:{title:'有什么想了解的？',close:'关闭对话',preview:'尚未连接',ready:'可以提问',pending:'等待回复…',
      placeholder:'写下你的问题…',send:'发送',clear:'清空',
      offline:'AI 尚未连接，暂时不会生成回答。',error:'暂时无法取得回复，请稍后再试。',
      chips:['数独是怎么做的？','你如何使用 AI？','你的设计方法']},
    en:{title:'What would you like to know?',close:'Close conversation',preview:'Not connected',ready:'Ready for a question',pending:'Waiting for a reply…',
      placeholder:'Write your question…',send:'Send',clear:'Clear',
      offline:'AI is not connected; no answer will be generated yet.',error:'A reply is unavailable right now. Please try again later.',
      chips:['How was Sudoku made?','How do you use AI?','Your design process']},
  };
  const language=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang==='en'?'en':'zh';
  const text=()=>copy[language()];
  const configured=()=>!!window.PortfolioAssistantConnection&&window.PortfolioAssistantConnection.mode!=='not_connected';
  function update() {
    const t=text();find('.pa-title').textContent=t.title;
    status.textContent=busy?t.pending:configured()?t.ready:t.preview;
    closeButton.setAttribute('aria-label',t.close);
    input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);
    sendButton.textContent=t.send;sendButton.disabled=busy||!input.value.trim();
    clearButton.textContent=t.clear;clearButton.hidden=!messages.length;
    popup.classList.toggle('is-pending',busy);popup.setAttribute('aria-busy',String(busy));
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
  }
  function render() {
    log.replaceChildren();log.hidden=!messages.length;
    for (const message of messages) {
      const block=document.createElement('div');block.className=`pa-message pa-message--${message.role}`;
      block.textContent=message.content;log.appendChild(block);
    }
    log.scrollTop=log.scrollHeight;update();
  }
  function resizeInput() {
    input.style.height='auto';input.style.height=`${Math.min(90,Math.max(30,input.scrollHeight))}px`;
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
    const anchor=dot();if(!anchor)return;
    const visual=window.visualViewport,height=visual?.height||innerHeight,width=visual?.width||innerWidth;
    const viewTop=visual?.offsetTop||0,viewLeft=visual?.offsetLeft||0;
    const viewBottom=viewTop+height,rect=anchor.getBoundingClientRect(),margin=12;
    const boxWidth=Math.min(popup.getBoundingClientRect().width||360,width-margin*2);
    const left=Math.max(viewLeft+margin,Math.min(viewLeft+width-boxWidth-margin,rect.left+rect.width/2-boxWidth/2));
    let top=rect.bottom+30,available=viewBottom-top-margin;
    // A software keyboard can leave the anchor outside the visible viewport.
    // Keep the composer reachable, while normally staying directly below it.
    const anchorVisible=rect.bottom>=viewTop&&rect.top<=viewBottom;
    if(!anchorVisible||available<95) {
      top=Math.max(viewTop+margin,viewBottom-Math.min(300,height-margin*2)-margin);
      available=viewBottom-top-margin;
    }
    const maxHeight=Math.max(0,Math.min(300,available));
    popup.style.left=`${left}px`;popup.style.top=`${top}px`;popup.style.maxHeight=`${maxHeight}px`;
    popup.style.setProperty('--pa-available-height',`${maxHeight}px`);
    popup.style.setProperty('--pa-viewport',`${height}px`);
    popup.dataset.compact=String(height<570);
  }
  function announce(open) {dispatchEvent(new CustomEvent('portfolio:assistant',{detail:{open}}));}
  function open(options={}) {
    if(opened)return;
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
  closeButton.addEventListener('click',()=>close());clearButton.addEventListener('click',clear);
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
  const layout=new ResizeObserver(position);
  const line=dot()?.closest('.line');if(line)layout.observe(line);
  if(dot())layout.observe(dot());
  addEventListener('pagehide',()=>{if(opened)close({restoreFocus:false});});
  window.PortfolioAssistant=Object.freeze({open,close,toggle:options=>opened?close(options):open(options),isOpen:()=>opened,clear});
  render();
})();
