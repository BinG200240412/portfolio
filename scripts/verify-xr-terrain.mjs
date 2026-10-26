// Exercise the real mesh math, including every allowed elevation angle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/xr-research-field.js',import.meta.url),'utf8');
const scope=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  function makeTerrain('),source.indexOf('  const vertices=makeTerrain(')),scope);
const mesh=scope.makeTerrain(65,49),baseline=JSON.stringify(mesh);
assert.equal(mesh.length,3185);assert(Object.isFrozen(mesh));
let views=0;
for(const [w,h] of [[985,570],[350,370],[740,420]])for(const yaw of [-Math.PI,-1.4,-.48,0,.9,Math.PI])for(const pitch of [.28,.78,1.25]){
  const points=scope.projectTerrain(mesh,yaw,pitch,w,h);
  assert.equal(points.planeCorners.length,4);for(const p of points.planeCorners)assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
  for(const point of points){assert(Number.isFinite(point.x)&&Number.isFinite(point.y));assert(point.x>=0&&point.x<=w);assert(point.y>=0&&point.y<h-40);}
  const index=812,p=points[index],nearest=scope.nearestVertex(points,p.x,p.y);
  assert(Math.hypot(points[nearest].x-p.x,points[nearest].y-p.y)<.001);
  assert.equal(scope.nearestVertex(points,-100,-100),-1);views++;
}
assert.equal(JSON.stringify(mesh),baseline,'Camera changes must not mutate world vertices');
assert(/function drawMapPlane/.test(source),'The supplied map is a separate plane beneath the native mesh');
assert(/projected.planeCorners.map/.test(source),'Map and mesh must use the same camera projection');
// Pulse lighting is also read-only with respect to the mesh.
Object.assign(scope,{vertices:mesh,pulses:[{index:812,start:0}],clock:0,hover:-1,selected:-1});
vm.runInContext(source.slice(source.indexOf('  function lighting('),source.indexOf('  function render(')),scope);
let lit=0;for(const time of [0,.5,1,1.5,2]){scope.clock=time;for(let i=0;i<mesh.length;i++)if(scope.lighting(i)>.08)lit++;}
assert(lit>100);assert.equal(JSON.stringify(mesh),baseline);
console.log(`${mesh.length} immutable native vertices; ${views} fitted desktop/mobile views; ${lit} light-state samples; nearest-point hit testing passed`);
