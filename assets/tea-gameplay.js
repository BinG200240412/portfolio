/* Actual game recordings and a code-native, schematic physical input study. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('[data-tea-recording]')];
  const videoVisible = new Set();
  function syncVideos() {
    const paused = document.hidden || reduced.matches || !!document.querySelector('dialog[open]');
    videos.forEach(v => {
      if (!paused && videoVisible.has(v)) {
        const s = v.querySelector('source');
        if (!s.src) {s.src = s.dataset.src; v.load();}
        v.play().catch(() => {});
      } else v.pause();
    });
  }
  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? videoVisible.add(e.target) : videoVisible.delete(e.target));
    syncVideos();
  }, {threshold:.35});
  videos.forEach(v => videoObserver.observe(v));
  document.addEventListener('visibilitychange',syncVideos);
  document.addEventListener('close',syncVideos,true);
  new MutationObserver(syncVideos).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change',syncVideos);

  const canvas = document.getElementById('tea-whisk-hardware');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('tea-whisk-intensity');
  const assembly = document.querySelector('[data-tea-assembly]');
  const TAU = Math.PI*2;
  let visible=false, frame=0, last=0, phase=0, strength=+input.value;
  let target=1, spread=1, W=1100,H=550,light=false;
  function label() {
    const en=document.documentElement.lang.startsWith('en');
    assembly.textContent=target ? (en?'Fit into handle':'装入柄端') : (en?'Explode assembly':'拆开看结构');
    canvas.setAttribute('aria-label',en ? 'Dotted assembly concept: M5StickC Plus fits in a removable sleeve on the tea whisk handle. Gyroscope intensity maps to virtual circling rate.' : '点阵结构示意：M5StickC Plus 装入茶筅柄端可拆卸套筒，陀螺仪读取动作强度，映射为屏幕中的绕圈频率。');
  }
  function dot(x,y,r,c) {ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function line(x1,y1,x2,y2,c,r=1.3) {
    const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/6);
    for(let i=0;i<=n;i++)dot(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,r,c);
  }
  function render() {
    const mobile=W===600, k=mobile?.86:1;
    ctx.clearRect(0,0,W,H);
    light=document.documentElement.dataset.theme==='light';
    const bamboo=light?['#816024','#a87b2d','#5c491e']:['#b18c4d','#dfc485','#79633e'];
    const jade=light?'#186452':'#93c5b2',dim=light?'#738479':'#465c55';
    const orange=light?'#a74d1b':'#d88950',screen=light?'#154b42':'#72a99b';
    const wx=mobile?170:290, top=mobile?90:45, bottom=mobile?385:455;
    const motion=Math.sin(phase*1.1)*strength*2.2;
    function p(x,y){return [wx+x*k+motion*(y-top)/(bottom-top),y];}
    function wd(x,y,r,c){const v=p(x,y);dot(v[0],v[1],r,c);}
    // Cylindrical bamboo handle: individual point size follows the surface normal.
    for(let y=top;y<top+178;y+=4.5)for(let a=-1.55;a<1.55;a+=.14){
      const n=Math.cos(a),x=19*Math.sin(a);
      wd(x,y,1.05+n*.85,bamboo[n>.72?1:0]);
    }
    // Open, individual bamboo tines and inward curls.
    for(let j=0;j<32;j++){
      const a=j/32*TAU+phase*.3,z=Math.cos(a),sn=Math.sin(a);
      for(let t=0;t<=1;t+=.014){
        const r=16+58*Math.sin(t*Math.PI*.5)-18*Math.max(0,(t-.84)/.16)**2;
        const y=top+176+t*(bottom-top-176);
        wd(sn*r,y,1.1+Math.max(0,z)*.8,bamboo[z>.3?1:2]);
      }
    }
    for(let y=top+161;y<top+183;y+=4)for(let x=-23;x<=23;x+=4)wd(x,y,1.3,bamboo[2]);
    // Removable sleeve surrounding the upper handle, shown as a dotted shell.
    const sleeveH=116;
    for(let y=top-10;y<top+sleeveH;y+=5)for(let a=-1.55;a<1.55;a+=.14){
      const x=34*Math.sin(a),normal=Math.cos(a);
      if(Math.abs(x)>23 || y<top+2 || y>top+sleeveH-12) wd(x,y,1.1+normal*.5,jade);
      else if((Math.round(y)%15)<5) wd(x,y,.7,dim);
    }
    const mx=wx+(mobile?230:250)*spread, my=top+52;
    // 24 × 48 mm module, with enclosure, screen, controller and USB landmarks.
    const mw=54*k,mh=108*k;
    for(let y=-mh/2;y<=mh/2;y+=4.4)for(let x=-mw/2;x<=mw/2;x+=4.4){
      const edge=Math.abs(x)>mw/2-7||Math.abs(y)>mh/2-7;
      dot(mx+x,my+y,edge?1.8:1.05,edge?orange:dim);
    }
    for(let y=-mh*.32;y<mh*.12;y+=4.5)for(let x=-mw*.31;x<mw*.31;x+=4.5){
      if(Math.abs(x)>mw*.2||y<-mh*.23||y>mh*.03)dot(mx+x,my+y,1.3,screen);
    }
    for(let x=-mw*.23;x<=mw*.23;x+=4)dot(mx+x,my+mh*.43,1.5,jade);
    for(let y=mh*.21;y<mh*.33;y+=4)for(let x=-mw*.13;x<mw*.13;x+=4)dot(mx+x,my+y,1.5,jade);
    if(spread>.15){
      line(wx+38*k,my,mx-mw*.65,my,dim,1);
      const t=(phase*.3)%1;dot(wx+38*k+(mx-mw*.65-wx-38*k)*t,my,2.5,jade);
    }
    // Screen feedback: a top-view field with a frequency-dependent moving sector.
    const bx=mobile?315:850,by=mobile?625:300,R=mobile?120:155;
    for(let a=0;a<TAU;a+=.04)for(let ring=0;ring<3;ring++)dot(bx+Math.cos(a)*(R+ring*5),by+Math.sin(a)*(R+ring*5),1.3,jade);
    for(let y=-R+10;y<R-10;y+=6)for(let x=-R+10;x<R-10;x+=6){
      const r=Math.hypot(x,y);if(r>R-10)continue;
      const a=Math.atan2(y,x),n=(Math.sin(x*13.2+y*7.1)*4375)%1;
      const pulse=.5+.5*Math.cos(a-phase*2-r*.025);
      const sz=.6+strength*.18+pulse*.8;
      if(n>.1)dot(bx+x,by+y,sz,light?(pulse>.7?'#3a7363':'#95a79a'):(pulse>.7?'#b5d2be':'#526f61'));
    }
    const head=phase*2;
    for(let i=0;i<18;i++){const a=head-i*.035;dot(bx+Math.cos(a)*(R+4),by+Math.sin(a)*(R+4),2.7-i*.09,jade);}
    // USB relay route (not a wireless link or a real-time connection).
    const route=mobile?[[mx+mw/2,my+mh*.45],[520,330],[500,430],[bx+80,by-100]]:[[mx+mw/2,my+mh*.45],[650,150],[700,230],[bx-R-15,by]];
    for(let i=0;i<route.length-1;i++)line(...route[i],...route[i+1],dim,.95);
    const seg=((Math.floor(phase*.65)%(route.length-1))+(route.length-1))%(route.length-1),u=((phase*.65)%1+1)%1;
    dot(route[seg][0]+(route[seg+1][0]-route[seg][0])*u,route[seg][1]+(route[seg+1][1]-route[seg][1])*u,2.8,jade);
    canvas.dataset.renderReady='true';canvas.dataset.mode=target?'exploded':'assembled';
    canvas.dataset.frequency=strength.toFixed(1);canvas.dataset.phase=phase.toFixed(2);
  }
  function resize(){const rect=canvas.getBoundingClientRect();W=rect.width<650?600:1100;H=W===600?820:550;const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);render();}
  function tick(now){frame=0;if(!visible||document.hidden||document.querySelector('dialog[open]'))return;
    const dt=last ? Math.max(0,Math.min(.06,(now-last)/1000||0)) : 0;last=now;
    if(!reduced.matches)phase+=dt*strength;
    spread+= (target-spread)*Math.min(1,dt*7);
    render();
    if(!reduced.matches||Math.abs(spread-target)>.001)frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
  assembly.addEventListener('click',()=>{target=target?0:1;assembly.setAttribute('aria-pressed',String(!target));if(reduced.matches)spread=target;label();render();start();});
  input.addEventListener('input',()=>{strength=+input.value;render();start();});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.05}).observe(canvas);
  new MutationObserver(()=>{label();render();start();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','lang']});
  new MutationObserver(start).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
  label();resize();
})();
