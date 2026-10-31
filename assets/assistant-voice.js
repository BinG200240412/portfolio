/* Loaded only after the microphone is pressed. Audio stays in memory until stop. */
const WORKLET_URL=new URL('assistant-audio-worklet.js?v=cc33e94543',import.meta.url);
const MAX_SECONDS=20;
const voiceError=code=>Object.assign(new Error(code),{code});

// Area-average resampling avoids aliasing of the 48 kHz microphone signal.
export function encodeWav(chunks,sourceRate,{gain=1}={}) {
  if(!Number.isFinite(sourceRate)||sourceRate<16000||sourceRate>192000)throw voiceError('voice_unsupported');
  if(!Number.isFinite(gain)||gain<1||gain>6)throw voiceError('voice_capture_error');
  const total=Math.min(chunks.reduce((sum,part)=>sum+part.length,0),Math.floor(sourceRate*MAX_SECONDS));
  const pcm=new Float32Array(total);let offset=0;
  for(const chunk of chunks){const count=Math.min(chunk.length,total-offset);if(count<=0)break;pcm.set(chunk.subarray(0,count),offset);offset+=count;}
  const count=Math.floor(total*16000/sourceRate),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
  const ascii=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
  ascii(0,'RIFF');view.setUint32(4,36+count*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  ascii(36,'data');view.setUint32(40,count*2,true);
  const ratio=sourceRate/16000;
  for(let i=0;i<count;i++){
    const start=i*ratio,end=(i+1)*ratio;let sum=0;
    for(let j=Math.floor(start);j<end;j++)sum+=pcm[j]*Math.max(0,Math.min(j+1,end)-Math.max(j,start));
    const value=Math.max(-1,Math.min(1,sum/ratio*gain));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);
  }
  return new Blob([buffer],{type:'audio/wav'});
}

