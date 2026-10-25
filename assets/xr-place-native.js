/* Original PDF circles become real SVG cells. Only their light changes;
 * the four player rows are source combinations, not inferred GPS tracks. */
(() => {
  'use strict';
  const page=document.getElementById('experience-places');if(!page)return;
  const root=page.querySelector('.gogo-native-place'),svg=root.querySelector('.gogo-place-svg'),cellsLayer=svg.querySelector('.gogo-place-cells'),linesLayer=svg.querySelector('.gogo-place-connections');
  const legends=[...root.querySelectorAll('.gogo-place-legend button')],players=[...root.querySelectorAll('.gogo-player-sequence')];
  const playback=root.querySelector('.gogo-place-playback'),toggle=playback.querySelector('button'),now=playback.querySelector('.gogo-place-now'),status=page.querySelector('.gogo-place-status');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)'),compact=matchMedia('(max-width:900px)'),dialog=document.getElementById('gogo-lightbox');
  const sourceURL=new URL('works/xr/experience/place-dots.json?v=native-experience-20261025',document.currentScript.src),NS='http://www.w3.org/2000/svg';
  const labels={zh:['','河边','高台','草地','林地','服务点'],en:['','Riverside','Platform','Grassland','Woodland','Services']};
  let data=null,loading=false,onScreen=false,shown=true,host=null,introduced=false,mode='all',type=0,player=-1,step=0,elapsed=0,playing=false,frame=0,previous=0;
  let cells=[],paths=[],sequences=[],lineAnimations=new Map();
  try{host=window.frameElement?.closest('#section')||null;}catch(_){}
  const english=()=>document.documentElement.lang.startsWith('en'),words=()=>labels[english()?'en':'zh'];
  const still=()=>reduced.matches||forced.matches;
  const active=()=>onScreen&&shown&&!document.hidden&&!dialog?.open&&(!host||host.classList.contains('on'));
  function element(name,attributes){const e=document.createElementNS(NS,name);Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,v));return e;}
  function connectionPaths(mobile){
    // Same source origins and gentle outward flow, with a vertical legend on phones.
    const starts=[[360,80],[300,300],[460,240],[360,420],[520,260]];
    return starts.map(([x,y],i)=>mobile
      ? `M${x} ${y} C${590+i*2} ${y},${600-i*5} 515,${[60,180,300,420,540][i]} 590`
      : `M${x} ${y} C${Math.max(590,x+80)} ${y},600 ${[50,145,240,335,430][i]},800 ${[50,145,240,335,430][i]}`);
  }
  function finishLines(){lineAnimations.forEach((a,path)=>{a.cancel();path.style.strokeDashoffset='0';});lineAnimations.clear();}
  function layout(){
    finishLines();svg.setAttribute('viewBox',compact.matches?'0 0 600 610':'0 0 1000 540');
    connectionPaths(compact.matches).forEach((d,i)=>paths[i]?.setAttribute('d',d));
  }
  function drawLines(which=0){
    finishLines();if(still()||!active())return;
    paths.forEach((path,i)=>{
      if(which&&i+1!==which)return;
      const a=path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:1050,delay:which?0:i*130,easing:'cubic-bezier(.22,.65,.3,1)',fill:'both'});
      lineAnimations.set(path,a);a.finished.then(()=>{if(lineAnimations.get(path)===a){path.style.strokeDashoffset='0';lineAnimations.delete(path);a.cancel();updateMotion();}}).catch(()=>{});
    });updateMotion();
  }
  function currentType(){return mode==='player'?(still()?0:data.players[player][step]):type;}
  function render(){
    if(!data)return;const selected=currentType();
    cellsLayer.classList.toggle('is-filtered',selected>0);linesLayer.classList.toggle('is-filtered',selected>0);
    cells.forEach((cell,i)=>cell.classList.toggle('is-current',data.cells[i][2]===selected));
    paths.forEach((path,i)=>path.classList.toggle('is-current',i+1===selected));
    legends.forEach((button,i)=>{button.classList.toggle('is-current',i+1===selected);button.setAttribute('aria-pressed',String(mode==='site'&&i+1===type));});
    players.forEach((button,i)=>button.setAttribute('aria-pressed',String(mode==='player'&&i===player)));
    sequences.forEach((row,index)=>row.forEach((cell,i)=>{cell.classList.toggle('is-step',mode==='player'&&index===player&&i===step&&!still());cell.classList.toggle('is-played',mode==='player'&&index===player&&i<=step&&!still());}));
    playback.hidden=mode!=='player'||still();now.dataset.placeType=String(selected);now.textContent=selected?words()[selected]:(english()?'Along the route':'游览途中');
    toggle.textContent=playing?(english()?'Pause sequence':'暂停组合'):elapsed>=data.players[player]?.length*.65?(english()?'Replay sequence':'重播组合'):(english()?'Resume sequence':'继续组合');
    page.dataset.placeSelection=mode==='player'?'player-'+(player+1):mode==='site'?'site-'+type:'all';page.dataset.placeStep=String(step);
  }
  function language(){
    legends.forEach((button,i)=>button.querySelector('span').textContent=words()[i+1]);
    svg.setAttribute('aria-label',english()?'Original site dot mosaic: riverside, platforms, grassland, woodland and services':'原方案场所点阵：河边、高台、草地、林地与服务点');render();
  }
  function updateMotion(){page.dataset.placeMotion=!active()?'paused':playing&&!still()||lineAnimations.size?'running':'idle';}
  function tick(time){
    frame=0;if(!active()||!playing||still()){previous=0;updateMotion();return;}
    if(previous)elapsed+=Math.min(.1,(time-previous)/1000);previous=time;
    const next=Math.min(15,Math.floor(elapsed/.65));if(next!==step){step=next;render();}
    if(elapsed>=data.players[player].length*.65){playing=false;previous=0;render();updateMotion();return;}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;previous=0;
    if(still()){finishLines();playing=false;render();}
    lineAnimations.forEach(a=>{if(!active()&&a.playState==='running')a.pause();else if(active()&&a.playState==='paused')a.play();});
    if(active()){
      if(!data){load();return;}
      if(!introduced){introduced=true;drawLines();}
      if(playing&&!still())frame=requestAnimationFrame(tick);
    }updateMotion();
  }
  function build(result){
    data=result;cells=data.cells.map(([col,row,role])=>element('circle',{cx:40+col*20,cy:20+row*20,r:6.5,'data-place-type':role}));cellsLayer.replaceChildren(...cells);
    paths=Array.from({length:5},(_,i)=>element('path',{'data-place-type':i+1,pathLength:1}));linesLayer.replaceChildren(...paths);
    sequences=data.players.map((row,index)=>{
      const dots=row.map((role,i)=>element('circle',{cx:10+i*20,cy:12,r:6.5,'data-place-type':role}));players[index].querySelector('svg').replaceChildren(...dots);return dots;
    });
    layout();language();page.dataset.nativePlace='ready';page.dataset.placeCells=String(cells.length);sync();
  }
  function load(){
    if(data||loading)return;loading=true;fetch(sourceURL).then(r=>{if(!r.ok)throw Error('Place source unavailable');return r.json();}).then(build).catch(()=>{page.dataset.nativePlace='unavailable';}).finally(()=>{loading=false;});
  }
  legends.forEach((button,index)=>button.addEventListener('click',()=>{
    if(!data){load();return;}playing=false;mode=mode==='site'&&type===index+1?'all':'site';type=mode==='site'?index+1:0;render();drawLines(type);sync();
    status.textContent=type?(english()?'Selected '+words()[type]:'已选择'+words()[type]):(english()?'All places shown':'已显示全部场所');
  }));
  players.forEach((button,index)=>button.addEventListener('click',()=>{
    if(!data){load();return;}mode='player';player=index;step=0;elapsed=0;playing=!still();finishLines();render();sync();
    status.textContent=english()?'Showing Player '+(index+1)+'’s site sequence':'正在演示游客'+(index+1)+'的点位组合';
  }));
  toggle.addEventListener('click',()=>{if(elapsed>=data.players[player].length*.65){elapsed=0;step=0;}playing=!playing;render();sync();});
  page.addEventListener('keydown',event=>{if(event.key==='Escape'){mode='all';type=0;playing=false;finishLines();render();sync();}});
  new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:.01}).observe(root);
  compact.addEventListener('change',()=>{if(data)layout();});reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  new MutationObserver(language).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});if(host)new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});language();
})();
