import {clone,at,inside,room,geometry,hardError,activityDefs,activityCells,activityPosition,activityError,useCellClear,ruleMatches,ruleItems,appendRoute,complete} from './engine.js';
import {CAMPAIGN,campaignCase} from './campaign.js';
export const GAME_KEY='arright:studio:v1',BACKUP_KEY=GAME_KEY+':before-import';
export const emptyState=()=>({layout:{},activity:null,activities:{},route:[]});
export const freshCase=()=>({state:emptyState(),elapsed:0,completed:false,completedAt:null,hints:0,proof:null,marks:{},notes:{},history:[],future:[]});
export const freshSave=()=>({format:'arright-studio',version:1,lastCase:'A01',cases:Object.fromEntries(CAMPAIGN.map(q=>[q.id,freshCase()]))});
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),safeNumber=(n,max=1e12)=>Number.isFinite(n)&&n>=0?Math.min(max,n):0;
export function validState(q,input){
 if(!isObj(input)||!isObj(input.layout)||!Array.isArray(input.route)||input.route.length>q.w*q.h)return null;
 const s=emptyState();
 for(const [id,p] of Object.entries(input.layout)){if(!q.items.some(i=>i.id===id)||!isObj(p)||hardError(q,s.layout,id,p))return null;s.layout[id]={x:p.x,y:p.y,t:p.t};}
 for(const a of activityDefs(q)){const p=activityPosition(q,input,a.id);if(p==null)continue;if(!isObj(p)||![p.x,p.y].every(Number.isInteger)||activityCells(q,p,a.id).some(c=>!inside(q,c)||room(q,c)!==a.room))return null;if(a.id==='activity')s.activity={x:p.x,y:p.y};else s.activities[a.id]={x:p.x,y:p.y};}
 for(const c of input.route){if(!Array.isArray(c)||c.length!==2||!c.every(Number.isInteger))return null;const next=appendRoute(q,s,c);if(next.error||next.route.length!==s.route.length+1)return null;s.route=next.route;}
 return s;
}
function safeMarks(q,value){const result={};if(!isObj(value))return result;for(const [id,list] of Object.entries(value)){const [piece,turn]=id.split(':');if(!q.items.some(i=>i.id===piece)||!['0','1','2','3'].includes(turn)||!Array.isArray(list))continue;result[id]=[...new Set(list.filter(v=>typeof v==='string'&&/^\d+,\d+$/.test(v)&&inside(q,v.split(',').map(Number))))].slice(0,q.w*q.h);}return result;}
export function normalizeSave(input,{strict=false}={}){
 if(!isObj(input)||input.format!=='arright-studio'||input.version!==1||!isObj(input.cases))throw Error('不是 arright 第一章的有效存档。');
 const out=freshSave();out.lastCase=campaignCase(input.lastCase)?input.lastCase:'A01';
 for(const q of CAMPAIGN){const p=input.cases[q.id];if(p==null)continue;if(!isObj(p))throw Error(q.id+' 存档格式不正确。');const state=validState(q,p.state);if(!state){if(strict)throw Error(q.id+' 的摆放或路线数据无效；未导入任何内容。');continue;}
  const proof=p.proof?validState(q,p.proof):null,notes={};if(isObj(p.notes))for(const r of q.rules)if(p.notes[r.id]===true)notes[r.id]=true;
  const clean=entries=>Array.isArray(entries)?entries.slice(-30).flatMap(v=>{const s=validState(q,v.state);return s?[{state:s,marks:safeMarks(q,v.marks)}]:[];}):[];
  out.cases[q.id]={state,elapsed:safeNumber(p.elapsed),completed:!!proof&&complete(q,proof),completedAt:typeof p.completedAt==='string'?p.completedAt.slice(0,40):null,hints:Math.floor(safeNumber(p.hints,9999)),proof:proof&&complete(q,proof)?proof:null,marks:safeMarks(q,p.marks),notes,history:clean(p.history),future:clean(p.future)};
 }
 return out;
}
export function importSave(text){if(typeof text!=='string'||text.length>3_000_000)throw Error('存档过大，请选择小于 3 MB 的 JSON 文件。');let data;try{data=JSON.parse(text);}catch{throw Error('无法读取这个 JSON 文件。');}return normalizeSave(data,{strict:true});}
export function snapshot(p){p.history.push({state:clone(p.state),marks:clone(p.marks)});p.history=p.history.slice(-80);p.future=[];}
export function commit(p,state){snapshot(p);p.state=clone(state);}
export function travel(p,direction){const from=direction==='undo'?p.history:p.future,to=direction==='undo'?p.future:p.history;if(!from.length)return false;to.push({state:clone(p.state),marks:clone(p.marks)});const v=from.pop();p.state=v.state;p.marks=v.marks;return true;}
export function attemptPlace(q,state,id,p){const next=clone(state),a=activityDefs(q).find(a=>a.id===id);if(a){const error=activityError(q,next.layout,p,id);if(error)return {error};if(id==='activity')next.activity={x:p.x,y:p.y};else next.activities[id]={x:p.x,y:p.y};}else{const i=q.items.find(i=>i.id===id),error=hardError(q,next.layout,id,p);if(error)return {error};if(i.room&&at(i,p).some(c=>room(q,c)!==i.room))return {error:i.name+'要放在'+q.rooms.find(r=>r.id===i.room).label+'。'};next.layout[id]={x:p.x,y:p.y,t:p.t};}next.route=[];return {state:next};}
export function candidates(q,state,id,t){const i=q.items.find(i=>i.id===id);if(!i)return [];const out=[];for(let y=0;y<q.h;y++)for(let x=0;x<q.w;x++){const a=attemptPlace(q,state,id,{x,y,t});if(!a.state)continue;const s=a.state;if(q.items.some(v=>s.layout[v.id]&&at(v,s.layout[v.id],'use').some(c=>!inside(q,c)||room(q,c)!==room(q,at(v,s.layout[v.id])[0])||!useCellClear(q,s.layout,v.id,c))))continue;if(q.rules.some(r=>ruleItems(r).includes(id)&&ruleItems(r).every(k=>s.layout[k])&&(!r.area||activityPosition(q,s,r.area))&&!ruleMatches(q,r,s.layout,s)))continue;out.push([x,y]);}return out;}
export function finish(q,p,now=new Date().toISOString()){if(!complete(q,p.state))return false;p.completed=true;p.completedAt ||= now;p.proof=clone(p.state);return true;}
export const nextCase=id=>CAMPAIGN[CAMPAIGN.findIndex(q=>q.id===id)+1]||null;
export function exportSave(save){return JSON.stringify({...save,exportedAt:new Date().toISOString(),cases:Object.fromEntries(Object.entries(save.cases).map(([id,p])=>[id,{...p,history:p.history.slice(-20),future:p.future.slice(-20)}]))},null,2);}
export const clockText=ms=>{const n=Math.floor(ms/1000);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
