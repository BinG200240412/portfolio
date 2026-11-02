(() => {
'use strict';
/* A solid little red book. Paper is drawn as filled planes, not wire outlines.
 * Coordinates stay in the 41×41 source raster; the caller owns visible LEDs. */
function bookSmooth(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
function bookInside(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function bookFill(frame, vertices, role) {
  const minX = Math.max(0, Math.floor(Math.min(...vertices.map(p => p[0]))));
  const maxX = Math.min(40, Math.ceil(Math.max(...vertices.map(p => p[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...vertices.map(p => p[1]))));
  const maxY = Math.min(40, Math.ceil(Math.max(...vertices.map(p => p[1]))));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (!bookInside(x + .001, y + .001, vertices)) continue;
    const at = y * 41 + x; frame.mask[at] = 1; frame.roles[at] = role;
  }
}
function bookBack(frame) {
  // The pink-grey side and bottom are the thickness of the closed binding.
  bookFill(frame, [[14,5],[34,5],[37,8],[37,35],[18,37],[13,34],[13,8]], 2);
  bookFill(frame, [[14,6],[35,6],[35,33],[17,35],[13,33],[13,8]], 1);
  // Solid page edges between the two covers. Only one low strip is exposed.
  bookFill(frame, [[18,31],[35,29],[37,31],[37,34],[18,36]], 0);
  bookFill(frame, [[18,35],[36,33],[37,35],[18,37]], 2);
}
function bookLeaf(angle, page = 0, width = 16) {
  const sine = Math.sin(angle), cosine = Math.cos(angle);
  const rootTop = 7 + page * .35, rootBottom = 33 - page * .2;
  const edgeX = 18 + width * cosine;
  return [[18,rootTop],[edgeX,rootTop - sine * 5],[edgeX,rootBottom - sine * 3],[18,rootBottom]];
}
function bookCover(frame, angle) {
  const sine = Math.sin(angle), cosine = Math.cos(angle);
  const vertices = [[18,5],[18 + 17 * cosine,5 - sine * 3],[18 + 17 * cosine,32 - sine * 2],[18,34]];
  bookFill(frame, vertices, 1);
  // The bookmark belongs to the front of the cover and foreshortens with it.
  if (cosine > .08) {
    const point = (u, v) => [18 + u * cosine, 5 + v - sine * 3 * u / 17];
    const mark = [[5,5],[10,5],[10,16],[7.5,13.5],[5,16]].map(p => point(p[0], p[1]));
    // Intersect the mark with the filled cover so it can never float outside.
    for (let y = 0; y < 41; y++) for (let x = 0; x < 41; x++) {
      if (bookInside(x + .001, y + .001, vertices) && bookInside(x + .001, y + .001, mark)) {
        frame.mask[y * 41 + x] = 1; frame.roles[y * 41 + x] = 0;
      }
    }
  }
}
function bookSpine(frame) {
  bookFill(frame, [[13,8],[17,5],[18,34],[15,36],[13,34]], 2);
  bookFill(frame, [[15,8],[17,7],[17,33],[15,34]], 1);
}
function bookRest(frame) {
  bookBack(frame); bookCover(frame, 0); bookSpine(frame);
  return frame;
}
function bookAction(frame, t) {
  if (t <= .06 || t >= .96) return bookRest(frame);
  const radians = Math.PI / 180;
  const coverOpen = bookSmooth((t - .06) / .20) * (1 - bookSmooth((t - .74) / .21));
  const coverAngle = coverOpen * 164 * radians;
  bookBack(frame);
  // A leftward cover is behind the pages; a rightward cover occludes them.
  // The drawing-order swap happens edge-on, where the cover has zero area.
  if (coverAngle >= Math.PI / 2) bookCover(frame, coverAngle);
  // Right-hand stock stays visible behind the individual moving leaves.
  bookFill(frame, [[18,7],[34,7],[34,30],[18,33]], 0);
  bookFill(frame, [[23,13],[30,13],[30,15],[23,15]], 2);
  bookFill(frame, [[21,19],[29,19],[29,21],[21,21]], 2);
  const fan = [164,139,113,88].map((target, index) => {
    const opening = bookSmooth((t - .10 - index * .045) / .34);
    const closing = 1 - bookSmooth((t - .72 - index * .018) / .19);
    return { angle: target * opening * closing * radians, index };
  });
  // Extended leaves are behind the more upright leaves. Four broad paper faces
  // can be seen at once as a fan outside the spine, each with a hard colour edge.
  fan.sort((a,b) => b.angle - a.angle);
  for (const page of fan) bookFill(frame, bookLeaf(page.angle, page.index, 16 - page.index * .25), page.index % 2 ? 0 : 2);
  if (coverAngle < Math.PI / 2) bookCover(frame, coverAngle);
  bookSpine(frame);
  return frame;
}

const rest={mask:new Float32Array(1681),roles:new Uint8Array(1681)};bookRest(rest);
window.PortfolioContactBook=Object.freeze({rest,paint:bookAction,bounds:{left:2,top:3,right:36,bottom:36}});
})();

/* One folded envelope: rear flap, letter, side folds and front pocket.
 * Unlit pocket interiors still hide the letter; the open flap stays behind it. */
(() => {
  'use strict';
  const size=41,count=size*size;
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const line=(x,y,ax,ay,bx,by,width=1.65)=>{
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=width/2;
  };
  const inside=(x,y,points)=>{
    let hit=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  };
  const left=[[4,10],[20,22],[4,31]],right=[[36,10],[20,22],[36,31]],front=[[4,31],[20,18],[36,31]];
  function paint(frame,t){
    frame.mask.fill(0);frame.roles.fill(0);frame.layers=new Uint8Array(count);
    const opening=smooth(t/.20),insertion=smooth((t-.30)/.38),closing=smooth((t-.72)/.20);
    const tip=t<.20?22-20*opening:2+20*closing;
    const paperTop=Math.round(2+22*insertion),paperVisible=t>=.23&&t<.72;
    const flap=[[5,11],[20,tip],[35,11]],folded=tip>=11;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const at=y*size+x;
      let role=-1,alpha=1,layer=0;
      const put=(r,a,l)=>{role=r;alpha=a;layer=l;};
      const clear=()=>{role=-1;alpha=1;layer=0;};
      const flapEdge=line(x,y,5,11,20,tip)||line(x,y,20,tip,35,11)||line(x,y,5,11,35,11,1.3);
      // The complete open sealing flap includes its face and its hinge.
      if(!folded){
        if(inside(x,y,flap))put(1,.45,3);
        if(flapEdge)put(1,1,3);
      }
      // Paper is above the rear flap but below all three front folds.
      if(paperVisible&&x>=12&&x<=28&&y>=paperTop&&y<=paperTop+13&&y<31){
        const writing=y===paperTop+4&&x>=15&&x<=25||y===paperTop+7&&x>=15&&x<=22;
        const edge=x===12||x===28||y===paperTop||y===paperTop+13;
        // Paper has its own ivory and ink roles, independent of theme neutrals.
        put(writing||edge?4:3,1,1);
      }
      const inBody=x>=4&&x<=36&&y>=10&&y<=31;
      const frontCoverage=inBody&&(inside(x+.001,y+.001,left)||inside(x-.001,y+.001,right)||inside(x,y-.001,front));
      if(frontCoverage)clear();
      const outline=line(x,y,4,11,4,30)||line(x,y,5,31,35,31)||line(x,y,36,11,36,30)||Math.hypot(x-5,y-11)<1||Math.hypot(x-35,y-11)<1;
      // The lower triangle is a complete connected fold, even with the lid open.
      const bottomFold=line(x,y,5,30,20,18,1.4)||line(x,y,20,18,35,30,1.4);
      const leftJoin=line(x,y,5,11,20,22,1.4)&&x<17;
      const rightJoin=line(x,y,20,22,35,11,1.4)&&x>23;
      if(inBody&&(outline||bottomFold||leftJoin||rightJoin))put(outline?0:1,1,2);
      // Closing flap becomes the front layer only after the paper is inside.
      if(folded){
        if(inside(x,y,flap))clear();
        if(flapEdge&&y>=10)put(1,1,5);
      }
      if(t>=.93&&Math.hypot(x-20,y-23)<=1.1)put(2,1,4);
      if(role>=0){frame.mask[at]=alpha;frame.roles[at]=role;frame.layers[at]=layer;}
    }
    return frame;
  }
  const rest={mask:new Float32Array(count),roles:new Uint8Array(count)};paint(rest,1);
  window.PortfolioContactEnvelope=Object.freeze({rest,paint});
})();

/* Native 41 × 41 LED masks. Every "1" is one equally sized circular bead. */
(() => {
  'use strict';
  const size = 41;
  const segmentDistance = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  const line = (x, y, ax, ay, bx, by, width = 1.8) => segmentDistance(x, y, ax, ay, bx, by) <= width / 2;
  const circle = (x, y, cx, cy, radius, width = 1.8) => Math.abs(Math.hypot(x - cx, y - cy) - radius) <= width / 2;
  const roundedRectDistance = (x, y, left, top, right, bottom, radius) => {
    const qx = Math.abs(x - (left + right) / 2) - (right - left) / 2 + radius;
    const qy = Math.abs(y - (top + bottom) / 2) - (bottom - top) / 2 + radius;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  };
  const roundedRect = (x, y, left, top, right, bottom, radius, width = 1.8) => Math.abs(roundedRectDistance(x, y, left, top, right, bottom, radius)) <= width / 2;
  const polygon = (x, y, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  };
  const make = (id, paint) => ({
    id,
    rows: Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => paint(x, y) ? '1' : '0').join('')),
  });
  const phoneOutline = [[9,5],[6,6],[4,10],[5,16],[8,23],[14,29],[21,34],[28,36],[33,35],[36,31],[35,28],[28,24],[25,27],[22,26],[17,22],[13,17],[12,14],[15,11],[12,5]];
  const glyphs = [
    make('email', (x, y) => !!window.PortfolioContactEnvelope.rest.mask[y * size + x]),
    make('phone', (x, y) => polygon(x, y, phoneOutline)),
    // A filled cover, binding and page block.
    make('xiaohongshu', (x, y) => !!window.PortfolioContactBook.rest.mask[y * size + x]),
    make('x', (x, y) =>
      polygon(x, y, [[7,6],[14,6],[34,35],[27,35]]) ||
      line(x, y, 32, 6, 8, 35, 1.9)),
    make('instagram', (x, y) =>
      roundedRect(x, y, 6, 6, 34, 34, 8, 2) ||
      circle(x, y, 20, 20, 7, 2) || Math.hypot(x - 29, y - 11) <= 1.4),
    make('douyin', (x, y) => {
      const bowl = Math.abs(Math.hypot((x - 15.5) / 1.12, y - 29) - 6.1) <= 1.8;
      return bowl || (x >= 21 && x <= 25 && y >= 5 && y <= 28) ||
        polygon(x, y, [[25,5],[27,9],[30,12],[35,13],[35,18],[30,17],[25,14]]);
    }),
  ];
  window.PortfolioContactGlyphs = { size, glyphs };
})();

