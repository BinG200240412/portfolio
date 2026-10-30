/* Batch the original 24px beads / 40px halos into one atlas draw. The landscape
 * still supplies the same positions, colours, alpha and painter's order. */
(() => {
  'use strict';
  function create(canvas) {
    let gl;
    try {gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});}catch(_){}
    if(!gl)return null;
    let program,buffer,quadBuffer,texture,extension,instanced,resolutionLocation,ratioLocation,capacity=65536,uploaded=0,count=0,ratio=1,disposed=false;
    let data=new Float32Array(capacity*5),images=new Map(),atlas=null;
    const api={lost:false};
    function shader(type,code){
      const item=gl.createShader(type);gl.shaderSource(item,code);gl.compileShader(item);
      if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(item);gl.deleteShader(item);throw Error(error||'Bead shader unavailable');}return item;
    }
    function init(){
      extension=gl.getExtension('ANGLE_instanced_arrays');instanced=Boolean(extension);
      if(!instanced&&gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]<128)throw Error('Bead batch not supported');
      const vertex=shader(gl.VERTEX_SHADER,`precision highp float;
        attribute vec2 a_position;attribute float a_size;attribute float a_sprite;attribute float a_alpha;
        ${instanced?'attribute vec2 a_corner;varying vec2 v_corner;':''}
        uniform vec2 u_resolution;uniform float u_ratio;varying float v_sprite;varying float v_alpha;
        void main(){vec2 position=a_position${instanced?'+a_corner*a_size':''};
          gl_Position=vec4(position/u_resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
          ${instanced?'v_corner=a_corner+.5;':'gl_PointSize=a_size*u_ratio;'}
          v_sprite=a_sprite;v_alpha=a_alpha;}`);
      const fragment=shader(gl.FRAGMENT_SHADER,`precision mediump float;
        uniform sampler2D u_atlas;varying float v_sprite;varying float v_alpha;
        ${instanced?'varying vec2 v_corner;':''}
        void main(){float side=v_sprite<35.?24.:40.;vec2 tile=vec2(mod(v_sprite,11.),floor(v_sprite/11.));
          vec2 uv=(tile*44.+2.+${instanced?'v_corner':'gl_PointCoord'}*side)/512.;
          gl_FragColor=texture2D(u_atlas,uv)*v_alpha;}`);
      program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);
      ['a_position','a_size','a_sprite','a_alpha','a_corner'].forEach((name,index)=>gl.bindAttribLocation(program,index,name));
      gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Bead program unavailable');
      buffer=gl.createBuffer();texture=gl.createTexture();uploaded=0;
      gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'u_atlas'),0);
      resolutionLocation=gl.getUniformLocation(program,'u_resolution');ratioLocation=gl.getUniformLocation(program,'u_ratio');
      if(instanced){
        quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,-.5,.5,-.5,.5,.5,-.5,.5,.5]),gl.STATIC_DRAW);
        gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,2,gl.FLOAT,false,8,0);extension.vertexAttribDivisorANGLE(4,0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      [2,1,1,1].forEach((size,index)=>{gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,20,[0,8,12,16][index]);if(instanced)extension.vertexAttribDivisorANGLE(index,1);});
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);gl.disable(gl.DITHER);
      gl.clearColor(0,0,0,0);api.lost=false;
    }
    function setAtlas(sprites,glows){
      if(disposed||api.lost)return;
      if(!atlas){atlas=document.createElement('canvas');atlas.width=atlas.height=512;}
      const paint=atlas.getContext('2d');paint.clearRect(0,0,512,512);images=new Map();
      [...sprites,...glows].forEach((image,index)=>{paint.drawImage(image,(index%11)*44+2,Math.floor(index/11)*44+2);images.set(image,index);});
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    }
    const context={globalAlpha:1,
      setTransform(a){ratio=a;},
      clearRect(){count=0;},
      drawImage(image,x,y,w,h){
        if(disposed||api.lost)return;
        if(count>=capacity){capacity*=2;const grown=new Float32Array(capacity*5);grown.set(data);data=grown;}
        const offset=count++*5;data[offset]=x+w/2;data[offset+1]=y+h/2;data[offset+2]=w;data[offset+3]=images.get(image);data[offset+4]=context.globalAlpha;
      }
    };
    function flush(){
      if(disposed||api.lost)return;
      gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);if(!count)return;
      gl.useProgram(program);gl.uniform2f(resolutionLocation,canvas.width/ratio,canvas.height/ratio);gl.uniform1f(ratioLocation,ratio);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);if(uploaded!==capacity){gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);uploaded=capacity;}
      gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*5));
      if(instanced)extension.drawArraysInstancedANGLE(gl.TRIANGLES,0,6,count);else gl.drawArrays(gl.POINTS,0,count);
    }
    function destroy(){
      if(disposed)return;disposed=true;images.clear();atlas=null;data=new Float32Array(0);
      if(!api.lost){gl.deleteTexture(texture);gl.deleteBuffer(buffer);if(quadBuffer)gl.deleteBuffer(quadBuffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
    }
    try {init();}catch(error){
      try {gl.getExtension('WEBGL_lose_context')?.loseContext();}catch(_){}
      // A selected WebGL context cannot turn into a 2D context. Clone before
      // the cover binds any input / observer, retaining its complete markup.
      const fallback=canvas.cloneNode(true);canvas.replaceWith(fallback);
      return {canvas:fallback,context:fallback.getContext('2d'),renderer:null};
    }
    Object.assign(api,{setAtlas,flush,destroy,restore:init});Object.defineProperty(api,'points',{get:()=>count});
    return {canvas,context,renderer:api};
  }
  window.QianliBeadsRenderer=Object.freeze({create});
})();
