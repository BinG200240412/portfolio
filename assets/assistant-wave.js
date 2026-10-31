/* A history of real speech loudness, not a live frequency equaliser.
 * Each centred LED column is sampled once and keeps its shape as it travels. */
const SVG_NS='http://www.w3.org/2000/svg';
const WIDTH=320,HEIGHT=48,CENTER=24,PITCH_X=6,PITCH_Y=4;
const SAMPLE_MS=80,SPEED=PITCH_X/SAMPLE_MS,STALE_MS=320,QUIET=.01;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function createVoiceWave(svg,{isReducedMotion=()=>false,onLit}={}) {
  if(!svg?.ownerDocument||typeof svg.setAttribute!=='function')throw new TypeError('A voice waveform SVG is required.');
  const doc=svg.ownerDocument,layer=doc.createElementNS(SVG_NS,'g'),bars=[];
  let running=false,destroyed=false,frame=0,epoch=null,lastIndex=-1,lastOffset='',inputAt=-Infinity,target=0,pendingPeak=0,peakAt=-Infinity,envelope=0,lit=false;
  layer.setAttribute('data-voice-wave','');svg.replaceChildren(layer);
  svg.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);svg.setAttribute('fill','none');svg.setAttribute('overflow','hidden');
  const reduced=()=>{try{return typeof isReducedMotion==='function'?!!isReducedMotion():!!isReducedMotion;}catch(_){return false;}};
  const notify=value=>{if(value===lit)return;lit=value;if(typeof onLit==='function'){try{onLit(value);}catch(_){}}};
  function clearHistory(){bars.length=0;layer.replaceChildren();layer.setAttribute('transform','translate(0 0)');epoch=null;lastIndex=-1;lastOffset='';envelope=0;notify(false);}
  function reset(){target=0;pendingPeak=0;inputAt=peakAt=-Infinity;clearHistory();}
  function schedule(){if(!frame&&running&&!destroyed&&!doc.hidden)frame=requestAnimationFrame(draw);}
  function wake(now){if(epoch===null)epoch=now;schedule();}
  function column(index,level){
    const group=doc.createElementNS(SVG_NS,'g'),x=WIDTH+index*PITCH_X;
    group.setAttribute('data-voice-sample',String(index));group.setAttribute('transform',`translate(${x} 0)`);
    function bead(row,opacity){
      if(opacity<.015)return;
      const circle=doc.createElementNS(SVG_NS,'circle');circle.setAttribute('cx','0');circle.setAttribute('cy',String(CENTER+row*PITCH_Y));
      circle.setAttribute('r','1.1');circle.setAttribute('fill','currentColor');circle.setAttribute('opacity',opacity.toFixed(2));group.appendChild(circle);
    }
    bead(0,.92*Math.min(1,level/.035));
    const halfHeight=Math.pow(level,.65)*5;
    for(let row=1;row<=5;row++){
      const opacity=.92*clamp(halfHeight-(row-1),0,1);bead(-row,opacity);bead(row,opacity);
    }
    layer.appendChild(group);bars.push({group,x});
  }
  function draw(now){
    frame=0;if(!running||destroyed||doc.hidden||epoch===null)return;
    const elapsed=Math.max(0,now-epoch),index=Math.floor(elapsed/SAMPLE_MS),fresh=now-inputAt<=STALE_MS;
    if(index>lastIndex){
      // A callback peak survives a brief syllable between frames. Old pending
      // peaks expire; a long stalled frame never fabricates a catch-up history.
      const raw=Math.max(fresh?target:0,now-peakAt<=SAMPLE_MS?pendingPeak:0);
      if(raw>QUIET){
        const tau=raw>envelope?50:110;envelope+=(raw-envelope)*(1-Math.exp(-SAMPLE_MS/tau));column(index,envelope);
      }else envelope=0;
      lastIndex=index;pendingPeak=0;peakAt=-Infinity;
    }
    // One track transform moves every existing column at a constant speed.
    // Reduced motion updates only on data beats, without interpolated travel.
    const offset=reduced()?index*PITCH_X:elapsed*SPEED,key=offset.toFixed(3);
    if(key!==lastOffset){layer.setAttribute('transform',`translate(-${key} 0)`);lastOffset=key;}
    while(bars.length&&bars[0].x-offset<-2){bars.shift().group.remove();}
    notify(bars.some(bar=>bar.x-offset<=WIDTH+2));
    if(bars.length||(fresh&&target>QUIET)||(now-peakAt<=SAMPLE_MS&&pendingPeak>QUIET))schedule();
    else clearHistory();
  }
  function setLevels(input){
    if(destroyed||doc.hidden)return;
    let peak=0;
    if(input&&typeof input.length==='number')for(let index=0;index<Math.min(64,input.length);index++){
      const value=input[index];if(typeof value==='number'&&Number.isFinite(value))peak=Math.max(peak,clamp(value,0,1));
    }
    const now=performance.now();target=peak>QUIET?peak:0;inputAt=now;
    if(now-peakAt>SAMPLE_MS)pendingPeak=0;
    if(target>=pendingPeak){pendingPeak=target;peakAt=now;}
    if(running&&(target>QUIET||pendingPeak>QUIET||bars.length))wake(now);
  }
  function start(){
    if(running||destroyed)return;running=true;const now=performance.now();
    if(now-inputAt>STALE_MS){target=pendingPeak=0;peakAt=-Infinity;}
    if(target>QUIET||pendingPeak>QUIET)wake(now);
  }
  function stop(){running=false;cancelAnimationFrame(frame);frame=0;reset();}
  function visibility(){if(doc.hidden){cancelAnimationFrame(frame);frame=0;reset();}}
  doc.addEventListener('visibilitychange',visibility);
  function destroy(){if(destroyed)return;stop();destroyed=true;doc.removeEventListener('visibilitychange',visibility);layer.remove();}
  return Object.freeze({setLevels,start,stop,destroy});
}
