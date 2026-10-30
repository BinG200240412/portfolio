/* Selection controls change documented source views, never simulate app progress. */
(() => {
  'use strict';
  const en = () => document.documentElement.lang.startsWith('en');
  const native = {
    'new-puzzle-restored-air': ['选题抽屉','Puzzle drawer'],
    'settings-restored-air': ['设置页面','Settings'],
    'settings-name-input-air': ['姓名输入与系统键盘','Name input and system keyboard'],
    'archive-restored-air': ['档案翻牌','Flip-card archive'],
    'awards-real-completion-air': ['真实完成后解锁的成就','Award unlocked after an actual completion'],
    'guide-restored-air': ['原生玩法教程','Native guide'],
    'paper-curl-actual-frame-air': ['Metal 卷纸 · 实际捕获帧','Metal page curl · Actual captured frame']
  };
  const plans = {
    P04:['16 格小屋：每格都有用途','16-cell home: every cell has a job'],
    P06:['87 格不规则住宅与折线走廊','87-cell irregular home with an angled corridor'],
    P07:['客厅修订 2：书桌采光、椅子朝桌、椅背抽拉区','Living room revision 2: desk light, a chair facing the desk and space behind it'],
    P08:['87 格、19 件家具的整屋关系','Whole-home relationships across 87 cells and 19 items of furniture']
  };
  function ready() {
    let activePlan='P04',activeShot='new-puzzle-restored-air';
    const planFigure=document.getElementById('plan-visual'),detailFigure=document.querySelector('.detail-shot');
    planFigure.dataset.i18nIgnore='';detailFigure.dataset.i18nIgnore='';
    const renderPlan=()=>{
      const picture=planFigure.querySelector('img');
      picture.src=`../assets/works/arright/plans/${activePlan}.svg`;
      picture.alt=`${activePlan} · ${plans[activePlan][en()?1:0]}`;
      picture.setAttribute('aria-label',(en()?'Enlarge image: ':'放大查看：')+picture.alt);
      planFigure.querySelector('figcaption').textContent=en()?'Rendered from archived prototype data · A demonstration, not an unaided player solution':'历史原型源数据生成 · 示范布局，非玩家盲解';
    };
    const renderShot=()=>{
      const picture=detailFigure.querySelector('img');
      picture.src=`../assets/works/arright/native/${activeShot}.webp`;
      const label=native[activeShot][en()?1:0];
      picture.alt=`0.2.0 · ${label} · ${en()?'iPhone Air simulator':'iPhone Air 模拟器'}`;
      picture.setAttribute('aria-label',(en()?'Enlarge image: ':'放大查看：')+picture.alt);
      detailFigure.querySelector('figcaption').textContent=`0.2.0 · ${label} · ${en()?'Simulator':'模拟器'}`;
    };
    const select=(button,attribute)=>{
      button.parentElement.querySelectorAll(`[${attribute}]`).forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
    };
    document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{activePlan=button.dataset.plan;select(button,'data-plan');renderPlan();}));
    document.querySelectorAll('[data-native-shot]').forEach(button=>button.addEventListener('click',()=>{activeShot=button.dataset.nativeShot;select(button,'data-native-shot');renderShot();}));
    document.querySelectorAll('[data-garden-stage]').forEach(button=>button.addEventListener('click',()=>{
      select(button,'data-garden-stage');
      document.getElementById('garden-growth').hidden=button.dataset.gardenStage!=='growth';
      document.getElementById('garden-current').hidden=button.dataset.gardenStage!=='current';
    }));
    document.querySelectorAll('[data-shell-version]').forEach(button=>button.addEventListener('click',()=>{
      select(button,'data-shell-version');
      document.getElementById('shell-old').hidden=button.dataset.shellVersion!=='old';
      document.getElementById('shell-restored').hidden=button.dataset.shellVersion!=='restored';
    }));
    addEventListener('portfolio:language',()=>{renderPlan();renderShot();});
    renderPlan();renderShot();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
