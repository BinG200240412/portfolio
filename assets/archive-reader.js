/* Page images are the reader. The original PDF is touched only by its download link. */
(() => {
  'use strict';
  const ID='archive-viewer',MAX_PAGES=300,LOAD_TIMEOUT=15000;
  const FAN_ROWS=['.............##.....','....##.....######...','..#####....######...','..#####...########..','.#######..########..','.#######.########...','..######.######.....','..##########........','....##########......','......##########....','........##########..','.....######.######..','...########.#######.','..########..#######.','..########...#####..','...######....#####..','...######.....##....','.....##.............'];
  let catalog=new Map(),dialog,stage,slot,image,feedback,loadingFan,retry,title,counter,previous,next,download;
  let active=null,opener=null,loadTimer=0,generation=0,destroyed=false,initialised=false,removeDispose=()=>{};
  const english=()=>window.PortfolioI18n?.language==='en'||document.documentElement.lang.startsWith('en');
  const copy=()=>english()?{
    document:'Portfolio document',previous:'Previous page',next:'Next page',download:'Download original PDF',loading:'Loading…',error:'This page could not load.',unavailable:'This document is unavailable.',retry:'Retry',page:(page,total)=>`Page ${page} of ${total}`,
  }:{document:'作品集',previous:'上一页',next:'下一页',download:'下载原 PDF',loading:'正在载入…',error:'这一页暂时未能载入。',unavailable:'这份作品暂时无法打开。',retry:'重试',page:(page,total)=>`第 ${page} 页，共 ${total} 页`};
  function resource(value,extension){
    if(typeof value!=='string'||value.length>2048)return null;
    try{
      const url=new URL(value,document.baseURI);
      return /^https?:$/.test(url.protocol)&&url.origin===location.origin&&!url.username&&!url.password&&!url.hash&&url.pathname.toLowerCase().endsWith(extension)?url.href:null;
    }catch(_){return null;}
  }
  function readCatalog(){
    const result=new Map();
    try{
      const source=document.getElementById('archive-catalog');if(!source||source.textContent.length>600000)return result;
      const data=JSON.parse(source.textContent);if(!Array.isArray(data?.documents)||data.documents.length>32)return result;
      for(const item of data.documents){
        if(!item||typeof item.id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(item.id)||result.has(item.id))continue;
        const pdf=resource(item.pdf,'.pdf');if(!pdf||!Array.isArray(item.pages)||!item.pages.length||item.pages.length>MAX_PAGES)continue;
        const pages=item.pages.map(page=>{
          if(!page||!Number.isInteger(page.width)||!Number.isInteger(page.height)||page.width<16||page.width>8000||page.height<16||page.height>32768)return null;
          const src=resource(page.src,'.webp');return src?{src,width:page.width,height:page.height}:null;
        });
        if(pages.some(page=>!page))continue;
        const labels={};for(const language of ['zh','en'])if(typeof item.title?.[language]==='string'&&item.title[language].trim())labels[language]=item.title[language].trim().slice(0,160);
        result.set(item.id,{id:item.id,pdf,pages,title:labels});
      }
    }catch(_){}
    return result;
  }
  function documentTitle(){return active?.document?.title[english()?'en':'zh']||active?.document?.title.zh||active?.document?.title.en||copy().document;}
  function language(){
    if(!dialog)return;
    const t=copy(),documentName=documentTitle(),total=active?.document?.pages.length||0,page=total?(active.index+1):0;
    title.textContent=documentName;dialog.setAttribute('aria-label',documentName);stage.setAttribute('aria-label',documentName);
    previous.setAttribute('aria-label',t.previous);next.setAttribute('aria-label',t.next);download.setAttribute('aria-label',t.download);download.title=t.download;retry.textContent=t.retry;
    counter.textContent=total?`${page} / ${total}`:'';counter.setAttribute('aria-label',t.page(page,total));
    if(image)image.alt=`${documentName} — ${t.page(page,total)}`;
    const state=dialog.dataset.state;feedback.querySelector('p').textContent=state==='loading'?t.loading:state==='error'?t.error:state==='unavailable'?t.unavailable:'';
  }
  function state(value){
    dialog.dataset.state=value;stage.setAttribute('aria-busy',String(value==='loading'));feedback.hidden=!['loading','error','unavailable'].includes(value);feedback.dataset.loadingState=value==='loading'?'loading':'error';loadingFan.toggleAttribute('hidden',value!=='loading');retry.hidden=value!=='error';language();
  }
  function makeLoadingFan(){
    const ns='http://www.w3.org/2000/svg',fan=document.createElementNS(ns,'svg');
    fan.setAttribute('viewBox','0 0 40 40');fan.setAttribute('class','archive-reader-loader pixel-loader__fan');fan.setAttribute('aria-hidden','true');
    FAN_ROWS.forEach((row,y)=>[...row].forEach((bead,x)=>{
      if(bead!=='#')return;
      const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',1+x*2);dot.setAttribute('cy',3+y*2);dot.setAttribute('r','.65');fan.appendChild(dot);
    }));
    return fan;
  }
  function releasePage(){
    generation++;clearTimeout(loadTimer);loadTimer=0;
    if(image){image.onload=null;image.onerror=null;image.removeAttribute('src');image.remove();image=null;}
    slot?.replaceChildren();if(stage){stage.scrollTop=0;stage.scrollLeft=0;}
  }
  function finish({restoreFocus=true}={}){
    const trigger=opener;opener=null;releasePage();active=null;
    document.documentElement.classList.remove('archive-reader-open');
    if(dialog){download.removeAttribute('href');download.hidden=true;previous.disabled=true;next.disabled=true;state('idle');}
    if(restoreFocus&&trigger?.isConnected&&!trigger.closest('[inert]'))trigger.focus({preventScroll:true});
  }
  function close(options={}){if(dialog?.open)dialog.close();finish(options);}
  function makeDialog(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id=ID;dialog.className='media-viewer archive-reader';dialog.tabIndex=-1;
    dialog.setAttribute('data-i18n-ignore','');dialog.setAttribute('data-media-corners-ignore','');dialog.setAttribute('aria-labelledby','archive-reader-title');
    dialog.innerHTML=`<header class="archive-reader-bar"><h2 class="archive-reader-title" id="archive-reader-title"></h2><a class="archive-reader-download" data-archive-pdf-download download><span>PDF</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></svg></a></header>
      <div class="archive-reader-stage" tabindex="0" role="region" data-media-corners-ignore><div class="archive-reader-paper" data-media-corners-ignore></div><div class="archive-reader-feedback pixel-loader" role="status" hidden><p class="pixel-loader__label"></p><button type="button" hidden></button></div></div>
      <nav class="archive-reader-navigation"><button class="archive-reader-previous" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg></button><output class="archive-reader-counter" aria-live="polite"></output><button class="archive-reader-next" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button></nav>`;
    title=dialog.querySelector('.archive-reader-title');stage=dialog.querySelector('.archive-reader-stage');slot=dialog.querySelector('.archive-reader-paper');feedback=dialog.querySelector('.archive-reader-feedback');retry=feedback.querySelector('button');
    loadingFan=makeLoadingFan();feedback.prepend(loadingFan);
    previous=dialog.querySelector('.archive-reader-previous');next=dialog.querySelector('.archive-reader-next');counter=dialog.querySelector('.archive-reader-counter');download=dialog.querySelector('[data-archive-pdf-download]');
    previous.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));retry.addEventListener('click',()=>{if(active?.document)showPage(active.index);});
    dialog.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();turn(event.key==='ArrowRight'?1:-1);}
      // Escape retains the native dialog cancel/close path.
    });
    dialog.addEventListener('close',()=>{if(dialog&&!dialog.open)finish();});
    document.body.appendChild(dialog);state('idle');
  }
  function showPage(index){
    if(!active?.document||index<0||index>=active.document.pages.length)return;
    releasePage();active.index=index;const page=active.document.pages[index],token=generation;
    previous.disabled=index===0;next.disabled=index===active.document.pages.length-1;state('loading');
    const current=document.createElement('img');image=current;current.className='archive-reader-image';current.decoding='async';current.loading='eager';current.draggable=false;
    current.setAttribute('data-media-corners-ignore','');current.width=page.width;current.height=page.height;current.style.setProperty('--archive-page-width',`${page.width}px`);
    const failed=()=>{
      if(token!==generation||!dialog.open||image!==current)return;
      clearTimeout(loadTimer);loadTimer=0;current.onload=null;current.onerror=null;current.removeAttribute('src');current.hidden=true;state('error');
    };
    current.onload=()=>{if(token!==generation||!dialog.open||image!==current)return;clearTimeout(loadTimer);loadTimer=0;state('ready');};current.onerror=failed;
    slot.replaceChildren(current);language();loadTimer=setTimeout(failed,LOAD_TIMEOUT);current.src=page.src;
  }
  function turn(direction){if(active?.document)showPage(active.index+direction);}
  function open(trigger,id){
    if(destroyed)return;
    makeDialog();if(dialog.open)close({restoreFocus:false});
    opener=trigger;active={document:catalog.get(id)||null,index:0};
    previous.disabled=true;next.disabled=true;download.hidden=!active.document;
    if(active.document)download.href=active.document.pdf;else download.removeAttribute('href');
    document.documentElement.classList.add('archive-reader-open');
    try{dialog.showModal();}catch(_){finish();return;}
    if(active.document)showPage(0);else state('unavailable');
    dialog.focus({preventScroll:true});
    // Shared media-corners sees #archive-viewer[open] and owns the one upper-left return mark.
  }
  function activate(event){
    if(destroyed||event.button>0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const trigger=event.target instanceof Element?event.target.closest('[data-archive-open]'):null;
    if(!trigger||trigger.disabled)return;event.preventDefault();open(trigger,trigger.dataset.archiveOpen);
  }
  function pagehide(event){if(event.persisted)close({restoreFocus:false});else dispose();}
  function pageshow(){if(!destroyed)language();}
  function dispose(){
    if(destroyed)return;destroyed=true;close({restoreFocus:false});dialog?.remove();dialog=null;
    document.removeEventListener('click',activate);document.removeEventListener('DOMContentLoaded',init);
    removeEventListener('portfolio:language',language);removeEventListener('pagehide',pagehide);removeEventListener('pageshow',pageshow);removeDispose();catalog.clear();
  }
  function init(){
    if(initialised||destroyed)return;initialised=true;catalog=readCatalog();
    document.querySelectorAll('[data-archive-open]').forEach(trigger=>{trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',ID);});
    document.addEventListener('click',activate);addEventListener('portfolio:language',language);addEventListener('pagehide',pagehide);addEventListener('pageshow',pageshow);
    removeDispose=window.PortfolioLifecycle?.onDispose(dispose)||(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
