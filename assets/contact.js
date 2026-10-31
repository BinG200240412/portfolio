/* Copy the same public address as the visible mail link; never submit a form. */
(() => {
  'use strict';
  const page=document.getElementById('contact-page');if(!page)return;
  const button=page.querySelector('.contact-copy-email'),email=page.querySelector('.contact-email'),status=page.querySelector('.contact-feedback');
  const text=value=>window.PortfolioI18n?.t(value)||value;
  let generation=0;
  function reset(){generation++;button.disabled=false;status.textContent='';}
  button.disabled=false;
  button.addEventListener('click',async()=>{
    if(button.disabled||!page.classList.contains('live'))return;
    const token=++generation;button.disabled=true;status.textContent='';
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email.textContent.trim());
      if(token===generation&&page.classList.contains('live'))status.textContent=text('已复制');
    }catch(_){
      if(token!==generation||!page.classList.contains('live'))return;
      const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(email);selection?.removeAllRanges();selection?.addRange(range);
      status.textContent=text('请选中邮箱复制。');
    }finally{if(token===generation)button.disabled=false;}
  });
  addEventListener('portfolio:navigation',event=>{if(event.detail?.mode!=='contact')reset();});
  addEventListener('portfolio:language',reset);
  addEventListener('pagehide',reset);
})();
