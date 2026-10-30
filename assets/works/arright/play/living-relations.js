const bar={solid:[[0,0],[1,0]],use:[[0,1],[1,1]]};
const r=(id,kind,item,text,extra={})=>({id,kind,item,text,...extra});
export const LIVING_RELATIONS={
 id:'P07',revision:2,name:'客厅里的连锁推理',short:'客厅关系题',focus:'桌椅配套、侧向采光与入户通行',relations:true,zeroNatural:true,w:4,h:6,
 aim:'书椅面向书桌，桌侧获得采光，椅背后留出抽拉空间。再把沙发、茶几和电视一起摆好，保持入户通畅。',
 rooms:[{id:'living',label:'客厅',x:0,y:0,w:4,h:6}],start:[0,2],end:[0,4],startLabel:'入',endLabel:'终',
 externalDoors:[{cell:[0,2],out:[-1,2]}],windows:[0,1,2,3].map(y=>({cell:[3,y],out:[4,y]})),
 useOccupants:{desk:['chair']},
 fixedSpaceLabel:'入户区',fixedSpaces:[{id:'entry',room:'living',label:'入户缓冲区',cells:[[0,2],[1,2]]}],
 items:[
  {...bar,id:'sofa',name:'双人沙发',letter:'A',color:'#7b8194',use:[[0,1],[1,1],[0,2],[1,2]],hint:'前方 2 × 2 留空；与电视正对。箭头指向观看方向。'},
  {...bar,id:'coffee',name:'茶几',letter:'B',color:'#9b8862',use:[],hint:'横放在沙发与电视之间，与两者对齐。朝向不影响茶几。'},
  {...bar,id:'tv',name:'电视柜',letter:'C',color:'#7b8194',hint:'正面对着沙发，柜前两格留空；与高书柜并排、朝向相同。'},
  {...bar,id:'cabinet',name:'高书柜',letter:'D',color:'#a76d52',hint:'与电视柜并排、朝向相同；任何部分都不能占窗边格。柜前两格留空。'},
  {...bar,id:'desk',name:'书桌',letter:'E',color:'#6b8578',zoneLabel:'座位区',useCheckText:'书桌座位区仅允许配套书椅，其余位置留空',hint:'书桌左侧或右侧贴窗，取得侧向采光。桌前两格是座位区：其中一格放配套书椅，另一格留空。'},
  {id:'chair',name:'书椅',letter:'F',color:'#648f91',solid:[[0,0]],use:[[0,-1]],zoneLabel:'退椅区',useCheckText:'书椅背后一格保留抽拉空间',hint:'贴着书桌前沿，正面朝向书桌。箭头指向书桌；椅背后一格是退椅区，必须留空。'}
 ],
 activity:{w:2,h:2,room:'living',label:'客厅活动区'},
 rules:[
  r('watch-group','watchGroup','sofa','沙发与电视柜正对，茶几在两者之间，三件完全对齐',{other:'tv',third:'coffee'}),
  r('storage-pair','sideBySide','tv','电视柜和高书柜并排相邻，正面朝向相同',{other:'cabinet'}),
  r('cabinet-window','windowClear','cabinet','高书柜不占任何窗边格'),
  r('desk-chair','seatAtDesk','desk','书椅紧贴桌前沿，正面朝向书桌',{other:'chair'}),
  r('desk-light','windowSide','desk','书桌左侧或右侧贴窗，获得侧向采光')
 ],
 displayClues:['书椅贴着桌前沿，正面朝向书桌','桌前座位区放一把书椅，另一格留空','椅背后一格留空，供抽拉和通行','书桌侧面贴窗；高书柜不能占窗边格','沙发与电视正对，茶几居中、三件对齐','高书柜与电视柜并排相邻、同向','入户两格不放家具；活动区 2 × 2 可共享','零自然留白；从「入」到「终」不重走'],
 layout:{sofa:{x:0,y:0,t:0},coffee:{x:0,y:3,t:0},tv:{x:0,y:5,t:2},cabinet:{x:2,y:5,t:2},desk:{x:2,y:0,t:0},chair:{x:3,y:1,t:2}},
 activityExample:{x:2,y:2},
 insight:'桌椅按真实使用关系配套：书椅面对桌沿，椅背后可抽拉；窗约束桌侧采光，门约束通行。座位由实体计数，退椅空间保持留空，路线不会给空格补用途。'
};
