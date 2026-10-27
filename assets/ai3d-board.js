/* Original board curves remain vector paths; labels and navigation are native. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const ns = 'http://www.w3.org/2000/svg';
  const initialHash = location.hash;
  let readerMoved = false;
  const moved = () => { readerMoved = true; };
  for (const event of ['wheel','pointerdown','touchstart','keydown'])
    addEventListener(event,moved,{once:true,passive:true});
  // Native fragment placement happens before asynchronous graph layout. Correct
  // it once after layout, unless the reader has already started navigating.
  const graphLayoutReady = new Promise(resolve => {
    const hosts = [...document.querySelectorAll('[data-workflow-native]')];
    let observer;
    const check = () => {
      if (!hosts.every(host=>host.dataset.ready==='true')) return;
      observer?.disconnect(); resolve();
    };
    observer = new MutationObserver(check);
    hosts.forEach(host=>observer.observe(host,{attributes:true,attributeFilter:['data-ready']}));
    check();
  });
  const labels = {
    overview: [
      [103,4957,'风格化重绘','Repaint','#workflow-one',1],
      [315,4896,'以图生图','Img2img','#liangzhu-image-input',1],
      [315,4943,'输入良渚实景','Site image','#liangzhu-site-references',1],
      [315,4990,'锁定建筑结构','Keep structure','#liangzhu-controlnet',1],
      [315,5037,'输出相应画风图像','Style image output','#liangzhu-style-outputs',1],
      [600,4951,'全景图扩展','Panorama\nexpansion','#workflow-two',2],
      [820,4882,'保持画风一致','Retain style','#liangzhu-panorama-implementation',2],
      [820,4954,'输出相应风格360度全景图','360° panorama output','#liangzhu-panorama-outputs',2],
      [820,5026,'控制图像比例（全景图比例）','Control the panorama ratio','#liangzhu-panorama-geometry',2],
      [1215,4943,'提示词反推','Scene\ndescription','#liangzhu-scene-understanding',3],
      [1461,4876,'PANO → CLIP','PANO → CLIP','#liangzhu-scene-understanding',3],
      [1461,4948,'CLIP → TEXT','CLIP → TEXT','#liangzhu-scene-understanding',3],
      [1461,5017,'TEXT → PROMPT','TEXT → PROMPT','#liangzhu-scene-understanding',3],
      [1828,4943,'MARBLE 模型生成','MARBLE generation','#liangzhu-marble-handoff',3],
      [2177,4826,'PANO → 图像输入 → MARBLE','PANO → Image input → MARBLE','#liangzhu-marble-handoff',3],
      [2177,4952,'TEXT → 语义引导 → MARBLE','TEXT → Semantic guidance → MARBLE','#liangzhu-marble-handoff',3],
      [2177,5077,'MARBLE → GAUSSIAN SPLATTING','MARBLE → GAUSSIAN SPLATTING','#process-result',3],
    ],
    repaint: [
      [982,1664,'输入与预处理','Input preparation','#liangzhu-image-input',1],
      [900,1774,'图像缩放\nImageScale','Image scaling\nImageScale','#liangzhu-image-input',1],
      [1067,1774,'语义反推\nWD14Tagger','Semantic tags\nWD14Tagger','#liangzhu-image-input',1],
      [1339,1661,'提示词构建','Build the prompt','#liangzhu-image-input',2],
      [1347,1774,'风格触发词\nCR Text','Style trigger words\nCR Text','#liangzhu-lora',2],
      [1638,1659,'双重 ControlNet 约束','Two ControlNet constraints','#liangzhu-controlnet',3],
      [1573,1769,'Lineart Anime','Lineart Anime','#liangzhu-controlnet',3],
      [1782,1769,'Tile（分块控制）','Tile control','#liangzhu-controlnet',3],
      [2261,1650,'三阶迭代采样','Three sampling passes','#liangzhu-sampling',4],
      [2077,1774,'第一阶\nKSampler 1','First pass\nKSampler 1','#liangzhu-sampling',4],
      [2200,1774,'第二阶\nKSampler 2','Second pass\nKSampler 2','#liangzhu-sampling',4],
      [2350,1774,'中间放大\nLatentUpscale','Latent upscaling\nLatentUpscale','#liangzhu-sampling',4],
      [2510,1774,'第三阶\nKSampler 3','Third pass\nKSampler 3','#liangzhu-sampling',4],
      [2280,1857,'模型选择','Model choice','#liangzhu-lora',5],
      [2072,1964,'大模型\nFlat-2D Animerge V3.0','Base model\nFlat-2D Animerge V3.0','#liangzhu-lora',5],
      [2383,1964,'LoRA\n自训吉卜力风格场景','LoRA\nTrained Ghibli-style scenes','#liangzhu-lora',5],
    ]
  };
  const element = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    return node;
  };
  const english = () => window.PortfolioI18n?.language === 'en';
  async function render() {
    try {
      const dataURL = new URL('works/ai3d/board/sankey-paths.json', scriptURL);
      dataURL.search = new URL(scriptURL).search;
      const response = await fetch(dataURL);
      if (!response.ok) throw Error('Diagram resource unavailable');
      const data = await response.json();
      for (const host of document.querySelectorAll('[data-sankey]')) {
        const kind = host.dataset.sankey, entry = data[kind];
        const svg = element('svg', {viewBox:entry.viewBox.join(' '),role:'group',class:'liangzhu-sankey'});
        const title = element('title'); svg.append(title);
        const paths = element('g',{'aria-hidden':'true',class:'liangzhu-sankey-paths'});
        for (const original of entry.paths) {
          const cx = (original.bounds[0] + original.bounds[2]) / 2;
          const stage = kind === 'overview' ? (cx < 580 ? 1 : cx < 1190 ? 2 : 3)
            : (cx < 1250 ? 1 : cx < 1530 ? 2 : cx < 2000 ? 3 : original.bounds[1] > 1830 ? 5 : 4);
          paths.append(element('path',{d:original.d,class:`liangzhu-sankey-mark tone-${original.tone}`,
            opacity:original.opacity,'data-path-stage':stage,'data-source-path':original.source_index}));
        }
        svg.append(paths);
        const translated = [];
        for (const [x,y,zh,en,href,stage] of labels[kind]) {
          const link = element('a',{href,'data-path-stage':stage,class:'liangzhu-sankey-node'});
          const text = element('text',{x,y,'dominant-baseline':'middle'});
          link.append(text); svg.append(link); translated.push({link,text,x,y,zh,en});
          const focus = () => { svg.dataset.activeStage = String(stage); };
          const blur = () => { delete svg.dataset.activeStage; };
          link.addEventListener('pointerenter',focus); link.addEventListener('pointerleave',blur);
          link.addEventListener('focus',focus); link.addEventListener('blur',blur);
        }
        const translate = () => {
          title.textContent = english() ? kind === 'overview' ? 'The complete workflow' : 'Repainting path'
            : kind === 'overview' ? '工作流程总说明' : '初步实现路径';
          host.setAttribute('aria-label',title.textContent);
          for (const {link,text,x,y,zh,en} of translated) {
            const copy = english() ? en : zh;
            link.setAttribute('aria-label',copy.replaceAll('\n',' '));
            text.replaceChildren(...copy.split('\n').map((line,index) => {
              const span = element('tspan',{x,y:y+index*27}); span.textContent=line; return span;
            }));
          }
        };
        translate(); addEventListener('portfolio:language',translate);
        host.replaceChildren(svg); host.dataset.ready='true';
        let drag;
        host.addEventListener('pointerdown',event => {
          if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a')) return;
          drag={id:event.pointerId,x:event.clientX,left:host.scrollLeft};
          host.setPointerCapture(event.pointerId); host.classList.add('is-dragging');
        });
        host.addEventListener('pointermove',event => {
          if (drag?.id !== event.pointerId) return;
          host.scrollLeft=drag.left+drag.x-event.clientX;
        });
        const finish=()=>{drag=null;host.classList.remove('is-dragging');};
        host.addEventListener('pointerup',finish);host.addEventListener('pointercancel',finish);
      }
      await Promise.all([graphLayoutReady,document.fonts.ready]);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if (!initialHash || readerMoved || location.hash!==initialHash) return;
        const target = document.getElementById(decodeURIComponent(initialHash.slice(1)));
        target?.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
      }));
    } catch (error) {
      for (const status of document.querySelectorAll('.liangzhu-diagram-status'))
        status.textContent=english() ? 'The diagram could not load. Please refresh.' : '流程图暂时未能载入，请刷新。';
      console.error(error);
    }
  }
  render();
})();
