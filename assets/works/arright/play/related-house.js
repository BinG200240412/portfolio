import {IRREGULAR_HOUSE} from './irregular-house.js';

// A new commission on P06's exact floor, not a mutation of the old puzzle.
const base=structuredClone(IRREGULAR_HOUSE),bar={solid:[[0,0],[1,0]],use:[[0,1],[1,1]]};
const items=base.items.map(i=>{
 if(i.id==='desk')return {...i,id:'dresser',name:'窗下斗柜',hint:'低斗柜背面完整靠窗；前方两格用于取放，不能摆其他家具。'};
 if(i.id==='cabinet')return {...i,name:'高衣柜',hint:'背面靠实墙，不占窗边格；柜前两格供开门，与床尾通道接通。'};
 if(i.id==='bookcase')return {...i,id:'desk',name:'书桌',zoneLabel:'座位区',useCheckText:'书桌座位区仅允许配套书椅，其余位置留空',hint:'侧面贴窗。桌前两格放一把面向书桌的配套书椅，另一格留空。'};
 if(i.id==='sofa')return {...i,use:[[0,1],[1,1]],hint:'本题为紧凑双人沙发：正前方一排两格留空，背靠实墙；与电视正对，茶几居中对齐。'};
 if(i.id==='coffee')return {...i,hint:'在沙发和电视之间，三件对齐；茶几没有独立使用区。'};
 if(i.id==='media')return {...i,hint:'背靠实墙，正面朝沙发；柜前两格留空。'};
 if(i.id==='shoe')return {...i,...bar,hint:'放在玄关，开口朝向已画定的换鞋区。箭头是开口方向，柜前两格留空。'};
 if(i.id==='washer')return {...i,hint:'放在阳台，开门前一格留空，并紧接晾晒区，便于取衣。'};
 if(i.id==='sink')return {...i,hint:'水槽操作面前留一格；操作区与备餐区相接。'};
 if(i.id==='counter')return {...i,hint:'L 形转角台背靠实墙，内角为操作区；操作区与备餐区相接。'};
 return i;
});
items.push({id:'chair',name:'书椅',letter:'S',color:'#648f91',room:'living',solid:[[0,0]],use:[[0,-1]],zoneLabel:'退椅区',useCheckText:'书椅背后一格保留抽拉空间',hint:'紧贴桌前沿、正面朝向书桌；椅背后一格留空，可与活动区共享。'});
const r=(id,kind,item,text,extra={})=>({id,kind,item,text,...extra});
const roomsRules=items.map(i=>r(`room-${i.id}`,'room',i.id,`${i.name}放在${base.rooms.find(z=>z.id===i.room).label}`,{room:i.room}));
const inherited=base.rules.filter(r=>r.kind!=='room'&&!['desk-window','sofa-coffee'].includes(r.id));
export const RELATED_HOUSE={
 ...base,id:'P08',name:'住得顺，才摆得对。',short:'整屋关系题',focus:'家具配套、采光与整屋通行',relations:true,
 aim:'同一套转角住宅，加入真实的使用关系。客厅桌椅配套、沙发面向电视，玄关能换鞋，洗衣后就近晾晒。让所有功能区接得上，再走完一笔验收。',
 items,useOccupants:{desk:['chair']},fixedSpaceLabel:'固定通行区',
 windows:[...base.windows,...[6,7,8,9].map(y=>({cell:[0,y],out:[-1,y]}))],
 fixedSpaces:[...base.fixedSpaces,{id:'entry-change',label:'入户换鞋区',room:'entry',cells:[[4,10],[4,11]]}],
 rules:[...roomsRules,...inherited,
  r('dresser-window','window','dresser','窗下低斗柜背面完整靠窗'),
  r('wardrobe-wall','wall','cabinet','高衣柜背面靠实墙'),
  r('wardrobe-window','windowClear','cabinet','高衣柜不占窗边格'),
  r('bed-storage','useConnects','bed','床尾通道与衣柜开门区相接，可共享',{other:'cabinet'}),
  r('living-watch','watchGroup','sofa','沙发与电视正对，茶几居中，三件对齐',{other:'media',third:'coffee'}),
  r('living-seat','seatAtDesk','desk','书椅紧贴桌前沿，正面朝向书桌',{other:'chair'}),
  r('living-light','windowSide','desk','书桌侧面贴客厅窗，取得侧向采光'),
  r('entry-shoe','opensTo','shoe','鞋柜开口朝入户换鞋区，柜前完整留空',{zone:'entry-change'}),
  r('sink-prep','useAtArea','sink','备餐区紧接水槽操作区，可共享',{area:'prep-area'}),
  r('counter-prep','useAtArea','counter','备餐区紧接转角台操作区，可共享',{area:'prep-area'}),
  r('wash-dry','useAtArea','washer','洗衣机开门区紧接晾晒区，可共享',{area:'dry-area'})
 ],
 displayClues:['沿用转角住宅：六个空间，固定折线走廊','按房间切换，查看该房间的配套条件','书椅朝桌，沙发—茶几—电视成组','窗约束采光；门洞与换鞋区保持畅通','所有使用区留空；仅书桌座位允许配套书椅','零自然留白；路线不能替空格补用途','从玄关「入」到厨房「终」，经过各功能区，不重走'],
 roomClues:{
  bedroom:['床头、高衣柜背靠实墙；高柜不挡窗','窗下低斗柜靠窗，前方两格留空','床尾通道与衣柜开门区相接，可共享','卧室保留 2 × 2 活动区'],
  living:['紧凑双人沙发前留一排，与电视正对','茶几居中，沙发、茶几、电视完全对齐','书桌侧面贴窗；书椅紧贴桌沿、朝向桌面','桌前一格放配套书椅，另一格留空','椅背后一格供抽拉；客厅活动区 2 × 2'],
  entry:['换鞋区是门内的两格固定通行空间','鞋柜开口朝向换鞋区；不占门洞或走廊'],
  kitchen:['冰箱、灶台、转角台背面靠实墙','备餐区为 2 × 1，不可随意扩大','备餐区同时接着水槽与转角台操作区','餐桌用餐侧、设备操作面都要留空'],
  balcony:['花架背面靠窗，前方留一格','洗衣机开门区紧接 2 × 2 晾晒区','晾晒区与使用区可以共享，不能放实体'],
  bath:['淋浴、马桶、台盆放在卫生间，背靠实墙','各设备前方操作区、门洞保持留空']
 },
 layout:{...base.layout,dresser:base.layout.desk,desk:{x:0,y:6,t:0},chair:{x:0,y:7,t:2},sofa:{x:2,y:6,t:0},coffee:{x:2,y:8,t:0},media:{x:2,y:10,t:2},shoe:{x:5,y:10,t:1}},
 activityExamples:{...base.activityExamples,'living-area':{x:0,y:8}},
 exampleRoute:null,
 insight:'家具先服务使用：书椅面向桌面，开柜、抽椅、备餐和晾晒各有空间。窗提供采光，门和走廊组织通行；所有空格都有用途，路线只负责把它们串起来。这是格点逻辑模型，不是施工图。'
};
delete RELATED_HOUSE.layout.bookcase;
