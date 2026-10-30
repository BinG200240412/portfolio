import {HOUSE} from './house.js';
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,n)=>[x+n%w,y+Math.floor(n/w)]);
const hall=[...rect(6,2,1,3),...rect(3,5,5,1),[3,4],...rect(4,6,1,4)];
const rooms=[
 {id:'bedroom',label:'卧室',cells:[...rect(0,0,4,4),[0,4],[1,4]],labelAt:[1.1,.3],color:'#6b8578'},
 {id:'bath',label:'卫生间',cells:rect(4,0,2,4),labelAt:[5,.3],color:'#648f91'},
 {id:'balcony',label:'阳台',cells:rect(7,1,2,4),labelAt:[8,1.3],color:'#8b9471'},
 {id:'living',label:'客厅',cells:[...rect(0,6,4,4),[2,10],[3,10]],labelAt:[1.1,6.3],color:'#7b8194'},
 {id:'kitchen',label:'厨房',cells:[...rect(5,6,4,4),[7,10],[8,10]],labelAt:[6.1,6.3],color:'#a27d55'},
 {id:'entry',label:'玄关',cells:rect(4,10,2,2),labelAt:[5,11.8],color:'#8b7f73'},
 {id:'hall',label:'走廊',cells:hall,labelAt:[5.5,5.38],color:'#89938a',fixed:true}
];
const items=[...HOUSE.items.map(i=>({...i})),
 {id:'bookcase',name:'书柜',letter:'Q',color:'#7b8194',room:'living',solid:[[0,0],[1,0]],use:[[0,1],[1,1]],hint:'书柜放在客厅，柜前两格留空。'},
 {id:'shoe',name:'鞋柜',letter:'R',color:'#8b7f73',room:'entry',solid:[[0,0],[0,1]],use:[[-1,0],[-1,1]],hint:'鞋柜放在玄关，左侧两格为换鞋空间。可旋转。'}
];
export const IRREGULAR_HOUSE={
 id:'P06',name:'家，不必方方正正。',short:'转角住宅',focus:'凹凸户型与折线走廊',
 aim:'从玄关入户，沿折线走廊串起卧室、客厅、厨房、卫生间和阳台。把转角与凹位也安排好，再完成一笔验收。',
 w:9,h:12,large:true,irregular:true,zeroNatural:true,startLabel:'入',endLabel:'终',rooms,floor:rooms.flatMap(r=>r.cells),
 fixedSpaces:[{id:'hall',label:'固定走廊',room:'hall',cells:hall}],
 annotations:[{at:[1.3,5.45],label:'采光凹口'},{at:[7.8,.5],label:'外侧退台'}],
 doors:[[[4,9],[4,10]],[[4,9],[3,9]],[[4,7],[3,7]],[[3,4],[3,3]],[[3,1],[4,1]],[[5,3],[6,3]],[[6,2],[7,2]],[[7,4],[7,5]],[[7,5],[7,6]]],
 start:[4,11],end:[7,9],
 externalDoors:[{cell:[4,11],out:[4,12]}],
 windows:[2,3].map(x=>({cell:[x,0],out:[x,-1]})).concat([7,8].map(x=>({cell:[x,1],out:[x,0]}))),items,
 activities:[...HOUSE.activities,{id:'prep-area',label:'备餐区',room:'kitchen',w:2,h:1}],
 rules:[...HOUSE.rules,...items.filter(i=>['bookcase','shoe'].includes(i.id)).map(i=>({id:`room-${i.id}`,kind:'room',item:i.id,room:i.room,text:`${i.name}放在指定房间`}))],
 displayClues:['凹口与退台属于室外，不能放家具或画线','灰绿点纹是固定走廊：不可移动、不可占用','家具按房间摆放，选择后查看朝向要求','书桌、花架靠窗；茶几与沙发对齐','四块功能区：卧室、客厅、晾晒、备餐','零自然留白；固定走廊也有明确用途','从玄关「入」到厨房「终」，经过各功能区，不重走'],
 layout:{bed:{x:0,y:0,t:0},desk:{x:2,y:0,t:0},cabinet:{x:0,y:4,t:2},sofa:{x:0,y:6,t:0},coffee:{x:0,y:9,t:0},media:{x:2,y:10,t:2},bookcase:{x:2,y:6,t:0},fridge:{x:5,y:6,t:0},dining:{x:8,y:6,t:1},stove:{x:5,y:9,t:2},sink:{x:6,y:9,t:2},counter:{x:7,y:9,t:2},shower:{x:4,y:0,t:0},toilet:{x:4,y:2,t:3},basin:{x:4,y:3,t:3},plant:{x:7,y:1,t:0},washer:{x:8,y:1,t:0},shoe:{x:5,y:10,t:0}},
 activityExamples:{'bed-area':{x:2,y:2},'living-area':{x:2,y:7},'dry-area':{x:7,y:3},'prep-area':{x:7,y:8}},
 exampleRoute:[[4,11],[4,10],[4,9],[3,9],[2,9],[2,8],[1,8],[1,7],[2,7],[3,7],[4,7],[4,6],[4,5],[3,5],[3,4],[3,3],[2,3],[1,3],[1,2],[2,2],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[6,3],[6,2],[7,2],[8,2],[8,3],[8,4],[7,4],[7,5],[7,6],[7,7],[6,7],[5,7],[5,8],[6,8],[7,8],[7,9]],
 insight:'走廊是题目事先规定的通行空间，不是给剩余空格补用途。凹凸外墙、门洞与家具使用区共同决定可行的验收路线。此为逻辑原型，不是建筑施工图。'
};