/* Semantic animations are authored in the icon's 41 × 41 framebuffer.
 * get(id) generates one short action on demand. The visible LED grid is owned
 * by the contact renderer; these frames contain no DOM, sprites or timing. */
(() => {
  'use strict';
  const size = 41, count = size * size, length = 21, cache = new Map();
  const glyphs = new Map((window.PortfolioContactGlyphs?.glyphs || []).map(g => [g.id, g.rows.join('')]));
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const distance = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  const line = (x, y, ax, ay, bx, by, thickness = 1.6) => distance(x, y, ax, ay, bx, by) <= thickness / 2;
  const circle = (x, y, cx, cy, radius, thickness = 1.8) => Math.abs(Math.hypot(x - cx, y - cy) - radius) <= thickness / 2;
  const rectDistance = (x, y, l, t, r, b, radius) => {
    const qx = Math.abs(x - (l + r) / 2) - (r - l) / 2 + radius;
    const qy = Math.abs(y - (t + b) / 2) - (b - t) / 2 + radius;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  };
  const rect = (x, y, l, t, r, b, radius, thickness = 1.8) => Math.abs(rectDistance(x, y, l, t, r, b, radius)) <= thickness / 2;
  const polygon = (x, y, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  };
  const arc = (x, y, cx, cy, radius, start, end, thickness = 1.4) => {
    if (!circle(x, y, cx, cy, radius, thickness)) return false;
    let a = Math.atan2(y - cy, x - cx); if (a < 0) a += Math.PI * 2;
    return a >= start && a <= end;
  };
  function tone(id, x, y) {
    if (id === 'email') return window.PortfolioContactEnvelope.rest.roles[y * size + x];
    if (id === 'phone') return y < 12 || x > 24 && y > 26 ? 2 : (x > 12 && y < 28 ? 1 : 0);
    if (id === 'xiaohongshu') return window.PortfolioContactBook.rest.roles[y * size + x];
    if (id === 'x') return Math.abs(x + y - 40) < 3 ? 2 : 1;
    if (id === 'instagram') return x >= 11 && x <= 29 && y >= 11 && y <= 29 ? (x > 26 && y < 14 ? 2 : 0) : 1;
    return y >= 24 && x <= 21 ? 2 : (x >= 21 && x < 30 ? 1 : 0);
  }
  const blank = () => ({ mask: new Float32Array(count), roles: new Uint8Array(count) });
  function raster(frame, paint) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const role = paint(x, y); if (role < 0) continue;
      const at = y * size + x; frame.mask[at] = 1; frame.roles[at] = role;
    }
  }
  function base(id) {
    const frame = blank(), source = glyphs.get(id);
    if (!source) return frame;
    for (let i = 0; i < count; i++) if (source[i] === '1') { frame.mask[i] = 1; frame.roles[i] = tone(id, i % size, Math.floor(i / size)); }
    return frame;
  }
  function stamp(frame, id, dx = 0, dy = 0, angle = 0) {
    const source = glyphs.get(id), cos = Math.cos(angle), sin = Math.sin(angle);
    if (!source) return;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = x - 20 - dx, py = y - 20 - dy;
      const sx = Math.round(px * cos + py * sin + 20), sy = Math.round(-px * sin + py * cos + 20);
      if (sx < 0 || sy < 0 || sx >= size || sy >= size || source[sy * size + sx] !== '1') continue;
      const at = y * size + x; frame.mask[at] = 1; frame.roles[at] = tone(id, sx, sy);
    }
  }
  const actions = {
    email(frame, t) {
      window.PortfolioContactEnvelope.paint(frame,t);
    },
    phone(frame, t) {
      // The receiver is immutable. Only two separate sound arcs travel outwards.
      const receiver=base('phone');frame.mask.set(receiver.mask);frame.roles.set(receiver.roles);
      if(t<.08||t>.92)return;
      const phase=(t-.08)/.84;
      raster(frame,(x,y)=>{
        // Keep an empty cell between every wave and the receiver's geometry.
        for(let yy=Math.max(0,y-1);yy<=Math.min(size-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(size-1,x+1);xx++)if(receiver.mask[yy*size+xx])return -1;
        const first=phase<=.82&&arc(x,y,16,18,6+clamp(phase/.82)*6,-1.45+Math.PI*2,-.18+Math.PI*2,1.25);
        const second=phase>=.22&&arc(x,y,16,18,10+clamp((phase-.22)/.78)*6,-1.45+Math.PI*2,-.18+Math.PI*2,1.25);
        return first?1:second?0:-1;
      });
    },
    xiaohongshu(frame, t) { window.PortfolioContactBook.paint(frame,t); },
    x(frame, t) {
      // The two strokes take opposite one-cell steps, then lock together again.
      const shift = t < .18 || t > .84 ? 0 : Math.round(Math.sin((t - .18) / .66 * Math.PI * 2));
      const band = 6 + clamp((t - .08) / .82) * 30;
      raster(frame, (x, y) => {
        const heavy = polygon(x - shift, y, [[7,6],[14,6],[34,35],[27,35]]);
        const crossing = line(x + shift, y, 32, 6, 8, 35, 1.9);
        if (crossing) return Math.abs(y - (41 - band)) < 4 ? 0 : 2;
        if (heavy) return Math.abs(y - band) < 4 ? 2 : 1;
        return -1;
      });
    },
    instagram(frame, t) {
      // Six discrete shutter blades close around a shrinking hexagonal opening.
      const closing = Math.sin(Math.PI * smooth(t)) ** 4;
      const opening = 6.5 - closing * 5.5;
      raster(frame, (x, y) => {
        const dx = x - 20, dy = y - 20, radius = Math.hypot(dx, dy);
        if (rect(x, y, 6, 6, 34, 34, 8, 2)) return 1;
        if (circle(x, y, 20, 20, 7, 2)) return 0;
        if (Math.hypot(x - 29, y - 11) <= 1.4) return 2;
        if (closing > .04 && radius < 7) {
          const angle = (Math.atan2(dy, dx) + Math.PI * 2 + closing * .3) % (Math.PI * 2);
          const sector = Math.PI / 3, local = angle % sector - sector / 2;
          const inner = opening / Math.cos(local);
          if (radius >= inner && Math.abs(local) > .055) return Math.floor(angle / sector) % 2 ? 0 : 1;
        }
        if (t >= .43 && t <= .62) {
          const reach = t < .53 ? 3 : 2;
          if (line(x, y, 35 - reach, 4, 35 + reach, 4, 1.3) || line(x, y, 35, 4 - reach, 35, 4 + reach, 1.3)) return 2;
        }
        return -1;
      });
    },
    douyin(frame, t) {
      // A short bass bounce; two rhythm strokes answer at different heights.
      const jump = Math.round(Math.sin(Math.PI * t) * (1 + .8 * Math.sin(t * Math.PI * 3) ** 2));
      stamp(frame, 'douyin', 0, -jump);
      if (t < .12 || t > .87) return;
      const a = 1 + Math.round(Math.abs(Math.sin(t * Math.PI * 3)) * 4);
      const b = 1 + Math.round(Math.abs(Math.sin(t * Math.PI * 3 - Math.PI / 3)) * 4);
      raster(frame, (x, y) => {
        if (line(x, y, 3, 21 - a, 3, 21 + a, 1.3)) return 1;
        if (line(x, y, 38, 24 - b, 38, 24 + b, 1.3)) return 2;
        return -1;
      });
    },
  };
  // Offline-measured union of every action frame, including the exact rest glyph.
  // Constant bounds let the page reserve motion space before any action is generated.
  const bounds = {"email":{"left":4,"top":2,"right":36,"bottom":31},"phone":{"left":4,"top":2,"right":35,"bottom":35},"xiaohongshu":{"left":2,"top":3,"right":36,"bottom":36},"x":{"left":6,"top":6,"right":34,"bottom":35},"instagram":{"left":5,"top":1,"right":38,"bottom":35},"douyin":{"left":3,"top":3,"right":38,"bottom":36}};
  function get(id) {
    if (cache.has(id)) return cache.get(id);
    if (!glyphs.has(id) || !actions[id]) return [];
    const frameCount=id==='email'||id==='xiaohongshu'?31:length;
    const frames = Array.from({ length:frameCount }, (_, i) => {
      if (i === 0 || i === frameCount - 1) return base(id);
      const frame = blank(); actions[id](frame, i / (frameCount - 1)); return frame;
    });
    cache.set(id, frames); return frames;
  }
  window.PortfolioContactMotion = Object.freeze({ size, get, bounds });
})();


