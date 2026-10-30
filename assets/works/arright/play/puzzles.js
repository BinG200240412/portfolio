import {findRoute} from './engine.js';
import {HOUSE} from './house.js';
import {IRREGULAR_HOUSE} from './irregular-house.js';
import {LIVING_RELATIONS} from './living-relations.js';
import {RELATED_HOUSE} from './related-house.js';
const bar={solid:[[0,0],[1,0]],use:[[0,1],[1,1]]};
const desk={...bar,id:'desk',name:'书桌',letter:'A',color:'#6b8578',hint:'背面靠窗；斜线是桌前使用区。'};
const cabinet={...bar,id:'cabinet',name:'衣柜',letter:'B',color:'#a76d52',hint:'背面靠实墙；斜线是柜门开合区。'};
const sofa={id:'sofa',name:'沙发',letter:'C',color:'#7b8194',solid:[[0,0],[1,0],[2,0]],use:[[0,1],[1,1],[2,1]],hint:'背面靠实墙；前方一排留给使用和通行。'};
const coffee={id:'coffee',name:'茶几',letter:'D',color:'#9b8862',solid:[[0,0],[1,0]],use:[],hint:'在沙发正前方隔一格，至少对齐两格；共用沙发前的使用区。'};
const bed={id:'bed',name:'床',letter:'A',color:'#6b8578',solid:[[0,0],[1,0],[0,1],[1,1]],use:[[0,2],[1,2]],hint:'床头靠实墙；床尾两格留空，验收经过其中一格。'};
const rule=(id,kind,item,text,extra={})=>({id,kind,item,text,...extra});
export const PUZZLES=[
  {id:'P01',name:'一样大，不一样放。',short:'物品关系',focus:'两个同形家具，能互换吗？',aim:'书桌与衣柜占地相同。几何上放得下，还要看窗和墙。',w:5,h:4,rooms:[{id:'study',label:'书房',x:0,y:0,w:5,h:4}],start:[0,3],end:[4,3],windows:[1,2].map(x=>({cell:[x,0],out:[x,-1]})),items:[desk,cabinet],rules:[rule('desk-window','window','desk','书桌背面完整靠窗'),rule('cabinet-wall','wall','cabinet','衣柜背面靠实墙，不能挡窗')],layout:{desk:{x:1,y:0,t:0},cabinet:{x:4,y:0,t:1}},activity:null,insight:'形状相同，不代表可以互换。试着交换书桌和衣柜，再看看窗边关系。'},
  {id:'P02',name:'这块空地，也要安排。',short:'功能留白',focus:'使用区和活动区，可以共享。',aim:'摆好沙发与茶几，还要放下一块 2 × 2 活动区。让使用区与活动区一起参与安排。',w:5,h:5,rooms:[{id:'living',label:'客厅',x:0,y:0,w:5,h:5}],start:[0,4],end:[4,4],windows:[],items:[sofa,coffee],activity:{w:2,h:2,room:'living',label:'客厅活动区'},rules:[rule('sofa-wall','wall','sofa','沙发背面完整靠实墙'),rule('coffee-faces','faces','sofa','茶几在沙发前隔一格，至少对齐两格',{other:'coffee'})],layout:{sofa:{x:0,y:0,t:0},coffee:{x:0,y:2,t:0}},activityExample:{x:2,y:1},insight:'活动区不是家具。它可以和使用区共享，也可以被路线穿过，但不能被实体占用。'},
  {id:'P03',name:'房间之间，留一条路。',short:'全屋联动',focus:'局部摆得下，整屋未必走得通。',aim:'从卧室到客厅，经门洞，照顾每个使用区。提前想好路线，再决定家具朝向。',w:6,h:5,rooms:[{id:'bedroom',label:'卧室',x:0,y:0,w:3,h:5},{id:'living',label:'客厅',x:3,y:0,w:3,h:5}],doors:[[[2,2],[3,2]]],start:[2,4],end:[5,4],windows:[],items:[bed,cabinet,sofa,coffee],activity:{w:2,h:2,room:'living',label:'客厅活动区'},rules:[rule('bed-room','room','bed','床放在卧室',{room:'bedroom'}),rule('cabinet-room','room','cabinet','衣柜放在卧室',{room:'bedroom'}),rule('sofa-room','room','sofa','沙发放在客厅',{room:'living'}),rule('coffee-room','room','coffee','茶几放在客厅',{room:'living'}),rule('bed-wall','wall','bed','床头完整靠实墙'),rule('cabinet-wall','wall','cabinet','衣柜背面完整靠实墙'),rule('sofa-wall','wall','sofa','沙发背面完整靠实墙'),rule('coffee-faces','faces','sofa','茶几在沙发前隔一格，至少对齐两格',{other:'coffee'})],layout:{bed:{x:0,y:0,t:0},cabinet:{x:0,y:3,t:3},sofa:{x:5,y:0,t:1},coffee:{x:3,y:0,t:3}},activityExample:{x:3,y:3},insight:'一格宽的使用区可能变成死路。要看能否连续经过，而不只是每处分别能到达。'},
  {id:'P04',name:'每一格，都有用。',short:'零自然留白',focus:'16 格，安排一间刚刚好的小屋。',aim:'床、书桌、矮柜，加一块活动区。所有空格都必须有用途；画过路线不能替空格补用途。',w:4,h:4,zeroNatural:true,
   rooms:[{id:'studio',label:'小屋',x:0,y:0,w:4,h:4}],start:[0,2],end:[3,3],windows:[2,3].map(x=>({cell:[x,0],out:[x,-1]})),
   items:[bed,{...desk,letter:'B'},{...cabinet,name:'矮柜',letter:'C',hint:'柜前两格留空；可独立摆放，不要求靠墙。'}],
   activity:{w:2,h:2,room:'studio',label:'活动区'},rules:[rule('bed-wall','wall','bed','床头完整靠实墙'),rule('desk-window','window','desk','书桌背面完整靠窗')],
   displayClues:['床头靠实墙；书桌背面完整靠窗','矮柜可独立摆放，不要求靠墙','活动区 2 × 2；所有使用区完整留空','空地全部归属功能区，允许共享','路线经过各功能区，从入到出不重走'],
   layout:{bed:{x:0,y:0,t:0},desk:{x:2,y:0,t:0},cabinet:{x:0,y:3,t:2}},activityExample:{x:2,y:2},
   insight:'这间小屋没有无用途空格。共享使用区腾出了完整活动区，家具的安排也保住了从入到出的验收路线。'}
];
PUZZLES.push(HOUSE);
PUZZLES.push(IRREGULAR_HOUSE);
PUZZLES.push(LIVING_RELATIONS);
PUZZLES.push(RELATED_HOUSE);
PUZZLES[2].displayClues=[
  '卧室放床、衣柜；客厅放沙发、茶几',
  '床头、柜背、沙发背完整靠实墙',
  '茶几在沙发前隔一格，至少对齐两格',
  '客厅留出 2 × 2 活动区；使用区留空',
  '路线经过各功能区，从入到出不重走'
];
export const initialState=()=>({layout:{},activity:null,activities:{},route:[]});
export function example(q,withRoute=true) {const s={layout:structuredClone(q.layout),activity:q.activityExample?{...q.activityExample}:null,activities:structuredClone(q.activityExamples||{}),route:[]};if(withRoute)s.route=q.exampleRoute?structuredClone(q.exampleRoute):findRoute(q,s)||[];return s;}
export const STORE_KEY='arright-dot-lab:v1';
