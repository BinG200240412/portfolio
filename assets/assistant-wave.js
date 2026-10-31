/* Lazy voice visual: centred LED bars driven directly by the 27 audio bands.
 * Only illuminated beads exist; silence never paints an idle matrix. */
const SVG_NS='http://www.w3.org/2000/svg';
const WIDTH=320,HEIGHT=48,CENTER=24,COLUMNS=27,PITCH_X=12,PITCH_Y=4;
const STALE_MS=320,QUIET=.004;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function createVoiceWave(svg,{isReducedMotion=()=>false,onLit}={}) {
  if(!svg?.ownerDocument||typeof svg.setAttribute!=='function')throw new TypeError('A voice waveform SVG is required.');
  const doc=svg.ownerDocument,layer=doc.createElementNS(SVG_NS,'g'),points=new Map();
  const targets=Array(COLUMNS).fill(0),levels=Array(COLUMNS).fill(0);
  let running=false,destroyed=false,frame=0,lastPaint=0,inputAt=-Infinity,lit=false;
  layer.setAttribute('data-voice-wave','');svg.replaceChildren(layer);
  svg.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);svg.setAttribute('fill','none');
  const reduced=()=>{try{return typeof isReducedMotion==='function'?!!isReducedMotion():!!isReducedMotion;}catch(_){return false;}};
  const notify=value=>{if(value===lit)return;lit=value;if(typeof onLit==='function'){try{onLit(value);}catch(_){}}};
  const moving=()=>levels.some(value=>value>=QUIET);
  const fresh=now=>now-inputAt<=STALE_MS&&targets.some(value=>value>0);
  function clear(){points.clear();layer.replaceChildren();notify(false);}
  function reset(){targets.fill(0);levels.fill(0);inputAt=-Infinity;clear();}
  function schedule(){if(!frame&&running&&!destroyed&&!doc.hidden)frame=requestAnimationFrame(draw);}
  function bead(column,row,opacity,desired){
    if(opacity<.015)return;
    const key=column+':'+row,value=opacity.toFixed(2);desired.add(key);let point=points.get(key);
    if(!point){
      const circle=doc.createElementNS(SVG_NS,'circle');
      circle.setAttribute('cx',String(4+column*PITCH_X));circle.setAttribute('cy',String(CENTER+row*PITCH_Y));
      circle.setAttribute('r','1.1');circle.setAttribute('fill','currentColor');layer.appendChild(circle);
      point={circle,opacity:null};points.set(key,point);
    }
    if(point.opacity!==value){point.circle.setAttribute('opacity',value);point.opacity=value;}
  }
  function paint(){
    const desired=new Set();
    for(let column=0;column<COLUMNS;column++){
      const level=levels[column];if(level<QUIET)continue;
      const halfHeight=Math.pow(level,.65)*5;
      bead(column,0,.92*Math.min(1,level/.035),desired);
      // Matching top/bottom opacity keeps the whole bar exactly centred.
      // The edge pair fades continuously instead of adding a hard flashing row.
      for(let row=1;row<=5;row++){
        const opacity=.92*clamp(halfHeight-(row-1),0,1);
        bead(column,-row,opacity,desired);bead(column,row,opacity,desired);
      }
    }
    for(const[key,point]of points)if(!desired.has(key)){point.circle.remove();points.delete(key);}
    notify(points.size>0);
  }
  function draw(now){
    frame=0;if(!running||destroyed||doc.hidden)return;
    const calm=reduced(),interval=calm?80:30;
    if(now-lastPaint>=interval){
      const dt=clamp(now-lastPaint,8,100),current=now-inputAt<=STALE_MS;
      for(let column=0;column<COLUMNS;column++){
        const target=current?targets[column]:0,tau=target>levels[column]?(calm?125:75):(calm?230:165);
        levels[column]+=(target-levels[column])*(1-Math.exp(-dt/tau));
        if(target===0&&levels[column]<QUIET)levels[column]=0;
      }
      lastPaint=now;paint();
    }
    if(fresh(now)||moving()||points.size)schedule();
  }
  function setLevels(input){
    if(destroyed||doc.hidden)return;
    for(let column=0;column<COLUMNS;column++){
      const value=input?.[column];targets[column]=typeof value==='number'&&Number.isFinite(value)&&value>.01?clamp(value,0,1):0;
    }
    inputAt=performance.now();
    if(running&&(fresh(inputAt)||moving()||points.size)){if(!frame)lastPaint=Math.max(lastPaint,inputAt-32);schedule();}
  }
  function start(){
    if(running||destroyed)return;running=true;const now=performance.now();lastPaint=now-32;
    if(now-inputAt>STALE_MS)targets.fill(0);
    if(fresh(now))schedule();
  }
  function stop(){running=false;cancelAnimationFrame(frame);frame=0;reset();}
  function visibility(){
    if(doc.hidden){cancelAnimationFrame(frame);frame=0;reset();}
    // Visible pages wait for new audio rather than replaying stale levels.
  }
  doc.addEventListener('visibilitychange',visibility);
  function destroy(){if(destroyed)return;stop();destroyed=true;doc.removeEventListener('visibilitychange',visibility);layer.remove();}
  return Object.freeze({setLevels,start,stop,destroy});
}
