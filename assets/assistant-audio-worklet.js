/* Capture PCM in bounded batches; no audio is sent from this worklet. */
class PortfolioPCM extends AudioWorkletProcessor {
  constructor() {
    super();this.buffer=new Float32Array(4096);this.used=0;this.frames=0;this.stopped=false;
    this.port.onmessage=event=>{
      if(event.data==='stop'&&!this.stopped){this.flush();this.stopped=true;this.port.postMessage({stopped:true});}
    };
  }
  flush() {
    if(!this.used)return;
    const samples=this.buffer.slice(0,this.used);this.port.postMessage({samples},[samples.buffer]);this.used=0;
  }
  process(inputs) {
    if(this.stopped)return false;
    const input=inputs[0]?.[0];if(!input)return true;
    const available=Math.min(input.length,Math.max(0,Math.floor(sampleRate*20)-this.frames));
    for(let offset=0;offset<available;){
      const count=Math.min(available-offset,this.buffer.length-this.used);
      this.buffer.set(input.subarray(offset,offset+count),this.used);this.used+=count;this.frames+=count;offset+=count;
      if(this.used===this.buffer.length)this.flush();
    }
    if(this.frames>=Math.floor(sampleRate*20)){this.flush();this.stopped=true;this.port.postMessage({limit:true});return false;}
    return true;
  }
}
registerProcessor('portfolio-pcm',PortfolioPCM);
