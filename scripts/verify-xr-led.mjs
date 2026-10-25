// Verify the fixed-emitter contract across real dog/AR poses. An optional DOM
// geometry fixture also checks connector ports and obstacle clearance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('assets/xr-logic-network.js',root),'utf8');
const data=JSON.parse(readFileSync(new URL('assets/works/xr/logic/dot-assets.json',root),'utf8')).assets;
const names=['walk','dog','ar','fragment','route','translation','story','memory'];
const context=vm.createContext({data,ratio:1,palette:Array(16).fill('#000'),TAU:Math.PI*2,
  clamp:(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),
  cards:names.map((node,i)=>({dataset:{node,side:i<4?'left':'right'}}))});
vm.runInContext(source.slice(source.indexOf('  function paintCells('),source.indexOf('  const colour=')),context);
vm.runInContext(source.slice(source.indexOf('  function connectors('),source.indexOf('  function resize(')),context);
let changes=0,emissions=0;
for(const [key,cols,rows,poses] of [['dog',50,41,12],['ar',67,22,24]]){
  const pitch=4.8,centres=new Float32Array(cols*rows*2),allowed=new Set();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c;centres[i*2]=(c+.5)*pitch;centres[i*2+1]=(r+.5)*pitch;
    allowed.add(centres[i*2]+','+centres[i*2+1]);
  }
  let emittedRadius;
  const baseline=centres.slice(),draw={setTransform(){},clearRect(){},beginPath(){},moveTo(){},fill(){},
    arc(x,y,r){assert(allowed.has(x+','+y),'Emitter moved off its fixed grid');emittedRadius??=r;assert.equal(r,emittedRadius);assert(r>0&&r<pitch*.5);emissions++;}};
  const model={cols,rows,pitch,centres,w:cols*pitch,h:rows*pitch,poses:new Map(),context:draw};
  let previous;
  for(let pose=0;pose<poses;pose++){
    const cells=context.sourceCells(model,key,[1,1,cols-2,rows-2],pose);
    if(previous)for(let i=0;i<cells.length;i++)if(cells[i]!==previous[i])changes++;
    context.paintCells(model,cells);assert.deepEqual(centres,baseline);previous=cells;
  }
}
assert(changes>100,'Animated poses must change which fixed cells are lit');
assert(!/bezierCurveTo|quadraticCurveTo/.test(source),'Connectors must use straight segments');

function intersects(a,b,r){
  let low=0,high=1;const dx=b[0]-a[0],dy=b[1]-a[1];
  for(const [p,q] of [[-dx,a[0]-r.x-1],[dx,r.x+r.w-1-a[0]],[-dy,a[1]-r.y-1],[dy,r.y+r.h-1-a[1]]]){
    if(Math.abs(p)<1e-9){if(q<0)return false;continue;}
    const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;
  }return low<=high;
}
if(process.argv[2]){
  const geometry=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const links=context.connectors(geometry.boxes,geometry.hub,geometry.width,geometry.height,geometry.desktop);
  assert.equal(links.length,8);
  for(const link of links){
    const p=link.points;assert.equal(p[0][1],p[1][1],'Start port must be horizontal');
    assert.equal(p.at(-1)[1],p.at(-2)[1],'End port must be horizontal');
    for(let i=1;i<p.length;i++)for(const [id,r] of Object.entries({...geometry.boxes,hub:geometry.hub}))
      assert(!intersects(p[i-1],p[i],r),link.id+' connector crosses '+id);
  }
  console.log('8 straight/polyline connectors: horizontal ports and clear node interiors');
}
console.log(emissions+' bead emissions stay on immutable centres; '+changes+' light-state changes across 36 original-source poses');
