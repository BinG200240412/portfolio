/* Native workflow: connected grid beads grow through opacity, never by moving. */
(() => {
  'use strict';
  const root=document.getElementById('experience-workflow');
  if(!root)return;
  const board=root.querySelector('.gw-board'),wires=root.querySelector('.gw-wires');
  const columns=[...board.querySelectorAll('[data-stage]')],ns='http://www.w3.org/2000/svg',pitch=6;
  const edges=[['arrive','begin'],['arrive','pass'],['begin','incidental'],['begin','landmark'],['pass','incidental'],['pass','landmark'],['pass','station'],['incidental','sites'],['landmark','sites'],['station','sites'],['sites','play1'],['sites','play2'],['sites','play3'],['play1','collect'],['play2','collect'],['play3','collect'],['collect','ai-log'],['collect','journal'],['ai-log','share'],['journal','share']];
  const revealed=new Set(),stageDelays=new Map();
  let visible=false,enteredAt=0,host=null;
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const node=name=>board.querySelector(`[data-flow-node="${name}"]`);
  const snap=value=>Math.round(value/pitch)*pitch;
  const element=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
  function reveal(stage){
    if(!revealed.has(stage)){
      revealed.add(stage);
      const elapsed=performance.now()-enteredAt;
      stageDelays.set(stage,innerWidth<1200?0:Math.max(0,(Number(stage)-1)*.6-elapsed/1000));
    }
    const group=wires.querySelector(`.gw-stage[data-stage="${stage}"]`);
    if(group){group.style.setProperty('--gw-stage-delay',`${stageDelays.get(stage)}s`);group.classList.add('is-grown');}
  }
  function draw(){
    const box=board.getBoundingClientRect();if(!box.width)return;
    const narrow=innerWidth<1200,pad=12,busRight=box.width+(narrow?12:24),busLeft=-18;
    root.dataset.flowRows=narrow?'5':'2';root.dataset.flowAnimation='fixed-grid-growth';
    const groups=new Map(),points=new Map(),fragment=document.createDocumentFragment();
    const groupFor=stage=>{
      if(!groups.has(stage)){
        const g=element('g',{class:'gw-stage','data-stage':stage});
        groups.set(stage,g);points.set(stage,new Map());fragment.append(g);
      }
      return groups.get(stage);
    };
    function dot(stage,x,y,delay,arrow=false){
      const px=snap(x),py=snap(y),key=`${px},${py}`,pool=points.get(stage),old=pool.get(key);
      if(old){old.delay=Math.min(old.delay,delay);old.arrow||=arrow;return;}
      pool.set(key,{x:px,y:py,delay,arrow});
    }
    wires.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    for(const [from,to] of edges){
      const a=node(from),b=node(to),ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      const acx=ar.left+ar.width/2-box.left,acy=ar.top+ar.height/2-box.top;
      const bcx=br.left+br.width/2-box.left,bcy=br.top+br.height/2-box.top;
      const parentA=a.closest('[data-stage]'),parentB=b.closest('[data-stage]');
      const stageA=parentA.getBoundingClientRect(),stageB=parentB.getBoundingClientRect(),stage=parentB.dataset.stage;
      const nextRow=stageB.top>=stageA.bottom-2;
      let p,head;
      if(from==='sites'){
        if(!narrow){
          const bx=br.right-box.left+pad;
          p=[[ar.right-box.left+pad,acy],[busRight,acy],[busRight,bcy],[bx,bcy]];
          head=[(busRight+bx)/2,bcy,-1,0];
        }else{
          const gutter=stageB.top-stageA.bottom,lane=stageA.bottom+gutter*.25-box.top;
          p=[[acx,ar.bottom-box.top+pad],[acx,lane],[busLeft,lane],[busLeft,bcy],[br.left-box.left-pad,bcy]];
          // Keep heads on the individual horizontal branches, away from the shared trunk.
          head=[Math.max(busLeft+pitch*2,(busLeft+br.left-box.left-pad)/2),bcy,1,0];
        }
      }else if(nextRow){
        const gutter=stageB.top-stageA.bottom,lane=stageA.bottom+gutter*.25-box.top;
        if(from==='begin'){
          p=[[ar.right-box.left+pad,acy],[busRight,acy],[busRight,lane],[bcx,lane],[bcx,br.top-box.top-pad]];
          head=[bcx,stageA.bottom+gutter*.6-box.top,0,1];
        }else if(to==='journal'){
          const previous=b.previousElementSibling.getBoundingClientRect(),leftColumn=board.querySelector('[data-stage="7"]').getBoundingClientRect();
          const innerBus=(leftColumn.right+stageB.left)/2-box.left;
          p=[[acx,ar.bottom-box.top+pad],[acx,lane],[innerBus,lane],[innerBus,bcy],[br.left-box.left-pad,bcy]];
          head=[innerBus,(previous.bottom+br.top)/2-box.top,0,1];
        }else{
          p=[[acx,ar.bottom-box.top+pad],[acx,lane],[bcx,lane],[bcx,br.top-box.top-pad]];
          head=[bcx,stageA.bottom+gutter*.6-box.top,0,1];
        }
      }else{
        const forward=bcx>acx,sign=forward?1:-1;
        const ax=(forward?ar.right:ar.left)-box.left+sign*pad,bx=(forward?br.left:br.right)-box.left-sign*pad;
        const gutter=forward?stageB.left-stageA.right:stageA.left-stageB.right;
        const start=(forward?stageA.right:stageA.left)-box.left;
        const elbow=start+sign*Math.max(pad,gutter*.22);
        p=[[ax,acy],[elbow,acy],[elbow,bcy],[bx,bcy]];
        head=[start+sign*gutter*.55,bcy,sign,0];
      }
      p=p.map(([x,y])=>[snap(x),snap(y)]);
      const group=groupFor(stage),[rawX,rawY,ux,uy]=head,hx=snap(rawX),hy=snap(rawY),nx=-uy,ny=ux;
      // End the visible tail at the apex: no connector may continue in front of it.
      let segment=1,best=Infinity;
      for(let i=1;i<p.length;i++){
        const [x,y]=p[i-1],[ex,ey]=p[i],squared=(ex-x)**2+(ey-y)**2;
        const t=squared?Math.max(0,Math.min(1,((hx-x)*(ex-x)+(hy-y)*(ey-y))/squared)):0;
        const d=Math.hypot(hx-x-(ex-x)*t,hy-y-(ey-y)*t);
        if(d<best){best=d;segment=i;}
      }
      const tip=[hx+ux*pitch,hy+uy*pitch];
      p=[...p.slice(0,segment),[hx,hy],tip];
      const lengths=p.slice(1).map(([x,y],i)=>Math.hypot(x-p[i][0],y-p[i][1]));
      const total=lengths.reduce((sum,n)=>sum+n,0)||1;
      group.append(element('path',{d:p.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' '),class:'gw-edge','data-from':from,'data-to':to,'data-tip-x':tip[0],'data-tip-y':tip[1],'data-direction-x':ux,'data-direction-y':uy}));
      let travelled=0;
      for(let i=1;i<p.length;i++){
        const [x,y]=p[i-1],[ex,ey]=p[i],length=lengths[i-1],steps=Math.round(length/pitch);
        for(let j=0;j<=steps;j++){
          const f=steps?j/steps:0;dot(stage,x+(ex-x)*f,y+(ey-y)*f,(travelled+length*f)/total*.85);
        }
        travelled+=length;
      }
      const delay=Math.max(0,total-pitch)/total*.85;
      for(let offset=narrow?-12:-18;offset<=6;offset+=pitch)dot(stage,hx+ux*offset,hy+uy*offset,delay,true);
      for(let i=0;i<=2;i++)for(const side of [-1,1])dot(stage,hx+ux*(6-i*pitch)+nx*i*pitch*side,hy+uy*(6-i*pitch)+ny*i*pitch*side,delay,true);
    }
    for(const [stage,pool] of points){
      const group=groups.get(stage);
      for(const p of pool.values()){
        const bead=element('circle',{cx:p.x,cy:p.y,r:p.arrow?1.8:1.5,class:p.arrow?'gw-dot gw-arrow-dot':'gw-dot'});
        bead.style.setProperty('--gw-point-delay',`${p.delay.toFixed(3)}s`);group.append(bead);
      }
    }
    wires.replaceChildren(fragment);revealed.forEach(reveal);
  }
  function sync(){root.classList.toggle('is-workflow-active',visible&&!document.hidden&&!document.querySelector('dialog[open]')&&(!host||host.classList.contains('on')));}
  new ResizeObserver(draw).observe(board);
  root.querySelectorAll('img').forEach(img=>img.addEventListener('load',draw));
  new IntersectionObserver(entries=>{
    const entering=entries[0].isIntersecting;
    if(entering&&!visible)enteredAt=performance.now();visible=entering;
    if(!visible){revealed.clear();stageDelays.clear();wires.querySelectorAll('.is-grown').forEach(g=>g.classList.remove('is-grown'));}
    else columns.filter(c=>{const r=c.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).forEach(c=>reveal(c.dataset.stage));
    sync();
  },{threshold:.01}).observe(root);
  const stageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target.dataset.stage);}),{threshold:.08});
  columns.forEach(c=>stageObserver.observe(c));
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio:language',()=>requestAnimationFrame(draw));
  document.fonts.ready.then(draw);draw();sync();
})();
