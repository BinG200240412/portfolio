/* A book made of LED points. Each leaf lifts, bends and settles around its spine. */
(() => {
  'use strict';
  const staticPoints = [];
  function edge(x0,y0,z0,x1,y1,z1,role=1,alpha=.8,step=7) {
    const n = Math.ceil(Math.hypot(x1-x0,y1-y0,z1-z0)/step);
    for (let i=0;i<=n;i++) { const t=i/n; staticPoints.push([x0+(x1-x0)*t,y0+(y1-y0)*t,z0+(z1-z0)*t,role,alpha]); }
  }
  function flatLeaf(side,z,alpha) {
    const outer = side*181;
    edge(side*6,-119,z,outer,-119,z,1,alpha);
    edge(outer,-119,z,outer,119,z,1,alpha);
    edge(outer,119,z,side*6,119,z,1,alpha);
    edge(side*6,119,z,side*6,-119,z,2,alpha);
  }
  [-1,1].forEach(side => {
    [-12,-7,-2,2].forEach((z,i) => flatLeaf(side,z,.3+i*.15));
    for (let y=-105;y<=105;y+=9) {
      for (let x=side<0?-168:14; x<=(side<0?-14:168); x+=9) {
        const row = Math.round((y+105)/9), col = Math.round(Math.abs(x)/9);
        const head = row>=2 && row<=5 && col>=5 && col<=14;
        const text = row>=9 && row<=20 && row%3===0 && col>=3 && col<=15-(row%5);
        const role = head && ((row+col)%4<2) ? 2 : text ? 1 : 0;
        staticPoints.push([x,y,3+Math.sin(Math.abs(x)/180*Math.PI)*2,role,role ? .46 : .2]);
      }
    }
  });
  edge(0,-125,-13,0,125,-13,2,.82,5);
  edge(-3,-124,2,-3,124,2,1,.74,5);
  const flipPoints = [];
  for (let y=-119;y<=119;y+=7) {
    for (let u=0;u<=180;u+=7) {
      const border = u<8 || u>172 || Math.abs(y)>110;
      const row = Math.round((y+119)/7), col = Math.round(u/7);
      const text = row>8 && row<27 && row%3===0 && col>3 && col<21-row%5;
      flipPoints.push([u,y,border ? 1 : text ? 2 : 0,border ? .96 : text ? .72 : .25]);
    }
  }
  window.PortfolioCoverDots?.register('archive', frame => {
    const {width,height,time,reduced,dot} = frame;
    const scale = Math.min(width/410,height/310);
    const yaw = -.15, pitch = .63;
    const cy = height*.62;
    function project(x,y,z) {
      const rx = x*Math.cos(yaw)+y*Math.sin(yaw);
      const ry = -x*Math.sin(yaw)+y*Math.cos(yaw);
      const sy = ry*Math.cos(pitch)-z*Math.sin(pitch);
      const depth = ry*Math.sin(pitch)+z*Math.cos(pitch);
      const p = 950/(950-depth);
      return [width*.57+rx*scale*p,cy+sy*scale*p,p];
    }
    const points = [];
    staticPoints.forEach(([x,y,z,role,a]) => { const p=project(x,y,z); points.push([p[0],p[1],1.34*scale*p[2],role,a,z+y*.45]); });
    const phase = reduced ? .34 : (time%6.8)/6.8;
    const travel = Math.min(1,Math.max(0,(phase-.12)/.74));
    const eased = travel*travel*(3-2*travel);
    const theta = Math.PI*eased;
    flipPoints.forEach(([u,y,role,a]) => {
      const bend = Math.sin(u/180*Math.PI)*Math.sin(theta)*21;
      const ripple = Math.sin((y/119)*1.8+theta)*Math.sin(theta)*(u/180)*7;
      const x = u*Math.cos(theta)+bend;
      const z = 6+u*Math.sin(theta)*.76+ripple;
      const p = project(x,y,z);
      points.push([p[0],p[1],1.4*scale*p[2],role,a,z+y*.45]);
    });
    points.sort((a,b)=>a[5]-b[5]);
    points.forEach(([x,y,r,role,a])=>dot(x,y,r,role,a));
    // A small red ribbon anchors this object in the site's existing palette.
    for(let i=0;i<12;i++) { const p=project(-8,103+i*5,0);dot(p[0],p[1],1.5*scale,3,.85-i*.03); }
  });
})();
