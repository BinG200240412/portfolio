/* Original code-drawn rear-view gorilla. No image loads, SVG sampling or SDFs.
 * 48×64 native LEDs; roles 1–4 are grey, role 5 belongs only to the red heart.
 */
(function (global) {
  'use strict';
  const W = 48, H = 64, TAU = Math.PI * 2;
  const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const finite = (v,f) => Number.isFinite(v) ? v : f;
  const butt = [[9,35],[10,33],[12,32],[15,32],[18,33],[20,34],[22,33],[25,32],[28,33],[30,35],
    [31,38],[30,41],[28,43],[25,44],[22,43],[20,40],[18,43],[15,44],[12,43],[10,41]];
  const heart = [[9,35],[10,33],[12,32],[15,32],[18,33],[20,35],[22,33],[25,32],[28,33],[30,35],
    [31,38],[30,40],[28,42],[25,44],[22,46],[20,47],[18,46],[15,44],[12,42],[10,40]];

  function raster() {
    const pixels = new Uint8Array(W * H);
    function dot(x,y,c) {
      x=Math.round(x);y=Math.round(y);
      if(x>=0&&x<W&&y>=0&&y<H)pixels[y*W+x]=c;
    }
    function poly(points,c) {
      let y0=H,y1=0;
      for(const p of points){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
      for(let y=Math.max(0,Math.floor(y0));y<=Math.min(H-1,Math.ceil(y1));y++) {
        for(let x=0;x<W;x++) {
          let inside=false;
          for(let i=0,j=points.length-1;i<points.length;j=i++) {
            const a=points[i],b=points[j];
            if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;
          }
          if(inside)pixels[y*W+x]=c;
        }
      }
    }
    function ellipse(cx,cy,rx,ry,c) {
      for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(H-1,Math.ceil(cy+ry));y++)
        for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(W-1,Math.ceil(cx+rx));x++)
          if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)pixels[y*W+x]=c;
    }
    function line(ax,ay,bx,by,c,width) {
      const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));
      for(let i=0;i<=n;i++) {
        const t=i/n,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
        if((width||1)>1)ellipse(x,y,width/2,width/2,c);else dot(x,y,c);
      }
    }
    return {pixels,dot,poly,ellipse,line};
  }

  function phase(value) {
    const s=String(value??'');let n=0;
    for(let i=0;i<s.length;i++)n=(n*31+s.charCodeAt(i))>>>0;
    return (n%1000)/1000;
  }

  function render(id,time,variant,options) {
    const r=raster(),settings=options||{};
    const morph=clamp(finite(settings.morph,0),0,1);
    const reduced=Boolean(settings.reduced);
    const t=reduced?0:finite(time,0),p=phase(variant);
    const px=reduced?0:clamp(finite(settings.pointerX,0),-1,1);
    const py=reduced?0:clamp(finite(settings.pointerY,0),-1,1);
    const cycle=reduced?0:((t+p)*.5)%1;
    const step=Math.sin(cycle*TAU);
    const leftFoot={x:reduced?0:Math.round(step*.85),y:reduced?0:-Math.round(Math.max(0,step)*1.2)};
    const rightFoot={x:reduced?0:-Math.round(step*.85),y:reduced?0:-Math.round(Math.max(0,-step)*1.2)};
    const headX=reduced?0:Math.sin(t*.63+p)*.55+px*.5;
    const headY=reduced?0:-.5-.65*Math.sin(t*.76+p)+py*.3;
    const headAngle=reduced?0:Math.sin(t*.54+p)*.035+px*.018;
    const blinkPhase=((t+p+1.1)%5.4+5.4)%5.4;
    const blink=!reduced&&blinkPhase>4.7&&blinkPhase<4.9;
    if(id!=='gorilla')return{width:W,height:H,pixels:r.pixels,ready:true,hitBox:{x0:9,y0:32,x1:32,y1:48}};

    // Legs move from the knee down, while the back and butt stay anchored.
    const l=leftFoot,q=rightFoot;
    r.poly([[10,45],[18,46],[21,50],[20+l.x,54+l.y],[20+l.x,58+l.y],
      [18+l.x,60+l.y],[12+l.x,60+l.y],[9+l.x,59+l.y],[9+l.x,56+l.y],[10,51]],1);
    r.poly([[24,46],[31,47],[33,51],[32+q.x,56+q.y],[34+q.x,58+q.y],
      [33+q.x,61+q.y],[26+q.x,61+q.y],[23+q.x,60+q.y],[23+q.x,56+q.y],[24,51]],1);
    r.poly([[29,16],[33,18],[35,23],[36,27],[38,31],[39,36],[39,41],[38,45],
      [39,49],[37,51],[34,52],[31,51],[31,48],[28,47],[24,47],[22,49],[20,51],
      [16,51],[12,51],[9,49],[8,46],[7,42],[6,38],[7,34],[9,31],[11,28],
      [15,25],[17,21],[20,18],[23,17],[26,15]],1);
    const silhouette=r.pixels.slice();
    // Keep an unbroken one-LED outline; dark inner planes intentionally breathe.
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
      const i=y*W+x;if(!silhouette[i])continue;
      const edge=x===0||x===W-1||y===0||y===H-1||!silhouette[i-1]||!silhouette[i+1]||!silhouette[i-W]||!silhouette[i+W];
      const rank=BAYER[(x&3)+(y&3)*4];
      r.pixels[i]=edge?1:rank<6?4:rank===8?3:0;
    }
    // A diagonal silver saddle identifies the back; regular gaps replace noise.
    const silver=raster();
    silver.poly([[27,14],[32,18],[30,22],[28,25],[26,28],[23,30],[20,32],
      [16,33],[15,30],[17,27],[19,24],[20,21],[23,18]],2);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
      const i=y*W+x;
      if(silver.pixels[i]&&silhouette[i])r.pixels[i]=(x+2*y)%5===0?0:((x+y)%4===0?3:2);
    }
    // Three short cuts describe the hanging right arm, rather than a solid slab.
    r.line(33,27,35,32,2);r.line(35,32,36,37,2);r.line(32,29,33,34,0);
    r.line(34,40,34,46,2);r.line(36,42,36,48,0);
    r.line(11+l.x,54+l.y,11+l.x,58+l.y,2);
    r.line(27+q.x,56+q.y,30+q.x,57+q.y,3);
    // The central leg gap remains open through every alternating foot frame.
    r.line(21,53,21,62,0);r.line(22,55,22,62,0);

    // Corresponding hand-set vertices give the two lobes a true geometric morph.
    const shape=butt.map((a,i)=>[a[0]+(heart[i][0]-a[0])*morph,a[1]+(heart[i][1]-a[1])*morph]);
    const voidMask=raster();voidMask.poly(shape,1);
    for(let y=31;y<49;y++)for(let x=8;x<33;x++) {
      const i=y*W+x;if(!voidMask.pixels[i])continue;
      r.pixels[i]=morph>(BAYER[(x&3)+(y&3)*4]+.5)/16?5:0;
    }

    // All facial parts share one neck transform: a local lift/turn, not a sticker spin.
    const transform=point=>{
      const dx=point[0]-31,dy=point[1]-23,c=Math.cos(headAngle),s=Math.sin(headAngle);
      return[31+dx*c-dy*s+headX,23+dx*s+dy*c+headY];
    };
    const headPoly=(points,color)=>r.poly(points.map(transform),color);
    const headLine=(a,b,c)=>{a=transform(a);b=transform(b);r.line(a[0],a[1],b[0],b[1],c);};
    headPoly([[28,8],[30,5],[34,4],[37,6],[39,9],[40,12],[42,15],[42,18],
      [43,20],[42,23],[40,26],[37,26],[35,24],[33,21],[31,19],[29,17],[27,13]],1);
    headPoly([[29,9],[32,6],[35,6],[37,8],[38,11],[37,13],[34,12],[32,14],[29,13]],4);
    headLine([29,9],[32,7],3);
    headPoly([[35,12],[38,12],[40,14],[40,16],[42,18],[41,20],[42,21],
      [40,24],[38,24],[36,22],[35,19],[33,17],[33,14]],2);
    headPoly([[31,13],[33,12],[34,14],[33,16],[31,16],[30,15]],2);
    headLine([32,14],[32,15],4);
    headLine([36,14],[39,14],4);
    if(blink)headLine([36,17],[39,17],4);
    else {
      headPoly([[36,16],[38,15],[40,17],[38,18]],4);
      const pupil=transform([38,16.5]);r.dot(pupil[0],pupil[1],1);
    }
    headLine([40,18],[41,19],4);headLine([39,22],[41,22],4);
    const shades=new Uint8Array(W*H);
    for(let i=0;i<shades.length;i++)if(r.pixels[i])shades[i]=4;
    return {width:W,height:H,pixels:r.pixels,shades,ready:true,
      hitBox:{x0:9,y0:32,x1:32,y1:48},
      motionX:reduced?0:Math.sin(t*.23+p)*.65,motionY:0,motionUnit:'native-pixel',
      motion:{leftFoot,rightFoot,head:{x:headX,y:headY,angle:headAngle},blink}};
  }

  global.PortfolioGorillaMotif={ids:['gorilla'],render};
  // Synchronous readiness: the event is informational; callers may render immediately.
  if(typeof global.dispatchEvent==='function'&&typeof CustomEvent==='function')
    global.dispatchEvent(new CustomEvent('portfolio:gorilla-ready',{detail:{id:'gorilla',width:W,height:H}}));
})(window);
