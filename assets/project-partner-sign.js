/* Small native-LED partner plaques. Text fallback appears before the SVG. */
(() => {
  'use strict';
  const base=new URL('partners/',document.currentScript.src);
  const files={"gogo-zh":"gogo-zh.svg?v=7c44fbf1a5","tea-en":"tea-en.svg?v=f3e51182f6","gogo-en":"gogo-en.svg?v=735e0ff41d","tea-zh":"tea-zh.svg?v=668ccd00b6"};
  const labels={tea:{zh:'网易雷火 · 校企合作项目',en:'NetEase ThunderFire · University–industry project'},gogo:{zh:'云深处 × Rokid · 校企合作项目',en:'DEEP Robotics × Rokid · University–industry project'}};
  let disposed=false;
  const states=[...document.querySelectorAll('[data-partner-sign]')].map(mount=>{
    const image=document.createElement('img');image.className='project-partner-art';image.alt='';image.setAttribute('aria-hidden','true');image.decoding='async';
    const state={mount,image,fallback:mount.querySelector('.project-partner-fallback'),path:''};
    image.addEventListener('load',()=>{if(!disposed&&image.complete&&image.naturalWidth>0&&image.getAttribute('src')===state.path)mount.dataset.ready='true';});
    image.addEventListener('error',()=>{mount.dataset.ready='false';});
    mount.appendChild(image);return state;
  });
  function apply(){
    if(disposed)return;
    const language=document.documentElement.lang.startsWith('en')?'en':'zh';
    for(const state of states){
      const kind=state.mount.dataset.partnerSign,label=labels[kind]?.[language],file=files[kind+'-'+language];if(!file||!label)continue;
      const path=new URL(file,base).href;
      state.mount.setAttribute('aria-label',label);state.fallback.textContent=label;
      if(state.path===path)continue;
      state.mount.dataset.ready='false';state.path=path;state.image.src=path;
    }
  }
  addEventListener('portfolio:language',apply);
  window.PortfolioLifecycle?.onDispose(()=>{disposed=true;removeEventListener('portfolio:language',apply);});
  apply();
})();
