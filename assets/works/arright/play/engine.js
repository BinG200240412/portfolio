export const clone = x => JSON.parse(JSON.stringify(x));
export const key = (x,y) => `${x},${y}`;
export const unkey = s => s.split(',').map(Number);
export const same = (a,b) => a[0]===b[0] && a[1]===b[1];
export const DIRS = [[0,1],[-1,0],[0,-1],[1,0]];
const turn = ([x,y],t) => t===0?[x,y]:t===1?[-y,x]:t===2?[-x,-y]:[y,-x];
export function geometry(item,t=0) {
  const s=item.solid.map(p=>turn(p,t)), u=(item.use||[]).map(p=>turn(p,t));
  const mx=Math.min(...s.map(p=>p[0])),my=Math.min(...s.map(p=>p[1]));
  return {solid:s.map(([x,y])=>[x-mx,y-my]),use:u.map(([x,y])=>[x-mx,y-my]),front:turn([0,1],t)};
}
export function at(item,p,part='solid') {if(!p)return [];return geometry(item,p.t)[part].map(([x,y])=>[x+p.x,y+p.y]);}
export const roomCells=r=>r.cells||Array.from({length:r.w*r.h},(_,n)=>[r.x+n%r.w,r.y+Math.floor(n/r.w)]);
const floorCache=new WeakMap();
export const inside = (q,[x,y]) => {
  if(x<0||x>=q.w||y<0||y>=q.h||(q.blocked||[]).some(p=>same(p,[x,y])))return false;
  if(!q.floor)return true;
  if(!floorCache.has(q))floorCache.set(q,new Set(q.floor.map(p=>key(...p))));
  return floorCache.get(q).has(key(x,y));
};
export function room(q,p) {return q.rooms.find(r=>r.cells?r.cells.some(c=>same(c,p)):p[0]>=r.x&&p[0]<r.x+r.w&&p[1]>=r.y&&p[1]<r.y+r.h)?.id;}
export const fixedSpaces=q=>q.fixedSpaces||[];
export function canStep(q,a,b) {return inside(q,a)&&inside(q,b)&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1&&(room(q,a)===room(q,b)||(q.doors||[]).some(d=>d.some(p=>same(p,a))&&d.some(p=>same(p,b))));}
export const neighbors = (q,p) => DIRS.map(([x,y])=>[p[0]+x,p[1]+y]).filter(b=>canStep(q,p,b));
export function occupied(q,layout,except=null) {return new Set(q.items.filter(i=>i.id!==except).flatMap(i=>at(i,layout[i.id]).map(p=>key(...p))));}
// Only an explicitly paired seat may occupy its desk's seating zone.
// This never permits solid/solid overlap or occupying a passage/activity zone.
export const canOccupyUse=(q,owner,occupant)=>(q.useOccupants?.[owner]||[]).includes(occupant);
export function useCellClear(q,layout,owner,c){return !q.items.some(i=>at(i,layout[i.id]).some(p=>same(p,c))&&!canOccupyUse(q,owner,i.id));}
export const activityDefs=q=>q.activities||(q.activity?[{...q.activity,id:'activity'}]:[]);
export const activityPosition=(q,state,id)=>q.activity&&id==='activity'?state.activity:state.activities?.[id];
export function activityCells(q,activity,id='activity') {const def=activityDefs(q).find(a=>a.id===id);if(!def||!activity)return [];return Array.from({length:def.w*def.h},(_,n)=>[activity.x+n%def.w,activity.y+Math.floor(n/def.w)]);}
export function spaceCoverage(q,state) {
  const solid=occupied(q,state.layout),functional=new Set();
  for(const item of q.items){const p=state.layout[item.id];if(!p)continue;const zone=room(q,at(item,p)[0]);for(const c of at(item,p,'use'))if(inside(q,c)&&room(q,c)===zone&&!solid.has(key(...c)))functional.add(key(...c));}
  for(const def of activityDefs(q))for(const c of activityCells(q,activityPosition(q,state,def.id),def.id))if(inside(q,c)&&room(q,c)===def.room&&!solid.has(key(...c)))functional.add(key(...c));
  for(const def of fixedSpaces(q))for(const c of def.cells)if(inside(q,c)&&room(q,c)===def.room&&!solid.has(key(...c)))functional.add(key(...c));
  const natural=[];let total=0;for(let y=0;y<q.h;y++)for(let x=0;x<q.w;x++)if(inside(q,[x,y])){total++;const k=key(x,y);if(!solid.has(k)&&!functional.has(k))natural.push([x,y]);}
  return {total,solid:[...solid].filter(k=>inside(q,unkey(k))).length,functional:functional.size,natural};
}
export function hardError(q,layout,id,p,activity=null) {
  const item=q.items.find(i=>i.id===id);
  if(!item||!p||![p.x,p.y,p.t].every(Number.isInteger)||p.t<0||p.t>3)return '摆放数据无效。';
  const solid=at(item,p),use=at(item,p,'use'),taken=occupied(q,layout,id);
  if(solid.some(c=>!inside(q,c)))return '家具实体超出了房间。';
  const reserved=fixedSpaces(q).find(z=>solid.some(c=>z.cells.some(d=>same(d,c))));
  if(reserved)return q.fixedSpaceLabel?`${reserved.label}必须保持留空，不能摆家具。`:'题目预留的走廊必须保持通畅，不能摆家具。';
  if(solid.some(c=>taken.has(key(...c))))return '两件家具实体不能重叠。';
  if(solid.some(c=>room(q,c)!==room(q,solid[0])))return '家具不能跨过房间分隔线。';
  if(solid.some(c=>[q.start,q.end,...(q.doors||[]).flat()].some(d=>same(d,c))))return '入口、出口和门洞需要留空。';
  return null;
}
export function activityError(q,layout,p,id='activity') {
  const def=activityDefs(q).find(a=>a.id===id),cells=activityCells(q,p,id),taken=occupied(q,layout);
  if(!def||!p||![p.x,p.y].every(Number.isInteger))return '请先放置功能区。';
  if(cells.some(c=>!inside(q,c)||room(q,c)!==def.room))return '功能区必须完整放在指定房间内。';
  if(cells.some(c=>taken.has(key(...c))))return '活动区不能被家具实体占用。';
  return null;
}
function backCells(item,p){const g=geometry(item,p.t),set=new Set(g.solid.map(c=>key(...c)));return g.solid.filter(([x,y])=>!set.has(key(x-g.front[0],y-g.front[1]))).map(([x,y])=>[x+p.x,y+p.y]);}
export function isBackWall(q,item,p,windowOnly=false) {
  const [dx,dy]=geometry(item,p.t).front;
  return backCells(item,p).every(c=>{const b=[c[0]-dx,c[1]-dy];if(canStep(q,c,b))return false;const win=(q.windows||[]).some(w=>same(w.cell,c)&&same(w.out,b));return windowOnly?win:!win;});
}
export const ruleItems=r=>[r.item,r.other,r.third].filter(Boolean);
export function ruleMatches(q,r,layout,state={}) {
  if(!ruleItems(r).every(id=>layout[id]))return false;
  const item=id=>q.items.find(i=>i.id===id),i=item(r.item),p=layout[r.item],a=at(i,p),f=geometry(i,p.t).front;
  const dot=(v,d)=>v[0]*d[0]+v[1]*d[1],cross=(v,d)=>v[0]*d[1]-v[1]*d[0],sub=(v,d)=>[v[0]-d[0],v[1]-d[1]];
  if(r.kind==='window')return isBackWall(q,i,p,true);
  if(r.kind==='wall')return isBackWall(q,i,p,false);
  if(r.kind==='room')return a.every(c=>room(q,c)===r.room);
  if(r.kind==='windowSide')return (q.windows||[]).some(w=>a.some(c=>same(c,w.cell))&&dot(sub(w.out,w.cell),f)===0);
  if(r.kind==='windowClear')return a.every(c=>!(q.windows||[]).some(w=>same(w.cell,c)));
  if(r.kind==='opensTo'){
    const target=fixedSpaces(q).find(z=>z.id===r.zone)?.cells||[],u=at(i,p,'use');
    return u.length>0&&u.every(c=>target.some(d=>same(c,d)))&&a.every(c=>target.some(d=>same(d,[c[0]+f[0],c[1]+f[1]])));
  }
  if(r.kind==='useAtArea'){
    const def=activityDefs(q).find(z=>z.id===r.area),pos=activityPosition(q,state,r.area);
    const target=activityCells(q,pos,r.area),u=at(i,p,'use');
    return !!def&&u.some(c=>target.some(d=>same(c,d)||canStep(q,c,d)));
  }
  if(r.kind==='looksWindow'||r.kind==='doorWindow'){
    const taken=occupied(q,layout,r.item);
    return a.some(c=>{const doorOk=r.kind!=='doorWindow'||(q.externalDoors||[]).some(d=>cross(sub(d.cell,c),f)===0&&dot(sub(d.cell,c),f)<0&&same(sub(d.out,d.cell),[-f[0],-f[1]]));if(!doorOk)return false;let prev=c;for(let n=1;n<=q.w+q.h;n++){const next=[c[0]+f[0]*n,c[1]+f[1]*n];if(!inside(q,next))return (q.windows||[]).some(w=>same(w.cell,prev)&&same(w.out,next));if(!canStep(q,prev,next)||taken.has(key(...next)))return false;prev=next;}return false;});
  }
  if(r.kind==='watchGroup')return ruleMatches(q,{kind:'opposes',item:r.item,other:r.other},layout)&&ruleMatches(q,{kind:'between',item:r.third,other:r.item,third:r.other},layout);
  if(!r.other||!item(r.other))return false;
  const b=at(item(r.other),layout[r.other]),g=geometry(item(r.other),layout[r.other].t).front;
  if(r.kind==='useConnects')return at(i,p,'use').some(c=>at(item(r.other),layout[r.other],'use').some(d=>same(c,d)||canStep(q,c,d)));
  if(r.kind==='faces')return b.every(d=>a.some(c=>cross(sub(d,c),f)===0&&dot(sub(d,c),f)===(r.distance||2)));
  if(r.kind==='opposes')return same(f,[-g[0],-g[1]])&&b.every(d=>a.some(c=>cross(sub(d,c),f)===0&&dot(sub(d,c),f)>0));
  if(r.kind==='seatAtDesk')return same(f,[-g[0],-g[1]])&&b.every(d=>a.some(c=>same(d,[c[0]+f[0],c[1]+f[1]])));
  if(r.kind==='sideBySide')return same(f,g)&&a.some(c=>b.some(d=>Math.abs(c[0]-d[0])+Math.abs(c[1]-d[1])===1&&dot(sub(d,c),f)===0));
  if(r.kind==='between'){
    const c=at(item(r.third),layout[r.third]),axis=geometry(item(r.other),layout[r.other].t).front;
    return new Set(a.map(d=>dot(d,axis))).size===1&&a.every(d=>b.some(s=>c.some(t=>cross(sub(d,s),axis)===0&&cross(sub(t,s),axis)===0&&dot(sub(d,s),axis)>0&&dot(sub(d,s),axis)<dot(sub(t,s),axis))));
  }
  return false;
}
export function layoutChecks(q,state) {
  const {layout,activity}=state,taken=occupied(q,layout),out=[];
  out.push({id:'placed',text:'本题家具全部摆好',ok:q.items.every(i=>layout[i.id])});
  out.push({id:'geometry',text:'实体不重叠、不跨墙、不占门洞',ok:q.items.every(i=>!layout[i.id]||!hardError(q,layout,i.id,layout[i.id],activity))});
  for(const i of q.items){const p=layout[i.id],use=at(i,p,'use');
    if(i.use?.length)out.push({id:`use-${i.id}`,text:i.useCheckText||`${i.name}的使用区完整留空`,ok:!!p&&use.every(c=>inside(q,c)&&room(q,c)===room(q,at(i,p)[0])&&useCellClear(q,layout,i.id,c))});
  }
  for(const r of q.rules)out.push({id:r.id,text:r.text,ok:ruleMatches(q,r,layout,state)});
  for(const def of activityDefs(q)){const p=activityPosition(q,state,def.id);out.push({id:def.id==='activity'?'activity':`activity-${def.id}`,text:`${def.label}：完整保留 ${def.w} × ${def.h} 空间`,ok:!!p&&!activityError(q,layout,p,def.id)});}
  if(q.zeroNatural){const left=spaceCoverage(q,state).natural.length;out.push({id:'zero-natural',text:left?`自然留白清零（还剩 ${left} 格没有用途）`:'自然留白为 0：每格都有明确用途',ok:left===0});}
  return out;
}
export function visitGroups(q,state) {
  const groups=q.items.filter(i=>i.use?.length).map(i=>({id:i.id,label:`${i.name}使用区`,cells:at(i,state.layout[i.id],'use')}));
  for(const def of activityDefs(q))groups.push({id:def.id==='activity'?'activity':`activity:${def.id}`,label:def.label,cells:activityCells(q,activityPosition(q,state,def.id),def.id)});
  for(const def of fixedSpaces(q))groups.push({id:`fixed:${def.id}`,label:def.label,cells:def.cells});return groups;
}
export function routeChecks(q,state) {
  const route=state.route||[],taken=occupied(q,state.layout),set=new Set(route.map(c=>key(...c)));
  return [{id:'path-start',text:`从「${q.startLabel||'入'}」连续走到「${q.endLabel||'出'}」`,ok:route.length>1&&same(route[0],q.start)&&same(route.at(-1),q.end)},
    {id:'path-legal',text:'只走相邻空格，不穿家具或墙',ok:route.length>0&&route.every((c,n)=>inside(q,c)&&!taken.has(key(...c))&&(n===0||canStep(q,route[n-1],c)))},
    {id:'path-simple',text:'路线不重走、不自交',ok:route.length>0&&set.size===route.length},
    ...visitGroups(q,state).map(g=>({id:`visit-${g.id}`,text:`经过${g.label}`,ok:g.cells.some(c=>set.has(key(...c)))}))];
}
export const allChecks = (q,state) => [...layoutChecks(q,state),...routeChecks(q,state)];
export const complete = (q,state) => allChecks(q,state).every(r=>r.ok);
export function appendRoute(q,state,p) {
  const route=state.route||[];
  if(!inside(q,p)||occupied(q,state.layout).has(key(...p)))return {error:'路线只能经过空格。'};
  if(!route.length)return same(p,q.start)?{route:[p]}:{error:`请从标有「${q.startLabel||'入'}」的格子开始。`};
  if(same(route.at(-1),p))return {route};
  if(route.length>1&&same(route.at(-2),p))return {route:route.slice(0,-1)};
  if(route.some(c=>same(c,p)))return {error:'这格已经走过了。可以退回上一步，或清除路线。'};
  if(!canStep(q,route.at(-1),p))return {error:'每次只能走到横竖相邻的空格，不能穿墙。'};
  if(same(route.at(-1),q.end))return {error:'已经到达终点。需要修改时可以退回上一步。'};
  return {route:[...route,p]};
}
export function findRoute(q,state,maxNodes=250000) {
  const taken=occupied(q,state.layout),groups=visitGroups(q,state).map(g=>new Set(g.cells.map(c=>key(...c))));
  if(taken.has(key(...q.start))||taken.has(key(...q.end)))return null;
  const full=(1<<groups.length)-1,mask=p=>groups.reduce((a,g,n)=>a|(g.has(key(...p))?1<<n:0),0),seen=new Set([key(...q.start)]),path=[q.start];let nodes=0;
  function dfs(p,m){if(++nodes>maxNodes)return false;if(same(p,q.end))return m===full;
    // Unvisited required areas must remain reachable without reusing the current path.
    const reachable=new Set([key(...p)]),queue=[p];for(let h=0;h<queue.length;h++)for(const n of neighbors(q,queue[h])){const k=key(...n);if(!taken.has(k)&&!seen.has(k)&&!reachable.has(k)){reachable.add(k);queue.push(n);}}
    if(!reachable.has(key(...q.end))||groups.some((g,n)=>!(m&(1<<n))&&![...g].some(k=>reachable.has(k))))return false;
    const next=neighbors(q,p).filter(n=>!taken.has(key(...n))&&!seen.has(key(...n))).sort((a,b)=>{const gain=v=>{let x=mask(v)&~m,c=0;while(x){c+=x&1;x>>=1;}return c;};return gain(b)-gain(a);});
    for(const n of next){const k=key(...n);seen.add(k);path.push(n);if(dfs(n,m|mask(n)))return true;path.pop();seen.delete(k);}return false;
  }
  return dfs(q.start,mask(q.start))?clone(path):null;
}
export function enumerateLayouts(q,limit=100000) {
  if(q.activities?.length)throw new Error('多房间样本不使用全局穷举；请按房间验证候选并单独验证整屋路线。');
  const options=q.items.map(item=>{const seen=new Set(),out=[];for(let t=0;t<4;t++)for(let y=0;y<q.h;y++)for(let x=0;x<q.w;x++){const p={x,y,t};if(hardError(q,{},item.id,p))continue;const g=at(item,p,'use');if(g.some(c=>!inside(q,c)||room(q,c)!==room(q,at(item,p)[0])))continue;
    const s=JSON.stringify([at(item,p).map(c=>key(...c)).sort(),g.map(c=>key(...c)).sort()]);if(seen.has(s))continue;seen.add(s);out.push(p);}return out;});
  const out=[],layout={};let nodes=0;
  function dfs(n){if(++nodes>limit)return;if(n===q.items.length){const acts=q.activity?Array.from({length:q.w*q.h},(_,k)=>({x:k%q.w,y:Math.floor(k/q.w)})):[null];for(const activity of acts){const state={layout:clone(layout),activity,route:[]};if(layoutChecks(q,state).every(r=>r.ok))out.push(state);}return;}
    const item=q.items[n];for(const p of options[n]){if(hardError(q,layout,item.id,p))continue;layout[item.id]=p;
      if(q.rules.every(r=>r.area||!ruleItems(r).every(id=>layout[id])||ruleMatches(q,r,layout)))dfs(n+1);delete layout[item.id];}
  }dfs(0);return {states:out,nodes,truncated:nodes>limit};
}
