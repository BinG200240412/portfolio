/* Retained section links can reveal the supplementary concept without changing scrolling. */
(() => {
  'use strict';
  function revealLinkedPlan(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
    const target=document.getElementById(id);if(!target)return;
    let parent=target.parentElement,changed=false;
    while(parent){if(parent.tagName==='DETAILS'&&!parent.open){parent.open=true;changed=true;}parent=parent.parentElement;}
    if(changed)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  addEventListener('hashchange',revealLinkedPlan);
  document.addEventListener('DOMContentLoaded',revealLinkedPlan);
})();
