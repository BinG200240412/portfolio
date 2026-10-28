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
      [1828,4943,'MARBLE 模型生成','MARBLE generation','#workflow-four',4],
      [2177,4826,'PANO → 图像输入 → MARBLE','PANO → Image input → MARBLE','#liangzhu-marble-handoff',4],
      [2177,4952,'TEXT → 语义引导 → MARBLE','TEXT → Semantic guidance → MARBLE','#liangzhu-marble-handoff',4],
      [2177,5077,'MARBLE → GAUSSIAN SPLATTING','MARBLE → GAUSSIAN SPLATTING','#process-result',4],
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
  function dotArrow() {
    const svg=element('svg',{viewBox:'0 0 64 32',class:'liangzhu-dot-arrow','aria-hidden':'true'});
    svg.append(element('path',{d:'M2 16H59M44 3L59 16L44 29','vector-effect':'non-scaling-stroke'}));
    return svg;
  }
  function installAnalysisInteractions() {
    const sequence=document.querySelector('[data-io-sequence]');
    if(sequence){
      [...sequence.children].forEach((step,index)=>{
        step.style.setProperty('--io-step',index);
        if(index<2)step.append(dotArrow());
      });
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){
          sequence.classList.add('is-running');observer.disconnect();
        }
      },{threshold:.35});
      observer.observe(sequence);
    }
    document.querySelector('.liangzhu-research-flow')?.append(dotArrow());
    document.querySelector('.liangzhu-research-down')?.append(dotArrow());
    for(const gallery of document.querySelectorAll('[data-crop-gallery]')){
      const buttons=[...gallery.querySelectorAll('button')];
      const select=index=>{
        if(index<0)delete gallery.dataset.selected;
        else gallery.dataset.selected=String(index);
        buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
      };
      buttons.forEach((button,index)=>{
        button.addEventListener('click',()=>select(gallery.dataset.selected===String(index)?-1:index));
        button.addEventListener('keydown',event=>{
          if(event.key==='Escape'){select(-1);return;}
          const direction=['ArrowRight','ArrowDown'].includes(event.key)?1:['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
          if(!direction)return;
          event.preventDefault();
          const next=(index+direction+buttons.length)%buttons.length;
          select(next);buttons[next].focus({preventScroll:true});
        });
      });
    }
  }
  function installFoldedOverview(host) {
    const svg = element('svg',{role:'group',class:'liangzhu-sankey liangzhu-sankey-folded'});
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d');
    host.replaceChildren(svg);
    let frame = 0, signature = '', fontRevision = 0;
    const columns = [[0],[1,2,3,4],[5],[6,7,8],[9],[10,11,12],[13],[14,15,16]];
    const connections = [
      [0,1,'green'],[0,2,'green'],[0,3,'green'],[0,4,'green'],
      [1,5,'green'],[2,5,'ochre'],[3,5,'violet'],[4,5,'ochre'],
      [5,6,'violet'],[5,7,'violet'],[5,8,'violet'],
      [6,9,'green'],[7,9,'ochre'],[8,9,'violet'],
      [9,10,'ochre'],[9,11,'ochre'],[9,12,'ochre'],
      [10,13,'ochre'],[11,13,'green'],[12,13,'violet'],
      [13,14,'violet'],[13,15,'violet'],[13,16,'violet']
    ];
    const tones = ['green','green','ochre','violet','ochre','violet','green','ochre',
      'violet','ochre','ochre','green','violet','violet','ochre','ochre','green'];
    const compactLabels = [
      ['风格重绘','Repaint'],['以图生图','Img2img'],['良渚实景','Site image'],
      ['锁定结构','Keep shape'],['风格图','Style image'],['全景扩展','360° pano'],
      ['画风一致','Same style'],['360° 全景','360° view'],['2:1 比例','2:1 ratio'],
      ['提示词反推','Scene text'],['PANO → CLIP','PANO → CLIP'],['CLIP → TEXT','CLIP → TEXT'],['TEXT → PROMPT','TEXT → PROMPT'],
      ['Marble 生成','Marble'],['图像输入','Image input'],['语义引导','Text guide'],
      ['三维场景','3D scene']
    ];
    function wrap(copy,width) {
      const lines=[];
      for (const paragraph of copy.split('\n')) {
        let line='';
        const tokens=[];
        for (const part of paragraph.match(/[A-Za-z0-9°._-]+|\s+|[^\s]/gu)||[]) {
          if (tokens.length && (/^[，。；：！？、）】》」』]$/.test(part) || /^[（【《「『]$/.test(tokens.at(-1))))
            tokens[tokens.length-1]+=part;
          else tokens.push(part);
        }
        for (const token of tokens) {
          if (measure.measureText(line+token).width<=width) { line+=token; continue; }
          if (line.trim()) { lines.push(line.trim()); line=''; }
          if (measure.measureText(token).width<=width) { line=token.trimStart(); continue; }
          for (const letter of token) {
            if (line && measure.measureText(line+letter).width>width) {
              lines.push(line);line='';
            }
            line+=letter;
          }
        }
        if (line.trim()) lines.push(line.trim());
      }
      return lines;
    }
    function paint() {
      frame=0;
      const width=Math.min(host.clientWidth,840);
      if (!width) return;
      const next=`${width}:${english()}:${fontRevision}`;
      if (next===signature) return;
      signature=next;
      const narrow=width<600, fontSize=narrow?16:18, lineHeight=fontSize*1.4;
      const margin=12, gap=narrow?10:20, stageGap=narrow?20:40, turn=narrow?16:24, railInset=0;
      const slot=(width-margin*2-turn-gap*2-stageGap)/4;
      const positions=[margin,margin+slot+gap,margin+slot*2+gap+stageGap,margin+slot*3+gap*2+stageGap];
      const inset=narrow?11:15, tail=4, textWidth=slot-inset-tail-4;
      const padding=14, nodeGap=narrow?16:18, rowGap=narrow?36:44;
      svg.style.setProperty('--folded-font',`${fontSize}px`);
      const ruler=element('text',{class:'liangzhu-sankey-node',visibility:'hidden'});
      svg.replaceChildren(ruler);
      const style=getComputedStyle(ruler);
      measure.font=`${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      const nodes=labels.overview.map(([,,zh,en,href,stage],id)=>{
        const fullCopy=english()?en:zh;
        const phoneEnglish={0:'Style',1:'Img →\nimg',5:'Pano',9:'Text',13:'3D'};
        const copy=width<480&&english()&&phoneEnglish[id] ? phoneEnglish[id]
          : width<480&&id>=10&&id<=12 ? (english()?['Pano','Text','Prompt'][id-10]:['全景图','场景文本','提示词'][id-10])
          : compactLabels[id][english()?1:0];
        const lines=wrap(copy,textWidth);
        return {id,copy,fullCopy,href,stage,lines,height:Math.max(lineHeight,lines.length*lineHeight)};
      });
      const heights=columns.map(ids=>ids.reduce((sum,id)=>sum+nodes[id].height,0)+(ids.length-1)*nodeGap);
      const topHeight=Math.max(...heights.slice(0,4));
      const bottomHeight=Math.max(...heights.slice(4));
      const groups=[
        {stage:1,row:0,column:0,zh:'风格化重绘',en:'Style repainting',href:'#workflow-one'},
        {stage:2,row:0,column:2,zh:'图生全景',en:'Image to panorama',href:'#workflow-two'},
        {stage:3,row:1,column:2,zh:'提示词反推',en:'Prompt derivation',href:'#workflow-three'},
        {stage:4,row:1,column:0,zh:'Marble 模型生成',en:'Marble generation',href:'#workflow-four'}
      ];
      const titleSize=narrow?20:25,titleLine=titleSize*1.2;
      svg.style.setProperty('--overview-title',`${titleSize}px`);
      measure.font=`${style.fontWeight} ${titleSize}px ${style.fontFamily}`;
      groups.forEach(group=>{group.lines=wrap(english()?group.en:group.zh,slot*2+gap-10);});
      const headerHeights=[0,1].map(row=>28+Math.max(...groups.filter(g=>g.row===row).map(g=>g.lines.length))*titleLine+14);
      const rowTops=[padding,padding+headerHeights[0]+topHeight+padding*2+rowGap];
      const height=rowTops[1]+headerHeights[1]+bottomHeight+padding*2;
      measure.font=`${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      columns.forEach((ids,index)=>{
        const row=index<4?0:1, column=row?7-index:index;
        const available=row?bottomHeight:topHeight;
        let y=rowTops[row]+headerHeights[row]+padding+(available-heights[index])/2;
        ids.forEach(id=>{
          Object.assign(nodes[id],{row,column,x:positions[column],y:y+nodes[id].height/2});
          nodes[id].right=nodes[id].x+inset+Math.max(...nodes[id].lines.map(line=>measure.measureText(line).width))+5;
          y+=nodes[id].height+nodeGap;
        });
      });
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      svg.setAttribute('width',width);svg.setAttribute('height',height);svg.style.width=`${width}px`;
      svg.setAttribute('aria-label',english()?'Four connected workflows, in two folded rows':'两排折返的四个工作流');
      host.setAttribute('aria-label',svg.getAttribute('aria-label'));
      const paths=element('g',{'aria-hidden':'true',class:'liangzhu-sankey-paths'});
      const arrows=element('g',{'aria-hidden':'true'});
      for (const [from,to,tone] of connections) {
        const a=nodes[from],b=nodes[to],fold=a.row!==b.row,reverse=a.row===1;
        const sx=reverse?a.x+4:a.right,tx=fold||reverse?b.right:b.x+4;
        const sy=a.y,ty=b.y,half=narrow?2:2.7;
        const cx=fold?width-margin/2-railInset:(sx+tx)/2;
        const turnJoin=width-margin-turn-railInset+8;
        const d=fold
          ? `M${sx} ${sy-half}L${turnJoin} ${sy-half}C${cx} ${sy-half} ${cx} ${ty-half} ${turnJoin} ${ty-half}`+
            `L${tx} ${ty-half}L${tx} ${ty+half}L${turnJoin} ${ty+half}`+
            `C${cx} ${ty+half} ${cx} ${sy+half} ${turnJoin} ${sy+half}L${sx} ${sy+half}Z`
          : `M${sx} ${sy-half}C${cx} ${sy-half} ${cx} ${ty-half} ${tx} ${ty-half}`+
            `L${tx} ${ty+half}C${cx} ${ty+half} ${cx} ${sy+half} ${sx} ${sy+half}Z`;
        paths.append(element('path',{d,class:`liangzhu-sankey-mark tone-${tone}`,opacity:'.34',
          'data-flow-from':from,'data-flow-to':to,'data-path-stage':a.stage}));
        if ((from===0&&to===2)||(from===5&&to===7)||(from===7&&to===9)||
            (from===9&&to===11)||(from===13&&to===15)) {
          const x=fold?turnJoin*.25+cx*.75:(sx+tx)/8+cx*.75,y=(sy+ty)/2;
          const dx=fold?0:(tx-sx)*.75,dy=(ty-sy)*1.5;
          arrows.append(element('path',{d:'M-3.5 -3L4 0L-3.5 3Z',
            transform:`translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`,
            class:'liangzhu-sankey-mark tone-ink',opacity:'.65'}));
        }
      }
      const frames=element('g',{'class':'liangzhu-overview-groups'}),callouts=[];
      for(const group of groups){
        const x=positions[group.column]-7, y=rowTops[group.row], boxY=y+headerHeights[group.row];
        const groupWidth=slot*2+gap+14,bodyHeight=(group.row?bottomHeight:topHeight)+padding*2;
        frames.append(element('rect',{x,y:boxY,width:groupWidth,height:bodyHeight,
          class:'liangzhu-overview-frame','data-workflow-group':group.stage,'data-path-stage':group.stage}));
        const heading=element('a',{href:group.href,class:'liangzhu-overview-heading','data-path-stage':group.stage,
          'aria-label':english()?`Workflow ${group.stage}: ${group.en}`:`工作流${['','一','二','三','四'][group.stage]}：${group.zh}`});
        heading.append(element('rect',{x,y,width:groupWidth,height:headerHeights[group.row],fill:'transparent'}));
        const number=element('text',{x:x+8,y:y+14,class:'liangzhu-overview-number'});
        number.textContent=english()?`Workflow ${group.stage}`:`工作流${['','一','二','三','四'][group.stage]}`;
        heading.append(number);
        const title=element('text',{x:x+8,y:y+36,class:'liangzhu-overview-title'});
        group.lines.forEach((line,index)=>{
          const span=element('tspan',{x:x+8,y:y+36+index*titleLine});span.textContent=line;title.append(span);
        });
        heading.append(title);
        callouts.push({number,title,y});
        heading.append(element('path',{d:`M${x+94} ${y+10}H${x+groupWidth-10}V${boxY}`,
          class:'liangzhu-overview-leader','aria-hidden':'true'}));
        frames.append(heading);
      }
      svg.replaceChildren(frames,paths,arrows);
      for(const {number,title,y} of callouts){
        number.setAttribute('transform',`translate(0 ${y-number.getBBox().y})`);
        title.setAttribute('transform',`translate(0 ${y+26-title.getBBox().y})`);
      }
      for (const node of nodes) {
        const link=element('a',{href:node.href,class:'liangzhu-sankey-node',
          'aria-label':node.fullCopy.replaceAll('\n',' '),'data-node-id':node.id,
          'data-flow-row':node.row,'data-flow-column':node.column,'data-path-stage':node.stage});
        const tooltip=element('title');tooltip.textContent=node.fullCopy.replaceAll('\n',' ');link.append(tooltip);
        link.append(element('rect',{x:node.x-3,y:node.y-node.height/2-5,
          width:node.right-node.x+7,height:node.height+10,fill:'transparent'}));
        const circle=element('circle',{cx:node.x+4,cy:node.y,r:narrow?3.5:4.5,
          class:`liangzhu-sankey-mark tone-${tones[node.id]} liangzhu-overview-dot`});
        link.append(circle,element('rect',{x:node.right-1,y:node.y-7,
          width:2,height:14,class:`liangzhu-sankey-mark tone-${tones[node.id]}`}));
        const text=element('text',{x:node.x+inset,'data-node-label':node.id});
        node.lines.forEach((line,index)=>{
          const span=element('tspan',{x:node.x+inset,y:node.y+(index-(node.lines.length-1)/2)*lineHeight});
          span.textContent=line;text.append(span);
        });
        link.append(text);svg.append(link);
        // Align the actual glyph bounds, including wrapped English and CJK text.
        const box=text.getBBox();
        text.setAttribute('transform',`translate(0 ${node.y-box.y-box.height/2})`);
        const focus=()=>{svg.dataset.activeStage=String(node.stage);};
        const blur=()=>{delete svg.dataset.activeStage;};
        link.addEventListener('pointerenter',focus);link.addEventListener('pointerleave',blur);
        link.addEventListener('focus',focus);link.addEventListener('blur',blur);
      }
      host.dataset.ready='true';host.dataset.layout='folded';
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
    new ResizeObserver(schedule).observe(host);
    addEventListener('portfolio:language',schedule);
    document.fonts.addEventListener('loadingdone',()=>{fontRevision++;schedule();});
    document.fonts.ready.then(()=>{fontRevision++;schedule();});
    paint();
  }
  async function render() {
    try {
      const dataURL = new URL('works/ai3d/board/sankey-paths.json', scriptURL);
      dataURL.search = new URL(scriptURL).search;
      const response = await fetch(dataURL);
      if (!response.ok) throw Error('Diagram resource unavailable');
      const data = await response.json();
      for (const host of document.querySelectorAll('[data-sankey]')) {
        const kind = host.dataset.sankey, entry = data[kind];
        if (kind==='overview') { installFoldedOverview(host); continue; }
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
  installAnalysisInteractions();
  render();
})();
