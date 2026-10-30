const bar=(id,name,letter,color,room)=>({id,name,letter,color,room,solid:[[0,0],[1,0]],use:[[0,1],[1,1]],hint:'实体 2 格；正前方 2 格留空。'});
const one=(id,name,letter,color,room)=>({id,name,letter,color,room,solid:[[0,0]],use:[[0,1]],hint:'实体 1 格；正前方 1 格留空。'});
const roomRule=i=>({id:`room-${i.id}`,kind:'room',item:i.id,room:i.room,text:`${i.name}放在指定房间`});
const wall=(item,text)=>({id:`wall-${item}`,kind:'wall',item,text});
const b='#6b8578',l='#7b8194',k='#a27d55',a='#648f91',u='#8b9471';
const items=[
 {id:'bed',name:'床',letter:'A',color:b,room:'bedroom',solid:[[0,0],[1,0],[0,1],[1,1]],use:[[0,2],[1,2]],hint:'床头靠实墙；床尾两格留空。'},
 {...bar('desk','书桌','B',b,'bedroom'),hint:'背面完整靠窗；桌前两格留空。'},
 {...bar('cabinet','矮柜','C',b,'bedroom'),hint:'柜前两格留空，可独立摆放。'},
 {...bar('sofa','双人沙发','D',l,'living'),use:[[0,1],[1,1],[0,2],[1,2]],hint:'双人沙发背靠墙；前方保留 2 × 2 会客空间。'},
 {...bar('coffee','茶几','E',l,'living'),use:[],hint:'在沙发前隔两排空格，与两座沙发对齐；共用会客空间。'},
 {...bar('media','电视柜','F',l,'living'),hint:'背面靠实墙；柜前两格留空。'},
 {...bar('fridge','冰箱','G',k,'kitchen'),hint:'背面靠实墙；开门前方两格留空。'},
 {...bar('dining','餐桌','H',k,'kitchen'),hint:'餐桌一侧两格留给用餐和通行。'},
 {...one('stove','灶台','I',k,'kitchen'),hint:'背面靠实墙；操作面前留一格。'},
 {...one('sink','水槽','J',k,'kitchen'),hint:'操作面前留一格，可作岛台。'},
 {id:'counter',name:'转角台',letter:'K',color:k,room:'kitchen',solid:[[0,0],[1,0],[0,1]],use:[[1,1]],hint:'L 形台面背面靠墙；内角一格为操作区。'},
 {...bar('shower','淋浴','L',a,'bath'),hint:'背面靠实墙；前方两格留空。'},
 {...one('toilet','马桶','M',a,'bath'),hint:'背面靠实墙；前方一格留空。'},
 {...one('basin','台盆','N',a,'bath'),hint:'背面靠实墙；前方一格留空。'},
 {...one('plant','花架','O',u,'balcony'),hint:'背面靠窗；前方一格留空。'},
 {...one('washer','洗衣机','P',u,'balcony'),hint:'前方一格留空，不要求靠实墙。'}
];
export const HOUSE={id:'P05',name:'这次，是一整个家。',short:'整屋委托',focus:'五个房间，一次完整验收。',aim:'卧室、客厅、厨房、卫生间、阳台。分房间安排家具，再把各处使用空间串成一条不重走的验收路线。',w:8,h:8,large:true,zeroNatural:true,startLabel:'起',endLabel:'终',
 rooms:[{id:'bedroom',label:'卧室',x:0,y:0,w:4,h:4,color:b},{id:'bath',label:'卫生间',x:4,y:0,w:2,h:4,color:a},{id:'balcony',label:'阳台',x:6,y:0,w:2,h:4,color:u},{id:'living',label:'客厅',x:0,y:4,w:4,h:4,color:l},{id:'kitchen',label:'厨房',x:4,y:4,w:4,h:4,color:k}],
 doors:[[[3,3],[3,4]],[[3,5],[4,5]],[[6,4],[6,3]],[[6,1],[5,1]],[[3,1],[4,1]]],start:[0,2],end:[5,3],
 windows:[2,3,6,7].map(x=>({cell:[x,0],out:[x,-1]})),items,
 activities:[{id:'bed-area',room:'bedroom',label:'卧室活动区',w:2,h:2},{id:'living-area',room:'living',label:'客厅活动区',w:2,h:2},{id:'dry-area',room:'balcony',label:'晾晒区',w:2,h:2}],
 rules:[...items.map(roomRule),wall('bed','床头靠实墙'),{id:'desk-window',kind:'window',item:'desk',text:'书桌背面完整靠窗'},wall('sofa','沙发背面靠实墙'),wall('media','电视柜背面靠实墙'),{id:'sofa-coffee',kind:'faces',item:'sofa',other:'coffee',distance:3,text:'茶几在沙发前隔两排空格，完全对齐'},...['fridge','stove','counter','shower','toilet','basin'].map(id=>wall(id,`${items.find(i=>i.id===id).name}背面靠实墙`)),{id:'plant-window',kind:'window',item:'plant',text:'花架背面靠窗'}],
 displayClues:['家具按房间归属摆放，点选后看各自要求','床头、指定柜背与设备背面靠实墙','书桌、花架背面靠窗','茶几隔两排空格，对齐沙发','放好卧室、客厅活动区与阳台晾晒区','零自然留白；各功能区允许共享','从「起」到「终」经过各功能区，不重走'],
 layout:{bed:{x:0,y:0,t:0},desk:{x:2,y:0,t:0},cabinet:{x:0,y:3,t:2},sofa:{x:0,y:4,t:0},coffee:{x:0,y:7,t:0},media:{x:2,y:7,t:2},fridge:{x:4,y:4,t:0},dining:{x:7,y:4,t:1},stove:{x:4,y:7,t:2},sink:{x:5,y:7,t:2},counter:{x:6,y:6,t:2},shower:{x:4,y:0,t:0},toilet:{x:4,y:2,t:3},basin:{x:4,y:3,t:3},plant:{x:6,y:0,t:0},washer:{x:7,y:0,t:0}},
 activityExamples:{'bed-area':{x:2,y:2},'living-area':{x:2,y:4},'dry-area':{x:6,y:2}},
 exampleRoute:[[0,2],[1,2],[2,2],[2,1],[3,1],[3,2],[3,3],[3,4],[2,4],[2,5],[1,5],[1,6],[2,6],[3,6],[3,5],[4,5],[4,6],[5,6],[6,6],[6,5],[6,4],[6,3],[7,3],[7,2],[7,1],[6,1],[5,1],[5,2],[5,3]],
 insight:'家具、使用空间、三块功能留白和五个房间的门洞需要同时成立。房间内摆得下，并不保证能完成整屋的一笔验收。'
};