export function record({context,signal,onLevels=()=>{},onState=()=>{},onDiagnostics,deviceId='',processing=true}={}) {
  let stream,source,analyser,node,gain,initialTimer,maximumTimer,flushTimer,permissionTimer,captureTimer;
  let ending=false,settled=false,lastSound=0,heard=false,frames=0,voiceSince=null,listening=false;
  let elapsed=0,windowCount=0,windowPower=0,latestRms=0,noiseFloor=0,blocks=0,inputChannels=0,selectedChannel=0;
  const chunks=[],ambient=[];
  let resolveResult,rejectResult;
  const result=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  const diagnose=(stage,extra={})=>{
    if(typeof onDiagnostics!=='function')return;
    try{
      const track=stream?.getAudioTracks()[0],settings=track?.getSettings?.()||{};
      // Deliberately omit device/group IDs, audio and transcripts.
      onDiagnostics(Object.freeze({stage,context:context?.state,track:track?.readyState,muted:track?.muted,enabled:track?.enabled,
        channelCount:settings.channelCount,sampleRate:settings.sampleRate,echoCancellation:settings.echoCancellation,
        noiseSuppression:settings.noiseSuppression,autoGainControl:settings.autoGainControl,
        frames,blocks,inputChannels,selectedChannel,rms:latestRms,heard,...extra}));
    }catch(_){}
  };
  const cleanup=()=>{
    clearTimeout(initialTimer);clearTimeout(maximumTimer);clearTimeout(flushTimer);clearTimeout(permissionTimer);clearTimeout(captureTimer);
    signal?.removeEventListener('abort',cancel);
    context?.removeEventListener?.('statechange',contextChanged);
    for(const part of [source,analyser,node,gain]){try{part?.disconnect();}catch(_){}}
    if(node){node.port.onmessage=null;node.onprocessorerror=null;}
    stream?.getTracks().forEach(track=>track.stop());
    if(context&&context.state!=='closed')Promise.resolve(context.close()).catch(()=>{});
    onLevels(new Array(27).fill(0));
  };
  const fail=code=>{if(settled)return;settled=true;ending=true;diagnose('error',{code});cleanup();chunks.length=0;rejectResult(voiceError(code));};
  const finish=()=>{
    if(settled)return;
    // The visual/VAD loop may miss a quiet voice or a short final batch. A
    // deliberate stop is judged from captured PCM, never from the display gate.
    let power=0,peak=0;
    for(const chunk of chunks)for(const sample of chunk){power+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
    const rms=frames?Math.sqrt(power/frames):0;
    if(!frames){fail('voice_capture_error');return;}
    if(frames<Math.floor(context.sampleRate*.1)){fail('voice_empty');return;}
    if(rms<.0002){fail('voice_input_silent');return;}
    // Modest gain only after sustained activity above the measured room floor;
    // stationary background noise is not automatically amplified.
    const gain=heard?Math.max(1,Math.min(6,.035/rms,.95/Math.max(peak,.0001))):1;
    settled=true;diagnose('finished',{rms,peak,gain});cleanup();
    try{const audio=encodeWav(chunks,context.sampleRate,{gain});chunks.length=0;resolveResult(audio);}
    catch(error){chunks.length=0;rejectResult(error);}
  };
  function contextChanged(){diagnose('context');if(!settled&&!ending&&node&&context.state!=='running')fail('voice_interrupted');}
  function cancel(){fail('voice_cancelled');}
  function stop(reason='manual'){
    if(ending||settled)return;
    ending=true;clearTimeout(initialTimer);clearTimeout(maximumTimer);clearTimeout(captureTimer);diagnose('stopping',{reason});
    if(!node){cancel();return;}
    onState('stopping');node.port.postMessage('stop');flushTimer=setTimeout(finish,750);
  }
  function observe(rms,duration){
    latestRms=rms;elapsed+=duration;
    ambient.push({time:elapsed,rms});while(ambient.length>1&&ambient[0].time<elapsed-1500)ambient.shift();
    const sorted=ambient.map(part=>part.rms).sort((a,b)=>a-b);noiseFloor=sorted[Math.floor((sorted.length-1)*.2)];
    const threshold=Math.max(.0012,noiseFloor*1.65+.0003);
    if(elapsed>=250&&rms>threshold){
      if(voiceSince===null)voiceSince=elapsed;
      if(elapsed-voiceSince>=80){heard=true;lastSound=elapsed;clearTimeout(initialTimer);}
    }else voiceSince=null;
    if(heard&&elapsed-lastSound>1800)stop('silence');
  }
  function consume(samples){
    const size=Math.max(1,Math.floor(context.sampleRate*.02));
    for(const sample of samples){
      windowPower+=sample*sample;windowCount++;
      if(windowCount===size){observe(Math.sqrt(windowPower/windowCount),windowCount/context.sampleRate*1000);windowCount=0;windowPower=0;}
    }
    // Both detection and the dot height use the PCM being recorded, rather
    // than a separate, possibly stereo-cancelled analyser or a RAF clock.
    // Room noise must not leave a permanently lit baseline. This visual gate
    // never decides whether the captured PCM can be transcribed.
    const level=Math.min(1,Math.sqrt(Math.max(0,latestRms-Math.max(.0005,noiseFloor*1.5+.00015))/.08));
    const spectrum=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(spectrum);
    onLevels(Array.from({length:27},(_,i)=>{
      const hz=90*Math.pow(55,i/26),bin=Math.min(spectrum.length-1,Math.round(hz*analyser.fftSize/context.sampleRate));
      return Math.min(1,level*(.36+spectrum[bin]/255));
    }));
    diagnose('pcm');
  }
  async function start(){
    if(signal?.aborted){cancel();return;}
    signal?.addEventListener('abort',cancel,{once:true});
    if(!navigator.mediaDevices?.getUserMedia||!context?.audioWorklet||typeof AudioWorkletNode==='undefined'){fail('voice_unsupported');return;}
    onState('requesting');
    permissionTimer=setTimeout(()=>fail('voice_permission_timeout'),15000);
    try{
      // Permission can resolve after cancellation. Always stop that late stream.
      if(typeof deviceId!=='string'||deviceId.length>1024||/[\x00-\x1f\x7f]/.test(deviceId)){fail('voice_capture_error');return;}
      const audio={channelCount:1,echoCancellation:!!processing,noiseSuppression:!!processing,autoGainControl:!!processing};
      if(deviceId)audio.deviceId={exact:deviceId};
      const acquired=await navigator.mediaDevices.getUserMedia({audio,video:false});
      if(settled){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;clearTimeout(permissionTimer);permissionTimer=setTimeout(()=>fail('voice_capture_error'),10000);
      await context.audioWorklet.addModule(WORKLET_URL.href);
      if(settled)return;
      if(context.state==='suspended')await context.resume();
      if(settled)return;
      if(context.state!=='running'){fail('voice_capture_error');return;}
      if(acquired.active===false||acquired.getAudioTracks().some(track=>track.readyState==='ended')){fail('voice_interrupted');return;}
      diagnose('microphone');
      source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.6;
      node=new AudioWorkletNode(context,'portfolio-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCountMode:'max',channelInterpretation:'discrete'});
      node.onprocessorerror=()=>fail('voice_capture_error');
      context.addEventListener?.('statechange',contextChanged);
      gain=context.createGain();gain.gain.value=0;
      node.port.onmessage=event=>{
        if(settled)return;
        if(Number.isInteger(event.data?.channels)){inputChannels=event.data.channels;selectedChannel=event.data.channel||0;diagnose('worklet');}
        const samples=event.data?.samples;
        if(samples instanceof Float32Array){
          const count=Math.min(samples.length,Math.max(0,Math.floor(context.sampleRate*MAX_SECONDS)-frames));
          if(count){
            if(!listening){listening=true;if(!ending){onState('listening');initialTimer=setTimeout(()=>stop('initial_silence'),8000);}}
            clearTimeout(captureTimer);if(!ending)captureTimer=setTimeout(()=>fail('voice_interrupted'),3000);
            const part=samples.subarray(0,count);chunks.push(part);frames+=count;blocks++;consume(part);
          }
        }
        if(event.data?.stopped)finish();
        else if(event.data?.limit){ending=true;finish();}
      };
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(!settled&&!ending)fail('voice_interrupted');},{once:true}));
      source.connect(node);node.connect(analyser);analyser.connect(gain);gain.connect(context.destination);
      clearTimeout(permissionTimer);diagnose('starting');
      captureTimer=setTimeout(()=>fail('voice_capture_error'),3000);
      maximumTimer=setTimeout(()=>stop('limit'),MAX_SECONDS*1000);
    }catch(error){
      if(settled)return;
      fail(error?.name==='NotAllowedError'||error?.name==='SecurityError'?'voice_permission_denied':error?.name==='NotFoundError'?'voice_no_microphone':'voice_capture_error');
    }
  }
  start();
  return Object.freeze({result,stop,cancel});
}