/* Contact stickers share one physical LED screen. Pictures may sway inside
   the framebuffer; the final bulbs always stay on the same hardware grid. */
(() => {
 'use strict';
 const page=document.getElementById('contact-page');if(!page)return;
 const canvas=page.querySelector('.contact-matrix'),ctx=canvas.getContext('2d',{alpha:true});
 const stage=page.querySelector('.contact-stage'),hits=page.querySelector('.contact-stickers');
 const copy=page.querySelector('.contact-copy'),heading=page.querySelector('h1'),value=page.querySelector('.contact-value');
 const open=page.querySelector('.contact-open'),button=page.querySelector('.contact-copy-value'),status=page.querySelector('.contact-feedback');
 const channels=window.PortfolioContactChannels||[],size=window.PortfolioContactGlyphs.size,count=size*size;
 if(!ctx||!channels.length)return;
 const glyphs=Object.fromEntries(window.PortfolioContactGlyphs.glyphs.map(g=>[g.id,Float32Array.from(g.rows.join(''),Number)]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const controls=[],bounds={};
 let width=0,height=0,ratio=1,pitch=3,columns=1,rows=1,placements=[];
 let boardInk=new Uint8Array(1),boardLight=new Float32Array(1),sprites=[],paperSprites=[],paletteTheme='';
 let frame=0,lastTick=0,time=0,live=false,selected=0,active=-1,hover=-1,generation=0,typing=null,textTimer=0,textEpoch=0,frames=0;
 const pulseStarts=new Float64Array(channels.length);pulseStarts.fill(-10);
 const english=()=>window.PortfolioI18n?.language==='en';
 const label=c=>c.label[english()?'en':'zh'];
 function tone(id,x,y){
  if(id==='email')return window.PortfolioContactEnvelope.rest.roles[y*size+x];
  if(id==='phone')return y<12||x>24&&y>26?2:(x>12&&y<28?1:0);
  if(id==='xiaohongshu')return window.PortfolioContactBook.rest.roles[y*size+x];
  if(id==='x')return Math.abs(x+y-40)<3?2:1;
  if(id==='instagram')return x>=11&&x<=29&&y>=11&&y<=29?(x>26&&y<14?2:0):1;
  return y>=24&&x<=21?2:(x>=21&&x<30?1:0);
 }
 const roleMaps={};
 for(const channel of channels){
  const id=channel.id;roleMaps[id]=Uint8Array.from({length:count},(_,i)=>tone(id,i%size,Math.floor(i/size)));
 }
 // Flat, object-specific colours. Light mode uses deeper inks for the same roles.
 const colourways={
  email:[['#8ea8ba','#c78e80'],['#426e89','#a75546']],
  phone:[['#9caf9a','#c4ac82'],['#4d7059','#8b6c3d']],
  xiaohongshu:[['#d27061','#70424b'],['#bd4b41','#513544']],
  x:[['#94a8b8','#ada1be'],['#4b6a80','#77628c']],
  instagram:[['#c193ac','#c3ab81'],['#9c607e','#8b6e3c']],
  douyin:[['#8fada9','#c08f91'],['#3e7974','#9e5e64']],
 };

 const safeHref=c=>{if(!c?.href?.trim())return '';try{const u=new URL(c.href,location.href);return ['https:','mailto:','tel:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
 const available=()=>live&&!document.hidden&&page.classList.contains('live');
 for(const c of channels){
  let left=size,top=size,right=0,bottom=0;
  glyphs[c.id].forEach((v,i)=>{if(!v)return;const x=i%size,y=Math.floor(i/size);left=Math.min(left,x-.5);top=Math.min(top,y-.5);right=Math.max(right,x+.5);bottom=Math.max(bottom,y+.5);});
  const actionBounds=window.PortfolioContactMotion.bounds[c.id];
  bounds[c.id]=actionBounds?{left:actionBounds.left-.5,top:actionBounds.top-.5,right:actionBounds.right+.5,bottom:actionBounds.bottom+.5}:{left,top,right,bottom};
 }
 function makeSprite(colour){
  const c=document.createElement('canvas');c.width=c.height=24;const p=c.getContext('2d');p.fillStyle=colour;p.beginPath();p.arc(12,12,6,0,Math.PI*2);p.fill();return c;
 }
 function refreshPalettes(){
  const theme=document.documentElement.dataset.theme==='light'?'light':'dark';if(theme===paletteTheme)return;
  paletteTheme=theme;const variant=theme==='light'?1:0;sprites=[null];
  channels.forEach(c=>{
   const neutral=c.id==='xiaohongshu'?(theme==='light'?'#b49c6d':'#e7d4aa'):(theme==='light'?'#30332f':'#e0dfd9');
   [neutral,...colourways[c.id][variant]].forEach(colour=>sprites.push(makeSprite(colour)));
  });
  paperSprites=[];
  for(const colour of theme==='light'?['#fff9eb','#537083']:['#f1e4c8','#6e8490']){
   paperSprites.push(sprites.length);sprites.push(makeSprite(colour));
  }
 }
 function labels(){
  hits.setAttribute('aria-label',english()?'Contact channels':'联系方式');
  controls.forEach((control,i)=>control.setAttribute('aria-label',english()?`Select ${label(channels[i])}`:`选择${label(channels[i])}`));
 }
 channels.forEach((channel,index)=>{
  const control=document.createElement('button');control.type='button';control.className='contact-sticker-hit';control.dataset.contactChannel=channel.id;
  control.setAttribute('aria-controls','contact-title');controls.push(control);hits.append(control);
  control.addEventListener('click',()=>change(index));
  const enter=()=>{hover=index;if(available())pulseStarts[index]=time;};
  const leave=()=>{if(hover===index)hover=-1;};
  control.addEventListener('mouseenter',enter);control.addEventListener('mouseleave',leave);control.addEventListener('focus',enter);control.addEventListener('blur',leave);
 });
 // Independent text tracks use the homepage's erase-and-type rhythm.
 // Invisible complete labels reserve their final layout throughout typing.
 function makeTrack(element,typeDelay,eraseDelay){
  const current=element.textContent.trim(),ghosts=channels.map(()=>{const e=document.createElement('span');e.className='contact-type-reserve';e.setAttribute('aria-hidden','true');return e;});
  const visible=document.createElement('span');visible.className='contact-type-text';visible.setAttribute('aria-hidden','true');visible.textContent=current;element.replaceChildren(...ghosts,visible);
  return {element,ghosts,visible,typeDelay,eraseDelay,current:Array.from(current),target:[],due:0};
 }
 const titleTrack=makeTrack(heading,130,70),valueTrack=makeTrack(value,45,25),tracks=[titleTrack,valueTrack];
 function cancelTyping(){clearTimeout(textTimer);textTimer=0;textEpoch++;typing=null;copy.setAttribute('aria-busy','false');}
 function finishTyping(epoch){
  if(epoch!==textEpoch||!available())return;clearTimeout(textTimer);textTimer=0;typing=null;
  const c=channels[active],href=safeHref(c),filled=!!c.value&&!!href;
  if(filled){value.href=open.href=href;value.removeAttribute('aria-disabled');}else{value.removeAttribute('href');open.removeAttribute('href');value.setAttribute('aria-disabled','true');}
  const external=filled&&href.startsWith('https:');
  for(const el of [open,value]){if(external){el.target='_blank';el.rel='noopener noreferrer';}else{el.removeAttribute('target');el.removeAttribute('rel');}}
  open.hidden=button.hidden=!filled;button.disabled=!filled;copy.setAttribute('aria-busy','false');page.dataset.contactTyping='false';page.dataset.contactTransition='idle';
 }
 function pumpTyping(epoch){
  textTimer=0;if(epoch!==textEpoch||!available()||!typing)return;const now=performance.now();let done=true,nextDue=Infinity;
  for(const track of tracks){
   const same=track.current.length===track.target.length&&track.current.every((c,i)=>c===track.target[i]);if(same)continue;
   done=false;if(now>=track.due){
    let prefix=0;while(prefix<track.current.length&&prefix<track.target.length&&track.current[prefix]===track.target[prefix])prefix++;
    const erase=track.current.length>prefix;if(erase)track.current.pop();else track.current.push(track.target[track.current.length]);
    track.visible.textContent=track.current.join('');track.due=now+(erase?track.eraseDelay:track.typeDelay);
   }
   nextDue=Math.min(nextDue,track.due);
  }
  if(done){finishTyping(epoch);return;}textTimer=setTimeout(()=>pumpTyping(epoch),Math.max(8,nextDue-performance.now()));
 }
 function showInfo(index,{animate=true}={}){
  if(index===active)return;cancelTyping();active=index;generation++;
  const c=channels[index],href=safeHref(c),filled=!!c.value&&!!href,epoch=textEpoch;
  page.dataset.contactActive=c.id;heading.setAttribute('aria-label',label(c));value.setAttribute('aria-label',c.value||'');
  tracks.forEach((track,j)=>channels.forEach((item,i)=>track.ghosts[i].textContent=j===0?label(item):item.value||''));
  titleTrack.target=Array.from(label(c));valueTrack.target=Array.from(c.value||'');
  value.removeAttribute('href');open.removeAttribute('href');value.setAttribute('aria-disabled','true');open.hidden=button.hidden=true;button.disabled=true;status.textContent='';
  open.querySelector('span').textContent=english()?(c.id==='email'?'Send email':c.id==='phone'?'Call':'Open profile'):(c.id==='email'?'发邮件':c.id==='phone'?'拨打电话':'打开主页');
  button.querySelector('span').textContent=english()?(c.id==='email'?'Copy email':c.id==='phone'?'Copy number':'Copy handle'):(c.id==='email'?'复制邮箱':c.id==='phone'?'复制号码':'复制账号');
  controls.forEach((control,i)=>{control.classList.toggle('is-current',i===index);control.setAttribute('aria-pressed',String(i===index));});
  if(reduced.matches||!animate){for(const track of tracks){track.current=track.target.slice();track.visible.textContent=track.current.join('');}finishTyping(epoch);return;}
  for(const track of tracks){track.current=Array.from(track.visible.textContent);track.due=performance.now()+15;}
  typing={epoch};copy.setAttribute('aria-busy','true');page.dataset.contactTyping='true';page.dataset.contactTransition='running';pumpTyping(epoch);
 }
 function boxFor(p){
  const b=bounds[p.id],out={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
  for(const x of [b.left,b.right])for(const y of [b.top,b.bottom]){
   const u=(x-20)*p.scale,v=(y-20)*p.scale,px=p.x+u*p.cos-v*p.sin,py=p.y+u*p.sin+v*p.cos;
   out.left=Math.min(out.left,px);out.right=Math.max(out.right,px);out.top=Math.min(out.top,py);out.bottom=Math.max(out.bottom,py);
  }
  return out;
 }
 const intersects=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
 function measure(){
  if(!available())return;
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;ratio=Math.min(devicePixelRatio||1,1.5);
  const unit=width<700?width:Math.min(width,height);pitch=Math.max(3,unit/170);columns=Math.ceil(width/pitch);rows=Math.ceil(height/pitch);
  boardInk=new Uint8Array(columns*rows);boardLight=new Float32Array(columns*rows);
  const w=Math.round(width*ratio),h=Math.round(height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const mobile=width<700,landscape=height<560&&width>=540;
  const compact=Math.min(1,height/780);
  let specs;
  if(landscape)specs=[[.16,.27,.31,-.12],[.83,.25,.26,.10],[.31,.88,.16,-.08],[.15,.63,.105,.08],[.85,.64,.20,-.10],[.68,.89,.13,.13]];
  else if(mobile)specs=[[.29,.20,.59,-.12],[.81,.27,.38,.10],[.80,.74,.31,-.08],[.72,.125,.14,.10],[.20,.77,.32,-.13],[.52,.91,.23,.10]];
  else specs=[[.15,.24,.46,-.12],[.83,.21,.34,.10],[.83,.73,.25,-.08],[.48,.13,.10,.10],[.19,.75,.27,-.12],[.51,.85,.16,.12]];
  if(!mobile&&!landscape&&width<1100)specs[3]=[.55,.13,.10,.10];
  if(mobile&&!landscape&&height<740){
   specs[0]=[.29,.20,.49,-.12];specs[1]=[.84,.24,.32,.10];specs[2]=[.80,.74,.29,-.08];specs[3]=[.59,.275,.10,.10];specs[4]=[.20,.77,.29,-.13];specs[5]=[.52,.91,.19,.10];
  }
  const multiplier=mobile&&!landscape?compact:1,artUnit=landscape?Math.min(width,height):unit;
  const text=copy.getBoundingClientRect(),clear={left:text.left-rect.left-14,right:text.right-rect.left+14,top:text.top-rect.top-14,bottom:text.bottom-rect.top+14};
  placements=specs.map((s,i)=>{
   const p={id:channels[i].id,x:s[0]*width,y:s[1]*height,scale:s[2]*artUnit*multiplier/size,angle:s[3],phase:i*1.71};p.cos=Math.cos(p.angle);p.sin=Math.sin(p.angle);
   // Move a whole sticker away from the actual copy. Never crop a rectangle out of it.
   for(let pass=0;pass<5;pass++){
    let b=boxFor(p);
    if(intersects(b,clear)){p.y+=p.y<height*.5?clear.top-b.bottom:clear.bottom-b.top;b=boxFor(p);}
    const dx=Math.max(14-b.left,0)-Math.max(b.right-(width-14),0),dy=Math.max(70-b.top,0)-Math.max(b.bottom-(height-14),0);p.x+=dx;p.y+=dy;
    const fitted=boxFor(p);
    if(pass===2&&intersects(fitted,clear)){
     const above=p.y<height*.5,bandTop=above?70:clear.bottom,bandBottom=above?clear.top:height-14;
     p.scale*=Math.min(1,Math.max(32,bandBottom-bandTop)/(fitted.bottom-fitted.top))*.96;
     const smaller=boxFor(p);p.y+=(bandTop+bandBottom-smaller.top-smaller.bottom)/2;
    }
   }
   const b=boxFor(p);p.box=b;
   const hit=controls[i],hitWidth=Math.max(44,b.right-b.left+14),hitHeight=Math.max(44,b.bottom-b.top+14);hit.style.left=`${(b.left+b.right-hitWidth)/2}px`;hit.style.top=`${(b.top+b.bottom-hitHeight)/2}px`;hit.style.width=`${hitWidth}px`;hit.style.height=`${hitHeight}px`;
   return p;
  });
  canvas.dataset.ledGridPitch=pitch.toFixed(6);canvas.dataset.ledDiameter=(pitch*.7).toFixed(6);canvas.dataset.contactGlyphs=String(placements.length);
  refreshPalettes();paint();
 }
 function paint(){
  if(!available()||!width||!placements.length)return;
  boardInk.fill(0);boardLight.fill(0);const playing=[];
  for(let n=0;n<placements.length;n++){
   const p=placements[n],id=p.id,phase=p.phase;
   const still=reduced.matches||id==='phone';
   const dx=still?0:Math.sin(time*.58+phase)*2.8,dy=still?0:Math.cos(time*.46+phase)*3.2;
   const angle=p.angle+(still?0:Math.sin(time*.43+phase)*.013);
   const cos=Math.cos(angle),sin=Math.sin(angle),age=time-pulseStarts[n];
   const autoAge=time-[4.5,1.0,7.5,10.5,13.5,16.5][n];
   const duration=id==='email'||id==='xiaohongshu'?1.8:1.4;
   const hoverAge=hover===n&&age>=0?age%(duration+1):age;
   const actionAge=hoverAge>=0&&hoverAge<duration?hoverAge:(autoAge>=0?autoAge%21:-1);
   let mask=glyphs[id],roles=roleMaps[id];
   if(!reduced.matches&&actionAge>=0&&actionAge<duration){
    const frames=window.PortfolioContactMotion.get(id),index=Math.min(frames.length-1,Math.floor(actionAge/duration*(frames.length-1)));
    if(frames[index]){mask=frames[index].mask;roles=frames[index].roles;playing.push(id+':'+index);}
   }
   const box=p.box,pad=10;
   for(let r=Math.max(0,Math.floor((box.top-pad)/pitch));r<Math.min(rows,Math.ceil((box.bottom+pad)/pitch));r++){
    const py=(r+.5)*pitch-p.y-dy;
    for(let c=Math.max(0,Math.floor((box.left-pad)/pitch));c<Math.min(columns,Math.ceil((box.right+pad)/pitch));c++){
     const px=(c+.5)*pitch-p.x-dx,x=Math.round((px*cos+py*sin)/p.scale+20),y=Math.round((-px*sin+py*cos)/p.scale+20);
     if(x<0||y<0||x>=size||y>=size)continue;const at=y*size+x;if(!mask[at])continue;
     const shade=roles[at]===0?.83:roles[at]===2?.94:1;
     const light=mask[at]*shade*(n===selected||hover===n?1:.82),cell=r*columns+c;
     if(light>=boardLight[cell]){boardLight[cell]=light;boardInk[cell]=id==='email'&&roles[at]>=3?paperSprites[roles[at]-3]:1+n*3+roles[at];}
    }
   }
   controls[n].style.transform=`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);const dotSize=pitch*1.4;let lit=0;
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
   const at=r*columns+c,ink=boardInk[at];if(!ink)continue;
   ctx.globalAlpha=boardLight[at]*.94;ctx.drawImage(sprites[ink],(c+.5)*pitch-dotSize/2,(r+.5)*pitch-dotSize/2,dotSize,dotSize);lit++;
  }
  ctx.globalAlpha=1;canvas.dataset.ledFrame=String(++frames);canvas.dataset.ledTime=time.toFixed(3);canvas.dataset.ledPoints=String(lit);canvas.dataset.contactActions=playing.join(',');
 }
 function tick(now){
  frame=0;if(!available())return;
  if(!lastTick||now-lastTick>=49){
   if(lastTick)time+=Math.min(.10,(now-lastTick)/1000);lastTick=now;
   paint();
  }
  if(!reduced.matches)frame=requestAnimationFrame(tick);
 }
 function run(){if(available()&&!frame){canvas.dataset.ledRunning=String(!reduced.matches);if(reduced.matches)paint();else frame=requestAnimationFrame(tick);}}
 function change(index){
  if(!available())return;index=(index+channels.length)%channels.length;pulseStarts[index]=time;
  if(copy.contains(document.activeElement))controls[index].focus({preventScroll:true});
  if(index!==selected||active!==index){selected=index;showInfo(index);}
  run();
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;lastTick=0;cancelTyping();hover=-1;pulseStarts.fill(-10);generation++;status.textContent='';copy.inert=false;copy.style.opacity='1';page.dataset.contactTransition='idle';page.dataset.contactTyping='false';canvas.dataset.ledRunning='false';}
 function activate(event){
  // The first pageshow follows deferred startup; preserve the typing already in flight.
  if(event?.type==='pageshow'&&!event.persisted&&available()){measure();run();return;}
  const entering=!live&&page.classList.contains('live');live=page.classList.contains('live');
  if(!available()){stop();return;}stop();if(entering){selected=0;for(const track of tracks){track.current=[];track.visible.textContent='';}window.scrollTo({top:0,left:0,behavior:'instant'});}
  labels();active=-1;showInfo(selected,{animate:entering||event?.type==='portfolio:language'});measure();run();
 }
 page.addEventListener('keydown',event=>{
  if(!available()||event.defaultPrevented||event.isComposing||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,[contenteditable]'))return;
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();const index=(selected+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+channels.length)%channels.length;controls[index].focus({preventScroll:true});change(index);}
 });
 button.addEventListener('click',async()=>{
  const c=channels[active];if(button.disabled||!available()||typing||!c?.value||!safeHref(c))return;const token=++generation;button.disabled=true;status.textContent='';
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(c.value);if(token===generation&&available())status.textContent=english()?'Copied':'已复制';}
  catch(_){if(token!==generation||!available())return;const selection=getSelection(),range=document.createRange();range.selectNodeContents(valueTrack.visible);selection?.removeAllRanges();selection?.addRange(range);status.textContent=english()?'Select the address to copy.':'请选中地址复制。';}
  finally{if(token===generation)button.disabled=false;}
 });
 addEventListener('resize',()=>{measure();run();},{passive:true});addEventListener('portfolio:navigation',activate);addEventListener('portfolio:language',activate);
 document.addEventListener('visibilitychange',activate);addEventListener('pageshow',activate);addEventListener('pagehide',()=>{live=false;stop();});
 reduced.addEventListener('change',activate);
 new MutationObserver(()=>{refreshPalettes();paint();run();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 if('ResizeObserver'in window){const ro=new ResizeObserver(()=>{measure();run();});ro.observe(stage);ro.observe(copy);}
 document.fonts?.ready.then(()=>{measure();run();});activate();
})();
