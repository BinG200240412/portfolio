/* Reconstruct the proposal's branches with native nodes and fixed signal beads. */
(() => {
  'use strict';
  const root=document.getElementById('experience-workflow');
  if(!root)return;
  const board=root.querySelector('.gw-board'),wires=root.querySelector('.gw-wires');
  const status=root.querySelector('.gw-status'),buttons=[...root.querySelectorAll('[data-play]')];
  const ns='http://www.w3.org/2000/svg';
  const edges=[['arrive','begin'],['arrive','pass'],['begin','incidental'],['begin','landmark'],['pass','incidental'],['pass','landmark'],['pass','station'],['incidental','sites'],['landmark','sites'],['station','sites'],['sites','play1',1],['sites','play2',2],['sites','play3',3],['play1','collect',1],['play2','collect',2],['play3','collect',3],['collect','ai-log'],['collect','journal'],['ai-log','share'],['journal','share']];
  let selected=1,visible=false,host=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const node=name=>board.querySelector(`[data-flow-node="${name}"]`);
  function element(tag,attrs){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
  function select(value,announce=false){
    selected=value;root.dataset.currentPlay=String(value);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.play)===value)));
    root.querySelectorAll('[data-profile]').forEach(p=>p.classList.toggle('is-selected',Number(p.dataset.profile)===value));
    wires.querySelectorAll('[data-route]').forEach(e=>e.classList.toggle('is-selected',!Number(e.dataset.route)||Number(e.dataset.route)===value));
    if(announce){const zh=document.documentElement.lang.startsWith('zh');status.textContent=zh?`已显示玩法${value}的原方案特征与流程路径。`:`Showing the original profile and flow for Play ${value}.`;}
  }
  function draw(){
    const box=board.getBoundingClientRect();if(!box.width)return;
    root.dataset.flowRows=innerWidth<=720?'5':'2';
    const fragment=document.createDocumentFragment();
    wires.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    for(const [from,to,route=0] of edges){
      const a=node(from),b=node(to),ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      const acx=ar.left+ar.width/2-box.left,acy=ar.top+ar.height/2-box.top;
      const bcx=br.left+br.width/2-box.left,bcy=br.top+br.height/2-box.top;
      const stageA=a.closest('[data-stage]').getBoundingClientRect(),stageB=b.closest('[data-stage]').getBoundingClientRect();
      const nextRow=stageB.top>=stageA.bottom-2;
      let p;
      if(from==='sites'){
        const right=innerWidth>720,bus=right?box.width+16:-16;
        const bx=right?br.right-box.left:br.left-box.left;
        if(right)p=[[ar.right-box.left,acy],[bus,acy],[bus,bcy],[bx,bcy]];
        else{
          const lane=(stageA.bottom+stageB.top)/2-box.top;
          p=[[acx,ar.bottom-box.top],[acx,lane],[bus,lane],[bus,bcy],[bx,bcy]];
        }
      }else if(nextRow){
        // The lower journal branch goes around the AI journal instead of through its artwork and caption.
        const lane=(stageA.bottom+stageB.top)/2-box.top;
        p=from==='begin'
          ?[[ar.right-box.left,acy],[box.width+12,acy],[box.width+12,lane],[bcx,lane],[bcx,br.top-box.top]]
          :to==='journal'
          ?[[acx,ar.bottom-box.top],[acx,lane],[box.width+12,lane],[box.width+12,bcy],[br.right-box.left,bcy]]
          :[[acx,ar.bottom-box.top],[acx,lane],[bcx,lane],[bcx,br.top-box.top]];
      }else{
        const forward=bcx>acx,ax=forward?ar.right-box.left:ar.left-box.left,bx=forward?br.left-box.left:br.right-box.left;
        const elbow=forward?(stageA.right+stageB.left)/2-box.left:(stageA.left+stageB.right)/2-box.left;
        p=[[ax,acy],[elbow,acy],[elbow,bcy],[bx,bcy]];
      }
      fragment.append(element('path',{d:p.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' '),class:'gw-edge','data-route':route,'data-from':from,'data-to':to}));
      const [tipX,tipY]=p[p.length-1],[prevX,prevY]=p[p.length-2];
      const theta=Math.atan2(tipY-prevY,tipX-prevX),ux=Math.cos(theta),uy=Math.sin(theta),nx=-uy,ny=ux;
      fragment.append(element('path',{d:`M${tipX-ux*7+nx*3} ${tipY-uy*7+ny*3}L${tipX-ux} ${tipY-uy}L${tipX-ux*7-nx*3} ${tipY-uy*7-ny*3}Z`,class:'gw-flow-arrow','data-route':route}));
      let order=0;
      for(let i=1;i<p.length;i++){
        const [x,y]=p[i-1],[ex,ey]=p[i],length=Math.hypot(ex-x,ey-y),steps=Math.floor(length/14);
        for(let j=1;j<=steps;j++){
          const f=j/(steps+1);const bead=element('circle',{cx:(x+(ex-x)*f).toFixed(2),cy:(y+(ey-y)*f).toFixed(2),r:1.7,class:'gw-bead','data-route':route});
          bead.style.setProperty('--bead-order',String(order++));fragment.append(bead);
        }
      }
    }
    wires.replaceChildren(fragment);select(selected);
  }
  function sync(){root.classList.toggle('is-workflow-active',visible&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on')));}
  buttons.forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.play),true)));
  new ResizeObserver(draw).observe(board);
  root.querySelectorAll('img').forEach(img=>img.addEventListener('load',draw));
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.01}).observe(root);
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio:language',()=>{requestAnimationFrame(draw);if(status.textContent)select(selected,true);});
  document.fonts.ready.then(draw);draw();sync();
})();
