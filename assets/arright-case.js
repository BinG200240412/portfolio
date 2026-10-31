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
    const renderGarden=()=>{
      document.querySelector('.garden-web img').src='../assets/works/arright/history/garden-relations-source'+(en()?'-en':'')+'.svg';
    };
    const renderPlan=()=>{
      const picture=planFigure.querySelector('img');
      picture.src=`../assets/works/arright/plans/${activePlan}.svg`;
      picture.alt=`${activePlan} · ${plans[activePlan][en()?1:0]}`;
      picture.setAttribute('aria-label',(en()?'Enlarge image: ':'放大查看：')+picture.alt);
      planFigure.querySelector('figcaption').textContent=en()?'Rendered from archived prototype data · A demonstration, not an unaided player solution':'历史原型源数据生成 · 示范布局，非玩家盲解';
    };
    const hasIsland=image=>/home-0-1|paper-curl-actual-frame|poster-sudoku-20261012|garden-growth-20261006|board-study/.test(image.getAttribute('src')||'');
    const syncDeviceButtons=()=>document.querySelectorAll('.arright-device-open,.arright-art-open').forEach(button=>{
      const image=button.querySelector('img');if(!image)return;
      image.closest('.sudoku-device')?.classList.toggle('has-native-island',hasIsland(image));
      button.setAttribute('aria-label',(en()?'Enlarge image: ':'放大查看：')+image.alt);
    });
    const renderShot=()=>{
      const picture=detailFigure.querySelector('img');
      picture.src=`../assets/works/arright/native/${activeShot}.webp`;
      const label=native[activeShot][en()?1:0];
      picture.alt=`0.2.0 · ${label} · ${en()?'iPhone Air simulator':'iPhone Air 模拟器'}`;
      picture.setAttribute('aria-label',(en()?'Enlarge image: ':'放大查看：')+picture.alt);
      picture.closest('.sudoku-device')?.classList.toggle('has-native-island',hasIsland(picture));
      detailFigure.querySelector('figcaption').textContent=`0.2.0 · ${label} · ${en()?'Simulator':'模拟器'}`;
    };
    const select=(button,attribute)=>{
      button.parentElement.querySelectorAll(`[${attribute}]`).forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
    };
    document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{activePlan=button.dataset.plan;select(button,'data-plan');renderPlan();}));
    document.querySelectorAll('[data-native-shot]').forEach(button=>button.addEventListener('click',()=>{activeShot=button.dataset.nativeShot;select(button,'data-native-shot');renderShot();syncDeviceButtons();}));
    document.querySelectorAll('[data-garden-stage]').forEach(button=>button.addEventListener('click',()=>{
      select(button,'data-garden-stage');
      document.getElementById('garden-growth-art').hidden=button.dataset.gardenStage!=='growth-art';
      document.getElementById('garden-growth').hidden=button.dataset.gardenStage!=='growth';
      document.getElementById('garden-current').hidden=button.dataset.gardenStage!=='current';
    }));
    document.querySelectorAll('[data-shell-version]').forEach(button=>button.addEventListener('click',()=>{
      select(button,'data-shell-version');
      document.getElementById('shell-old').hidden=button.dataset.shellVersion!=='old';
      document.getElementById('shell-restored').hidden=button.dataset.shellVersion!=='restored';
    }));
    let posterView='art';
    const renderPoster=()=>{
      document.querySelectorAll('[data-poster-panel]').forEach(panel=>panel.hidden=panel.dataset.posterPanel!==posterView);
      document.getElementById('poster-source-caption').textContent=posterView==='art'
        ?(en()?'Poster Sudoku stage · Original SVG illustration':'海报数独阶段 · 原始 SVG 插画')
        :(en()?'Poster Sudoku stage · Simulator, 12 Oct 2026':'海报数独阶段 · 2026.10.12 模拟器');
    };
    document.querySelectorAll('[data-poster-view]').forEach(button=>button.addEventListener('click',()=>{posterView=button.dataset.posterView;select(button,'data-poster-view');renderPoster();}));
    const viewer=document.getElementById('media-viewer'),target=document.getElementById('arright-viewer-image'),caption=document.getElementById('arright-viewer-caption');
    let trigger=null,previousOverflow='';
    const syncViewer=()=>{
      viewer.setAttribute('aria-label',en()?'Image detail':'图片详情');
      viewer.querySelector('.viewer-close').setAttribute('aria-label',en()?'Close image':'关闭图片');
      if(trigger)caption.textContent=trigger.querySelector('img').alt;
    };
    document.querySelectorAll('.arright-device-open,.arright-art-open').forEach(button=>button.addEventListener('click',()=>{
      if(viewer.open)return;
      trigger=button;const image=button.querySelector('img').cloneNode(false);image.removeAttribute('loading');image.removeAttribute('fetchpriority');
      const sourceDevice=button.querySelector('.sudoku-device'),device=sourceDevice?.cloneNode(false);
      if(device){device.append(image);target.replaceChildren(device);}else{image.removeAttribute('data-media-corners');image.removeAttribute('data-media-corners-ignore');target.replaceChildren(image);}
      previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      document.documentElement.classList.add('media-detail-open');syncViewer();viewer.showModal();viewer.scrollTop=0;
    }));
    viewer.querySelector('.viewer-close').addEventListener('click',()=>viewer.close());
    viewer.addEventListener('click',event=>{if(event.target===viewer||event.target===target)viewer.close();});
    viewer.addEventListener('close',()=>{
      document.body.style.overflow=previousOverflow;document.documentElement.classList.remove('media-detail-open');target.replaceChildren();
      if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;
    });
    addEventListener('pagehide',()=>{if(viewer.open)viewer.close();});
    addEventListener('portfolio:language',()=>{renderGarden();renderPlan();renderShot();renderPoster();syncDeviceButtons();syncViewer();});
    renderGarden();renderPlan();renderShot();renderPoster();syncDeviceButtons();syncViewer();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
