import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),data=JSON.parse(readFileSync(new URL('assets/works/xr/experience/place-dots.json',root)));
const source=readFileSync(new URL('assets/xr-place-native.js',root),'utf8');
assert.equal(data.cells.length,416);assert.equal(new Set(data.cells.map(([x,y])=>x+','+y)).size,416);
for(const [x,y,role] of data.cells){assert(x>=0&&x<27&&y>=0&&y<24);assert(role>=0&&role<6);}
assert.equal(data.players.length,4);for(const row of data.players){assert.equal(row.length,16);assert(row.every(role=>role>=0&&role<6));}
assert.equal(new Set(data.players.map(row=>row.join(','))).size,4,'The original visitors have distinct combinations');
const scope=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  function connectionPaths('),source.indexOf('  function finishLines(')),scope);
for(const mobile of [false,true])for(const [i,path] of scope.connectionPaths(mobile).entries()){
  assert(path.includes('C'),'Source connections must keep their gentle curves');
  const coords=path.match(/-?\d+(?:\.\d+)?/g).map(Number),[x,y]=coords;
  assert(data.cells.some(([col,row,role])=>40+col*20===x&&20+row*20===y&&role===i+1),'Each connection must originate at its matching source category');
  for(let j=0;j<coords.length;j+=2){assert(coords[j]>=0&&coords[j]<=(mobile?600:1000));assert(coords[j+1]>=0&&coords[j+1]<=(mobile?610:540));}
}
assert(!/drawImage|<image|createElement\(['"]canvas/.test(source),'The main diagram must use native geometry');
if(process.argv[2]){
  const f=JSON.parse(readFileSync(process.argv[2],'utf8'));
  assert.equal(f.before.geometry.length,480);assert.deepEqual(f.after.geometry,f.before.geometry,'Point centres and radii moved during selection/playback');
  assert.notDeepEqual(f.before.light,f.after.light,'Selection must change the fixed cells’ light');
  assert.equal(f.nativeImages,0);
  console.log('Browser fixture: all 480 map/sequence circles keep their centres and radii while illumination changes');
}
console.log('416 source cells, 4 distinct 16-cell visitor sequences, 10 responsive curves with category-correct origins');
