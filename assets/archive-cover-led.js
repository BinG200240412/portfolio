/* Book animation is painted into screen cells, never into moving LED geometry. */
(() => {
  'use strict';
  window.PortfolioCoverDots.register('archive', frame => {
    const {ctx,width,height,time,reduced,colors} = frame;
    const scale = Math.min(width/410,height/310);
    const yaw = -.15, pitch = .63;
    function project([x,y,z]) {
      const rx=x*Math.cos(yaw)+y*Math.sin(yaw), ry=-x*Math.sin(yaw)+y*Math.cos(yaw);
      const depth=ry*Math.sin(pitch)+z*Math.cos(pitch), p=950/(950-depth);
      return [width*.57+rx*scale*p,height*.62+(ry*Math.cos(pitch)-z*Math.sin(pitch))*scale*p];
    }
    function path(points) {
      ctx.beginPath();
      points.forEach((point,i)=>{const p=project(point);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});
    }
    function surface(points,role,alpha,outline=false) {
      path(points);ctx.closePath();ctx.globalAlpha=alpha;ctx.fillStyle=colors[role];ctx.fill();
      if(outline){ctx.globalAlpha=.85;ctx.strokeStyle=colors[1];ctx.lineWidth=1;ctx.stroke();}
    }
    function stroke(points,role=1,alpha=.6) {
      path(points);ctx.globalAlpha=alpha;ctx.strokeStyle=colors[role];ctx.lineWidth=1;ctx.stroke();
    }
    [-1,1].forEach(side=>{
      const outer=side*187;
      surface([[side*3,-124,-13],[outer,-124,-13],[outer,124,-13],[side*3,124,-13]],2,.36,true);
      [-8,-3,3].forEach((z,i)=>{
        const edge=side*181;
        surface([[side*4,-119,z],[edge,-119,z],[edge,119,z],[side*4,119,z]],1,.15+i*.05);
        stroke([[side*4,-119,z],[edge,-119,z],[edge,119,z],[side*4,119,z]],1,.55+i*.14);
      });
      // Page marks are pixel lines in the framebuffer, on the same LED lattice.
      for(let row=0;row<10;row++){
        const y=-67+row*15, end=side*(143-(row%3)*16);
        stroke([[side*24,y,5],[end,y,5]],row<2?2:0,1);
      }
    });
    stroke([[0,-123,-8],[0,123,-8]],1,.92);
    const phase=reduced?.34:(time%6.8)/6.8;
    const progress=Math.min(1,Math.max(0,(phase-.12)/.74));
    const theta=Math.PI*progress*progress*(3-2*progress);
    function leaf(u,y) {
      const bend=Math.sin(u/180*Math.PI)*Math.sin(theta)*21;
      const ripple=Math.sin(y/119*1.8+theta)*Math.sin(theta)*u/180*7;
      return [u*Math.cos(theta)+bend,y,6+u*Math.sin(theta)*.76+ripple];
    }
    // Fill the curling leaf as strips; the visible hardware remains stationary.
    for(let u=0;u<180;u+=9){
      const next=Math.min(180,u+9);
      surface([leaf(u,-119),leaf(next,-119),leaf(next,119),leaf(u,119)],1,.48);
    }
    const top=[],bottom=[];
    for(let u=0;u<=180;u+=9){top.push(leaf(u,-119));bottom.push(leaf(u,119));}
    stroke(top,1,.98);stroke(bottom,1,.98);stroke([leaf(180,-119),leaf(180,119)],1,.98);
    for(let row=0;row<10;row++){
      const line=[];
      for(let u=24;u<=144-row%3*16;u+=8)line.push(leaf(u,-67+row*15));
      stroke(line,row<2?2:0,1);
    }
    // A dark crease and a single pixel highlight keep the cropped book legible.
    path([[0,-123,8],[0,123,8]]);ctx.globalCompositeOperation='destination-out';
    ctx.globalAlpha=1;ctx.lineWidth=2;ctx.stroke();ctx.globalCompositeOperation='source-over';
    stroke([[2,-123,8],[2,123,8]],2,1);
    stroke([[-8,104,0],[-8,155,0]],3,.94);
    ctx.globalAlpha=1;
  });
})();
