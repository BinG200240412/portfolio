/* Original LED drawings informed by Liangzhu collection records, not image tracings.
 * National Museum of China: crowned deity above a beast, double-ring eyes,
 * long arms, paired symmetry, and a square cong pierced by a round bore.
 * https://www.chnmuseum.cn/zp/zpml/kgfjp/202104/t20210415_249731.shtml
 * https://www.chnmuseum.cn/zp/zpml/kgfjp/202104/t20210415_249733.shtml
 * https://www.metmuseum.org/art/collection/search/72376
 * Roles 1..4 are palette indices; shades 1..4 are discrete facet levels. */
(() => {
  'use strict';
  const SIZE = 64, TAU = Math.PI * 2;
  function raster() {
    const pixels = new Uint8Array(SIZE * SIZE), shades = new Uint8Array(SIZE * SIZE);
    function dot(x, y, role, shade = 3) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      const i = y * SIZE + x; pixels[i] = role; shades[i] = role ? shade : 0;
    }
    function rect(x, y, width, height, role, shade = 3) {
      for (let row = Math.max(0, Math.ceil(y)); row < Math.min(SIZE, y + height); row++) {
        for (let col = Math.max(0, Math.ceil(x)); col < Math.min(SIZE, x + width); col++) dot(col, row, role, shade);
      }
    }
    function ellipse(cx, cy, rx, ry, role, shade = 3) {
      if (rx <= 0 || ry <= 0) return;
      for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(SIZE - 1, Math.ceil(cy + ry)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(SIZE - 1, Math.ceil(cx + rx)); x++) {
          if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1) dot(x, y, role, shade);
        }
      }
    }
    function line(a, b, role, width = 1, shade = 3) {
      const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5));
      for (let i = 0; i <= count; i++) {
        const u = i / count, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        if (width <= 1) dot(x, y, role, shade); else ellipse(x, y, width / 2, width / 2, role, shade);
      }
    }
    function polygon(points, role, shade = 3) {
      const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
      const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
      const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p[0]))));
      const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(...points.map(p => p[0]))));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a[1] > y + .5) !== (b[1] > y + .5) && x + .5 < (b[0] - a[0]) * (y + .5 - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (inside) dot(x, y, role, shade);
      }
    }
    return { pixels, shades, dot, rect, ellipse, line, polygon };
  }

  function makeMask() {
    const r = raster();
    // Thirteen upright feather blades, with a paired, engraved crown band.
    for (let i = 0; i < 13; i++) {
      const x = 7.5 + i * 4, top = 2 + Math.abs(i - 6) * .9;
      r.polygon([[x-1.6,15],[x-1.8,top+2],[x,top],[x+1.8,top+2],[x+1.6,15]], 1);
      r.line([x,top+3],[x,13],2,1);
      if (i % 2 === 0) r.dot(x,top+2,4);
    }
    r.rect(9,15,46,2,1); r.rect(13,19,38,2,1);
    for (let x = 15; x <= 48; x += 4) r.rect(x,17,1,2,2);
    // A separate small human/deity face below the headdress.
    r.polygon([[24,21],[40,21],[38,31],[25,31]],1);
    [28,36].forEach(x => { r.ellipse(x,25,2.4,2.3,3); r.ellipse(x,25,1.1,1.1,1); });
    r.rect(31,25,2,4,2); r.line([28,30],[36,30],3,1);
    // Long arms curl down to the large beast-eye region, rather than generic horns.
    [[ [25,28],[19,27],[12,31],[10,36],[15,39],[20,38] ],
      [ [39,28],[45,27],[52,31],[54,36],[49,39],[44,38] ]].forEach(points => {
      for (let i = 1; i < points.length; i++) r.line(points[i-1],points[i],1,2);
    });
    for (let i = 0; i < 3; i++) {
      r.line([15+i*2,36],[16+i*2,39],2,1);
      r.line([49-i*2,36],[48-i*2,39],2,1);
    }
    // The lower beast is wide, with two oversized double-ring eyes and a bridge brow.
    const brow = [[4,39],[8,34],[18,32],[26,35],[32,36],[32,40],[25,38],[14,37],[8,41]];
    r.polygon(brow,1); r.polygon(brow.map(([x,y]) => [64-x,y]).reverse(),1);
    [18,46].forEach(x => {
      r.ellipse(x,43,9.4,6.7,1); r.ellipse(x,43,7.2,4.8,3);
      r.ellipse(x,43,4.3,3.9,1); r.ellipse(x,43,2.3,2.1,2);
      r.dot(x-1,42,4);
    });
    r.rect(28,37,8,2,1); r.rect(30,40,4,3,2);
    r.ellipse(32,47,3.5,2.4,1); r.ellipse(32,47,1.6,1.1,3);
    r.polygon([[19,51],[45,51],[43,57],[21,57]],1);
    r.rect(23,52,18,3,0);
    [25,29,34,38].forEach(x => r.rect(x,52,1,3,2));
    r.line([23,57],[41,57],2,1);
    // Bent lower limbs and small claw endings maintain the paired full-emblem structure.
    [[ [10,48],[7,53],[12,59],[21,60] ],
      [ [54,48],[57,53],[52,59],[43,60] ]].forEach(points => {
      for (let i = 1; i < points.length; i++) r.line(points[i-1],points[i],1,2);
    });
    [13,17,21].forEach(x => { r.line([x,59],[x-1,62],2,1); r.line([64-x,59],[65-x,62],2,1); });
    // Resolve half-pixel raster rounding into exact bilateral symmetry.
    for (let y=0;y<SIZE;y++) for (let x=0;x<SIZE/2;x++) {
      const a=y*SIZE+x,b=y*SIZE+(SIZE-1-x);
      r.pixels[b]=r.pixels[a];r.shades[b]=r.shades[a];
    }
    return r;
  }
  const mask = makeMask();

  function cong(time, variant) {
    const r = raster();
    // A short square prism. Slow yaw changes facet width, not the defining shape.
    const yaw = .37 + Math.sin(time * .28 + variant * .3) * .12;
    const tilt = .52 + Math.sin(time * .23 + .4) * .035;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    function project(x,y,z) {
      const u = x * cy + z * sy, depth = -x * sy + z * cy;
      return [32 + u * 18.5, 32 - y * ct * 18.5 + depth * st * 18.5];
    }
    const top = .65, bottom = -.66;
    const face = (points,role,shade) => r.polygon(points.map(p => project(...p)),role,shade);
    const edge = (a,b,role,width=1,shade=3) => r.line(project(...a),project(...b),role,width,shade);
    // Two visible upright faces, clearly distinct from the square top annulus.
    face([[-1,top,-1],[-1,top,1],[-1,bottom,1],[-1,bottom,-1]],2,2);
    face([[-1,top,1],[1,top,1],[1,bottom,1],[-1,bottom,1]],1,3);
    // Two horizontal grooves divide the short body into three readable registers.
    [.21,-.23].forEach(y => {
      edge([-1,y,-1],[-1,y,1],2,2,1);
      edge([-1,y,1],[1,y,1],2,2,2);
      edge([-1,y-.07,-1],[-1,y-.07,1],3,1,2);
      edge([-1,y-.07,1],[1,y-.07,1],3,1,3);
    });
    // Simplified corner-mask registers: pairs of ring eyes and short bar mouths.
    [.44,-.01,-.46].forEach(y => {
      [-.60,.60].forEach(x => {
        const p = project(x,y,1.01);
        r.ellipse(p[0],p[1],2.1,1.7,2,1);
        r.ellipse(p[0],p[1],.9,.7,3,3);
      });
      edge([-.2,y-.12,1.01],[.2,y-.12,1.01],2,1,1);
    });
    edge([-1,top,1],[-1,bottom,1],2,1,1);
    edge([-1,bottom,-1],[-1,bottom,1],2,1,1);
    edge([-1,bottom,1],[1,bottom,1],2,1,2);
    // Outer square, inner circular bore. Its dark inner wall surrounds an open centre.
    face([[-1,top,-1],[1,top,-1],[1,top,1],[-1,top,1]],3,4);
    const ring = radius => Array.from({length:40},(_,i) => project(Math.cos(i/40*TAU)*radius,top,Math.sin(i/40*TAU)*radius));
    r.polygon(ring(.62),2,1);
    const hole = ring(.45).map(([x,y]) => [x,y+1]);
    r.polygon(hole,0,0);
    // Restrained engraved lip; no glow or continuous colour gradient.
    const rim = ring(.69);
    for (let i=0;i<rim.length;i++) r.line(rim[i],rim[(i+1)%rim.length],1,1,3);
    return r;
  }

  window.PortfolioLiangzhuMotifs = {
    ids: Object.freeze(['liangzhu-mask','jade-cong']),
    render(id,time=0,variant=0) {
      const t = Number.isFinite(time) ? Math.max(0,time) : 0;
      const v = Number.isFinite(variant) ? variant : 0;
      const image = id === 'liangzhu-mask' ? mask : id === 'jade-cong' ? cong(t,v) : raster();
      return {width:SIZE,height:SIZE,pixels:image.pixels.slice(),shades:image.shades.slice()};
    },
  };
})();
