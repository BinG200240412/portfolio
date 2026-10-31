/* Capture PCM in bounded batches; no audio is sent from this worklet. */
class PortfolioPCM extends AudioWorkletProcessor {
  constructor() {
    super();this.buffer=new Float32Array(2048);this.used=0;this.frames=0;this.stopped=false;this.channel=0;this.channels=-1;
    this.port.onmessage=event=>{
      if(event.data==='stop'&&!this.stopped){this.flush();this.stopped=true;this.port.postMessage({stopped:true});}
    };
  }
  flush() {
    if(!this.used)return;
    const samples=this.buffer.slice(0,this.used);this.port.postMessage({samples},[samples.buffer]);this.used=0;
  }
  process(inputs,outputs=[]) {
    if(this.stopped)return false;
    const channels=inputs[0]||[];
    let selected=this.channel<channels.length?this.channel:0,best=selected,bestPower=0,selectedPower=0;
    for(let channel=0;channel<channels.length;channel++){
      let power=0;for(const sample of channels[channel])power+=sample*sample;
      if(channel===selected)selectedPower=power;
      if(power>bestPower){bestPower=power;best=channel;}
    }
    // A device may expose silent left / live right inputs despite requesting
    // mono. Keep the stronger channel, with hysteresis, rather than discarding
    // it or averaging opposite-phase inputs into digital silence.
    if(bestPower>selectedPower*1.5)selected=best;
    if(this.channels!==channels.length||this.channel!==selected){
      this.channels=channels.length;this.channel=selected;
      this.port.postMessage({channels:this.channels,channel:selected});
    }
    const input=channels[selected];if(!input)return true;
    const output=outputs[0]?.[0];if(output)output.set(input.subarray(0,output.length));
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
