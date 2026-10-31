/* Lazy voice visual: a travelling dot trace, never a background matrix.
 * Levels carry the real input envelope; the slow bipolar phase only gives
 * that non-negative envelope a readable time-domain shape. */
const SVG_NS='http://www.w3.org/2000/svg';
const WIDTH=320,HEIGHT=48,GRID=4,CENTER=24,COLUMNS=79;
const STEP_MS=40,TAIL_MS=1500,FADE_MS=240,STALE_MS=320;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function createVoiceWave(svg,{isReducedMotion=()=>false,onLit}={}) {
  if(!svg?.ownerDocument||typeof svg.setAttribute!=='function')throw new TypeError('A voice waveform SVG is required.');
  const doc=svg.ownerDocument,layer=doc.createElementNS(SVG_NS,'g'),points=new Map();
  let running=false,destroyed=false,frame=0,startedAt=0,lastStep=0,lastPaint=0,inputAt=-Infinity,target=0,envelope=0,previous=null,lit=false;
  layer.setAttribute('data-voice-wave','');svg.replaceChildren(layer);
  svg.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);svg.setAttribute('fill','none');
  const reduced=()=>{try{return typeof isReducedMotion==='function'?!!isReducedMotion():!!isReducedMotion;}catch(_){return false;}};
  const notify=value=>{if(value===lit)return;lit=value;if(typeof onLit==='function'){try{onLit(value);}catch(_){}}};
  function clear() {points.clear();layer.replaceChildren();previous=null;notify(false);}
  function schedule(){if(!frame&&running&&!destroyed&&!doc.hidden)frame=requestAnimationFrame(draw);}
  function dot(column,row,time,desired){
    row=clamp(row,1,11);const key=column+':'+row;desired?.add(key);
    let point=points.get(key);
    if(!point){
      const circle=doc.createElementNS(SVG_NS,'circle');
      circle.setAttribute('cx',String(4+column*GRID));circle.setAttribute('cy',String(row*GRID));
      circle.setAttribute('r','1.1');circle.setAttribute('fill','currentColor');circle.setAttribute('opacity','.92');
      layer.appendChild(circle);point={circle,time,opacity:'.92'};points.set(key,point);
    }
    point.time=time;
    if(point.opacity!=='.92'){point.circle.setAttribute('opacity','.92');point.opacity='.92';}
  }
  // Rasterise just the line between two samples, keeping every lamp circular.
  function segment(from,to,time,desired){
    if(!from){dot(to.column,to.row,time,desired);return;}
    let x=from.column,y=from.row;
    const dx=Math.abs(to.column-x),sx=x<to.column?1:-1,dy=-Math.abs(to.row-y),sy=y<to.row?1:-1;let error=dx+dy;
    for(let guard=0;guard<24;guard++){
      dot(x,y,time,desired);if(x===to.column&&y===to.row)break;
      const twice=error*2;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}
    }
  }
  function expire(now){
    for(const[key,point]of points){
      const age=now-point.time;
      if(age>=TAIL_MS){point.circle.remove();points.delete(key);continue;}
      if(age>TAIL_MS-FADE_MS){
        const opacity=(.92*(TAIL_MS-age)/FADE_MS).toFixed(2);
        if(opacity!==point.opacity){point.circle.setAttribute('opacity',opacity);point.opacity=opacity;}
      }
    }
  }
  function sample(time){
    const fresh=time-inputAt<=STALE_MS?target:0;
    envelope+=(fresh-envelope)*(1-Math.exp(-STEP_MS/(fresh>envelope?85:155)));
    if(envelope<.012){previous=null;return;}
    const elapsed=time-startedAt,column=((Math.floor(elapsed/STEP_MS)%COLUMNS)+COLUMNS)%COLUMNS;
    const phase=elapsed/1000*Math.PI*2*1.35;
    const signed=(Math.sin(phase)+.18*Math.sin(phase*2))/1.08;
    const row=clamp(Math.round((CENTER-signed*Math.pow(envelope,.62)*20)/GRID),1,11);
    const current={column,row,time};
    segment(previous&&column===previous.column+1&&time-previous.time<=STEP_MS*2?previous:null,current,time);
    previous=current;
  }
  function staticTrace(time){
    const fresh=time-inputAt<=STALE_MS?target:0;
    envelope+=(fresh-envelope)*(1-Math.exp(-Math.max(STEP_MS,time-lastStep)/(fresh>envelope?85:155)));
    if(envelope<.012){clear();return;}
    const amplitude=Math.pow(envelope,.62)*20,profile=[0,.08,.16,-.34,.94,-.62,.12,.22,.07,0],desired=new Set();let from=null;
    for(let index=0;index<profile.length;index++){
      const current={column:34+index,row:clamp(Math.round((CENTER-profile[index]*amplitude)/GRID),1,11)};
      segment(from,current,time,desired);from=current;
    }
    for(const[key,point]of points)if(!desired.has(key)){point.circle.remove();points.delete(key);}
  }
  function draw(now){
    frame=0;if(!running||destroyed||doc.hidden)return;
    if(now-lastPaint>=30){
      if(reduced()){staticTrace(now);lastStep=now;previous=null;}
      else{
        // Resume from current time after a long idle; never replay missed frames.
        if(now-lastStep>120)lastStep=now-STEP_MS;
        while(now-lastStep>=STEP_MS){lastStep+=STEP_MS;sample(lastStep);}
        expire(now);
      }
      lastPaint=now;notify(points.size>0);
    }
    if((target>0&&now-inputAt<=STALE_MS)||envelope>=.012||points.size)schedule();
  }
  function setLevels(levels){
    if(destroyed||doc.hidden)return;
    let peak=0;
    if(levels&&typeof levels.length==='number')for(let index=0;index<Math.min(64,levels.length);index++){
      const value=levels[index];if(typeof value==='number'&&Number.isFinite(value))peak=Math.max(peak,clamp(value,0,1));
    }
    target=peak>.01?peak:0;inputAt=performance.now();
    if(running&&(target||envelope>=.012||points.size))schedule();
  }
  function start(){
    if(running||destroyed)return;running=true;startedAt=performance.now();lastStep=startedAt-STEP_MS;lastPaint=startedAt-32;
    if(startedAt-inputAt>STALE_MS)target=0;
    if(target)schedule();
  }
  function stop(){
    running=false;cancelAnimationFrame(frame);frame=0;target=0;envelope=0;inputAt=-Infinity;clear();
  }
  function visibility(){
    if(doc.hidden){cancelAnimationFrame(frame);frame=0;target=0;envelope=0;inputAt=-Infinity;clear();}
    // A fresh setLevels call wakes an otherwise silent, resumed recording.
  }
  doc.addEventListener('visibilitychange',visibility);
  function destroy(){if(destroyed)return;stop();destroyed=true;doc.removeEventListener('visibilitychange',visibility);layer.remove();}
  return Object.freeze({setLevels,start,stop,destroy});
}
