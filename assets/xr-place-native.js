/* Original PDF circles become real SVG cells. Only their light changes;
 * the four player rows are source combinations, not inferred GPS tracks. */
(() => {
  'use strict';
  const page=document.getElementById('experience-places');if(!page)return;
  const root=page.querySelector('.gogo-native-place'),svg=root.querySelector('.gogo-place-svg'),cellsLayer=svg.querySelector('.gogo-place-cells'),linesLayer=svg.querySelector('.gogo-place-connections');
  const legends=[...root.querySelectorAll('.gogo-place-legend button')],players=[...root.querySelectorAll('.gogo-player-sequence')];
  const playback=root.querySelector('.gogo-place-playback'),toggle=playback.querySelector('button'),now=playback.querySelector('.gogo-place-now'),status=page.querySelector('.gogo-place-status');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)'),compact=matchMedia('(max-width:900px)'),dialog=document.getElementById('gogo-lightbox');
  const NS='http://www.w3.org/2000/svg';
  // BEGIN GENERATED PLACE DATA
  // Original source SHA256: bfb2dd05ca1c38653cf9b3e9d574d6c4d073f50ae2e0bd58921c6503dc665170
  const PLACE_DATA={"source":{"file":"gogo.pdf","page":1,"comparison_clip":[606,4840,1530,5620],"method":"Original PDF circle coordinates and fills, quantized to its regular lattice."},"columns":27,"rows":24,"categories":["neutral","riverside","platform","grassland","woodland","service"],"source_palette":[[95,95,95],[131,176,196],[144,142,108],[212,235,221],[129,181,151],[255,157,157]],"cells":[[17,0,0],[18,0,0],[19,0,0],[20,0,0],[8,1,0],[9,1,5],[10,1,0],[14,1,0],[15,1,0],[16,1,1],[17,1,0],[18,1,0],[19,1,0],[20,1,3],[21,1,3],[7,2,0],[8,2,0],[9,2,0],[10,2,0],[11,2,0],[12,2,0],[13,2,0],[14,2,0],[15,2,0],[16,2,1],[17,2,0],[18,2,0],[19,2,0],[20,2,0],[21,2,4],[7,3,0],[8,3,3],[9,3,4],[10,3,3],[11,3,0],[12,3,0],[13,3,0],[14,3,0],[15,3,0],[16,3,1],[17,3,0],[18,3,0],[19,3,0],[20,3,5],[21,3,4],[4,4,0],[5,4,0],[6,4,0],[7,4,0],[8,4,0],[9,4,0],[10,4,0],[11,4,0],[12,4,0],[13,4,3],[14,4,3],[15,4,0],[16,4,0],[17,4,0],[18,4,0],[19,4,0],[20,4,0],[21,4,3],[1,5,0],[2,5,0],[3,5,0],[4,5,0],[5,5,0],[6,5,3],[7,5,2],[8,5,2],[9,5,0],[10,5,0],[11,5,0],[12,5,0],[13,5,3],[14,5,3],[15,5,0],[16,5,0],[17,5,0],[18,5,0],[19,5,0],[20,5,0],[21,5,0],[0,6,0],[1,6,0],[2,6,5],[3,6,0],[4,6,3],[5,6,3],[6,6,3],[7,6,2],[8,6,2],[9,6,0],[10,6,0],[11,6,0],[12,6,0],[13,6,0],[14,6,0],[15,6,0],[16,6,0],[17,6,0],[18,6,0],[19,6,0],[20,6,0],[21,6,0],[1,7,0],[2,7,0],[3,7,0],[4,7,3],[5,7,3],[6,7,0],[7,7,0],[8,7,0],[9,7,0],[10,7,0],[11,7,2],[12,7,2],[13,7,2],[14,7,2],[15,7,0],[16,7,0],[17,7,0],[18,7,0],[19,7,0],[20,7,0],[21,7,0],[3,8,0],[4,8,3],[5,8,3],[6,8,0],[7,8,0],[8,8,0],[9,8,0],[10,8,0],[11,8,2],[12,8,2],[13,8,2],[14,8,2],[15,8,0],[16,8,3],[17,8,0],[18,8,0],[19,8,0],[20,8,0],[21,8,0],[3,9,0],[4,9,0],[5,9,0],[6,9,0],[7,9,0],[8,9,0],[9,9,0],[10,9,0],[11,9,0],[12,9,0],[13,9,0],[14,9,0],[15,9,0],[16,9,3],[17,9,3],[18,9,1],[19,9,0],[20,9,0],[21,9,3],[3,10,0],[4,10,0],[5,10,1],[6,10,1],[7,10,0],[8,10,0],[9,10,0],[10,10,0],[11,10,0],[12,10,0],[13,10,0],[14,10,0],[15,10,0],[16,10,3],[17,10,3],[18,10,1],[19,10,0],[20,10,0],[21,10,4],[3,11,0],[4,11,0],[5,11,1],[6,11,1],[7,11,0],[8,11,3],[9,11,3],[10,11,0],[11,11,0],[12,11,5],[13,11,0],[14,11,0],[15,11,0],[16,11,0],[17,11,3],[18,11,1],[19,11,0],[20,11,0],[21,11,3],[22,11,0],[23,11,0],[3,12,0],[4,12,0],[5,12,1],[6,12,0],[7,12,3],[8,12,4],[9,12,4],[10,12,0],[11,12,0],[12,12,0],[13,12,0],[14,12,0],[15,12,0],[16,12,0],[17,12,0],[18,12,2],[19,12,2],[20,12,2],[21,12,0],[22,12,0],[23,12,0],[24,12,5],[3,13,0],[4,13,0],[5,13,0],[6,13,0],[7,13,3],[8,13,3],[9,13,0],[10,13,0],[11,13,0],[12,13,0],[13,13,2],[14,13,0],[15,13,0],[16,13,0],[17,13,0],[18,13,2],[19,13,2],[20,13,0],[21,13,0],[22,13,0],[23,13,0],[24,13,0],[25,13,3],[26,13,3],[3,14,0],[4,14,2],[5,14,2],[6,14,0],[7,14,0],[8,14,0],[9,14,0],[10,14,0],[11,14,2],[12,14,2],[13,14,2],[14,14,0],[15,14,0],[16,14,0],[17,14,0],[18,14,0],[19,14,0],[20,14,0],[21,14,0],[22,14,0],[23,14,0],[24,14,0],[25,14,4],[26,14,3],[2,15,0],[3,15,0],[4,15,2],[5,15,2],[6,15,0],[7,15,1],[8,15,0],[9,15,0],[10,15,0],[11,15,0],[12,15,3],[13,15,3],[14,15,0],[15,15,0],[16,15,0],[17,15,0],[18,15,0],[19,15,0],[20,15,0],[21,15,0],[22,15,0],[23,15,0],[24,15,0],[2,16,0],[3,16,0],[4,16,0],[5,16,0],[6,16,0],[7,16,1],[8,16,0],[9,16,0],[10,16,0],[11,16,0],[12,16,3],[13,16,4],[14,16,0],[15,16,0],[16,16,0],[17,16,0],[18,16,0],[19,16,0],[20,16,0],[21,16,5],[22,16,0],[23,16,0],[24,16,0],[1,17,0],[2,17,0],[3,17,0],[4,17,3],[5,17,4],[6,17,3],[7,17,0],[8,17,0],[9,17,0],[10,17,0],[11,17,0],[12,17,0],[13,17,1],[14,17,1],[15,17,1],[16,17,0],[17,17,0],[18,17,0],[19,17,0],[20,17,0],[21,17,0],[1,18,0],[2,18,0],[3,18,0],[4,18,0],[5,18,0],[6,18,0],[7,18,0],[8,18,0],[9,18,0],[10,18,0],[11,18,0],[12,18,0],[13,18,1],[14,18,1],[15,18,2],[16,18,0],[17,18,0],[18,18,0],[19,18,0],[4,19,0],[5,19,0],[6,19,0],[7,19,0],[8,19,0],[9,19,0],[10,19,0],[11,19,5],[12,19,1],[13,19,1],[14,19,1],[15,19,0],[16,19,3],[4,20,3],[5,20,5],[6,20,0],[7,20,0],[8,20,0],[9,20,0],[10,20,0],[11,20,0],[12,20,0],[13,20,0],[14,20,0],[15,20,0],[16,20,4],[4,21,4],[5,21,0],[6,21,2],[7,21,2],[8,21,0],[9,21,0],[10,21,0],[11,21,3],[12,21,4],[13,21,4],[14,21,3],[15,21,0],[16,21,4],[4,22,3],[5,22,0],[6,22,2],[7,22,2],[8,22,0],[9,22,0],[10,22,0],[11,22,3],[12,22,4],[13,22,4],[14,22,3],[15,22,0],[16,22,3],[5,23,0],[6,23,0],[7,23,0]],"players":[[0,5,1,2,3,4,0,3,4,0,5,0,1,4,3,3],[0,0,3,3,0,1,0,2,5,0,3,4,4,3,0,0],[0,3,0,0,3,3,3,4,0,0,1,0,5,0,2,0],[0,1,1,0,5,0,2,0,3,4,4,0,0,0,1,0]]};
  // END GENERATED PLACE DATA
  const labels={zh:['','河边','高台','草地','林地','服务点'],en:['','Riverside','Platform','Grassland','Woodland','Services']};
  let data=null,onScreen=false,shown=true,host=null,introduced=false,mode='all',type=0,player=-1,step=0,elapsed=0,playing=false,frame=0,previous=0,arrivalStart=0;
  let cells=[],paths=[],sequences=[],lightGroups=[],lineAnimations=new Map(),lightAnimations=new Map();
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
  function finishLines(){lineAnimations.forEach(a=>a.cancel());lineAnimations.clear();paths.forEach(path=>{path.style.strokeDashoffset='0';});}
  function finishLights(){
    lightAnimations.forEach(a=>a.cancel());lightAnimations.clear();
    lightGroups.forEach(group=>{group.style.opacity='1';});
    page.dataset.placeArrival='ready';
  }
  function illuminate(){
    if(still()){finishLights();return;}
    arrivalStart=performance.now();page.dataset.placeArrival='flashing';
    lightGroups.forEach((group,i)=>{
      // Sixteen scattered groups light the original circles, rather than an
      // overlay or hundreds of independently scheduled animation objects.
      const a=group.animate([
        {opacity:0,offset:0},{opacity:.12,offset:.16},
        {opacity:.85,offset:.32},{opacity:.22,offset:.48},
        {opacity:1,offset:.72},{opacity:.65,offset:.85},{opacity:1,offset:1}
      ],{duration:380,delay:i*11,easing:'steps(1,end)',fill:'both'});
      lightAnimations.set(group,a);
      a.finished.then(()=>{
        if(lightAnimations.get(group)!==a)return;
        group.style.opacity='1';lightAnimations.delete(group);a.cancel();
        if(!lightAnimations.size){page.dataset.placeArrival='ready';page.dataset.placeRevealMs=String(Math.round(performance.now()-arrivalStart));}
        updateMotion();
      }).catch(()=>{});
    });
  }
  function layout(){
    finishLines();svg.setAttribute('viewBox',compact.matches?'0 0 600 610':'0 0 1000 540');
    connectionPaths(compact.matches).forEach((d,i)=>paths[i]?.setAttribute('d',d));
  }
  function drawLines(which=0,arrival=false){
    finishLines();if(still()||!active())return;
    paths.forEach((path,i)=>{
      if(which&&i+1!==which)return;
      const a=path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:arrival?420:1050,delay:which?0:i*(arrival?40:130),easing:'cubic-bezier(.22,.65,.3,1)',fill:'both'});
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
  function updateMotion(){page.dataset.placeMotion=!active()?'paused':playing&&!still()||lineAnimations.size||lightAnimations.size?'running':'idle';}
  function tick(time){
    frame=0;if(!active()||!playing||still()){previous=0;updateMotion();return;}
    if(previous)elapsed+=Math.min(.1,(time-previous)/1000);previous=time;
    const next=Math.min(15,Math.floor(elapsed/.65));if(next!==step){step=next;render();}
    if(elapsed>=data.players[player].length*.65){playing=false;previous=0;render();updateMotion();return;}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;previous=0;
    if(still()){finishLines();finishLights();playing=false;render();}
    for(const animations of [lineAnimations,lightAnimations])animations.forEach(a=>{if(!active()&&a.playState==='running')a.pause();else if(active()&&a.playState==='paused')a.play();});
    if(active()){
      if(!data)return;
      if(!introduced){introduced=true;illuminate();drawLines(0,true);}
      if(playing&&!still())frame=requestAnimationFrame(tick);
    }updateMotion();
  }
  function build(result){
    data=result;
    lightGroups=Array.from({length:16},(_,i)=>element('g',{'data-place-light-group':i}));
    lightGroups.forEach(group=>{group.style.opacity=still()?'1':'0';});
    cells=data.cells.map(([col,row,role])=>element('circle',{cx:40+col*20,cy:20+row*20,r:6.5,'data-place-type':role}));
    cells.forEach((cell,i)=>{const [col,row]=data.cells[i];lightGroups[(col*7+row*11)%16].append(cell);});cellsLayer.replaceChildren(...lightGroups);
    paths=Array.from({length:5},(_,i)=>element('path',{'data-place-type':i+1,pathLength:1}));linesLayer.replaceChildren(...paths);
    sequences=data.players.map((row,index)=>{
      const dots=row.map((role,i)=>element('circle',{cx:10+i*20,cy:12,r:6.5,'data-place-type':role}));players[index].querySelector('svg').replaceChildren(...dots);return dots;
    });
    layout();paths.forEach(path=>{path.style.strokeDashoffset=still()?'0':'1';});language();
    page.dataset.nativePlace='ready';page.dataset.placeCells=String(cells.length);page.dataset.placeArrival=still()?'ready':'waiting';sync();
  }
  legends.forEach((button,index)=>button.addEventListener('click',()=>{
    if(!data)return;introduced=true;finishLights();playing=false;mode=mode==='site'&&type===index+1?'all':'site';type=mode==='site'?index+1:0;render();drawLines(type);sync();
    status.textContent=type?(english()?'Selected '+words()[type]:'已选择'+words()[type]):(english()?'All places shown':'已显示全部场所');
  }));
  players.forEach((button,index)=>button.addEventListener('click',()=>{
    if(!data)return;introduced=true;finishLights();mode='player';player=index;step=0;elapsed=0;playing=!still();finishLines();render();sync();
    status.textContent=english()?'Showing Player '+(index+1)+'’s site sequence':'正在演示游客'+(index+1)+'的点位组合';
  }));
  toggle.addEventListener('click',()=>{if(elapsed>=data.players[player].length*.65){elapsed=0;step=0;}playing=!playing;render();sync();});
  page.addEventListener('keydown',event=>{if(event.key==='Escape'){mode='all';type=0;playing=false;finishLines();render();sync();}});
  new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;sync();},{threshold:.01}).observe(root);
  compact.addEventListener('change',()=>{if(data)layout();});reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  new MutationObserver(language).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if(host){const options={attributes:true,attributeFilter:['class']};if(window.PortfolioLifecycle?.observeParent)window.PortfolioLifecycle.observeParent(host,sync,options);else new MutationObserver(sync).observe(host,options);}
  window.PortfolioLifecycle?.onDispose(()=>{shown=false;cancelAnimationFrame(frame);frame=0;finishLines();finishLights();});
  document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{shown=false;sync();});addEventListener('pageshow',()=>{shown=true;sync();});build(PLACE_DATA);
})();
