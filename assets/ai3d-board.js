/* Responsive diagrams preserve the original board's labels and navigation. */
(() => {
  'use strict';
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
      [1461,4876,'全景图 → Janus-Pro','Panorama → Janus-Pro','#liangzhu-scene-understanding',3],
      [1461,4948,'Janus-Pro → 场景描述','Janus-Pro → Scene description','#liangzhu-scene-understanding',3],
      [1461,5017,'场景描述 → 提示词','Scene description → Prompt','#liangzhu-scene-understanding',3],
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
      [2383,1964,'LoRA\n画风控制','LoRA\nStyle control','#liangzhu-lora',5],
    ]
  };
  const element = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    return node;
  };
  const english = () => window.PortfolioI18n?.language === 'en';
  // Sample a route with real circles. Arrowhead pairs share one axial offset,
  // so line length, a corner or an animation cannot shift one arm against the other.
  function dotRoute(parent,points,{arrow=false,pitch=4.5,radius=1.15,keys=new Set(),attrs={}}={}) {
    const group=element('g',{class:'liangzhu-dot-route',...attrs});
    const segments=points.slice(1).map((point,index)=>({a:points[index],b:point,
      length:Math.hypot(point[0]-points[index][0],point[1]-points[index][1])}));
    const length=segments.reduce((sum,segment)=>sum+segment.length,0);
    const count=Math.max(1,Math.round(length/pitch));
    const dot=(x,y,index,head='')=>{
      const key=`${x.toFixed(3)},${y.toFixed(3)}`;
      if(keys.has(key))return;
      keys.add(key);
      const circle=element('circle',{cx:x,cy:y,r:radius,'data-dot-index':index});
      if(head)circle.dataset.arrowHead=head;
      circle.style.setProperty('--dot-index',index);
      group.append(circle);
    };
    for(let i=0;i<=count;i++){
      let distance=length*i/count;
      for(let j=0;j<segments.length;j++){
        const segment=segments[j];
        if(distance>segment.length&&j<segments.length-1){distance-=segment.length;continue;}
        const t=segment.length?distance/segment.length:0;
        dot(segment.a[0]+(segment.b[0]-segment.a[0])*t,segment.a[1]+(segment.b[1]-segment.a[1])*t,i);
        break;
      }
    }
    if(arrow){
      const last=[...segments].reverse().find(segment=>segment.length>.01);
      if(last){
        const [x,y]=last.b,dx=(last.b[0]-last.a[0])/last.length,dy=(last.b[1]-last.a[1])/last.length;
        group.dataset.arrowTip=`${x},${y}`;
        group.dataset.arrowAxis=`${dx},${dy}`;
        for(let row=1;row<=2;row++)for(const side of [-1,1])
          dot(x-dx*pitch*row-dy*pitch*row*side,y-dy*pitch*row+dx*pitch*row*side,count+row,`${row}:${side}`);
      }
    }
    parent.append(group);return group;
  }
  function dotArrow() {
    const svg=element('svg',{class:'liangzhu-dot-arrow','aria-hidden':'true'});
    const draw=()=>{
      const width=svg.clientWidth,height=svg.clientHeight;
      if(!width||!height)return;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
      dotRoute(svg,[[2,height/2],[width-2,height/2]],{arrow:true,pitch:4,radius:1.15});
    };
    new ResizeObserver(draw).observe(svg);
    requestAnimationFrame(draw);return svg;
  }
  function wrapCopy(measure,copy,width) {
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
  function installResearchBranches() {
    const host=document.getElementById('liangzhu-background');
    if(!host)return;
    const svg=element('svg',{class:'liangzhu-research-branches','aria-hidden':'true'});
    host.prepend(svg);
    let frame;
    const draw=()=>{
      frame=0;
      const box=host.getBoundingClientRect(),heading=host.querySelector('h3').getBoundingClientRect();
      const targets=[...host.querySelectorAll('h4')].map(e=>e.getBoundingClientRect());
      const stacked=heading.bottom<targets[0].top;
      const sx=(stacked?heading.left+Math.min(80,heading.width/2):heading.right+3)-box.left;
      const sy=(stacked?heading.bottom+6:heading.top+heading.height/2)-box.top;
      const tx=targets[0].left-box.left-7;
      const ys=targets.map(e=>e.top+e.height/2-box.top);
      const spine=stacked?tx-17:(sx+tx)/2;
      svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
      svg.replaceChildren();
      const keys=new Set(),junctions=[...new Set([sy,...ys])].sort((a,b)=>a-b);
      dotRoute(svg,[[sx,sy],[spine,sy]],{keys});
      junctions.slice(1).forEach((y,index)=>dotRoute(svg,[[spine,junctions[index]],[spine,y]],{keys}));
      ys.forEach(y=>dotRoute(svg,[[spine,y],[tx,y]],{arrow:true,keys,attrs:{'data-research-arrow':''}}));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
    new ResizeObserver(schedule).observe(host);
    addEventListener('portfolio:language',schedule);
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener('loadingdone',schedule);
    schedule();
  }
  function installAnalysisInteractions() {
    for(const sequence of document.querySelectorAll('[data-io-sequence]')){
      [...sequence.children].forEach((step,index)=>{
        step.style.setProperty('--io-step',index);
        const frame=element('svg',{class:'liangzhu-io-frame','aria-hidden':'true'});
        const outline=element('rect',{x:1.5,y:1.5});frame.append(outline);step.prepend(frame);
        new ResizeObserver(()=>{
          outline.setAttribute('width',step.clientWidth-3);outline.setAttribute('height',step.clientHeight-3);
        }).observe(step);
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
    document.querySelectorAll('[data-analysis-arrow]').forEach(host=>host.append(dotArrow()));
    installResearchBranches();
    for(const gallery of document.querySelectorAll('[data-crop-gallery]')){
      const buttons=[...gallery.querySelectorAll('button')];
      let hovered=-1,focused=-1,touched=-1,pointerType='mouse';
      const select=index=>{
        if(index<0)delete gallery.dataset.selected;
        else gallery.dataset.selected=String(index);
        if(gallery.dataset.cropGallery==='strip')
          gallery.style.setProperty('--crop-columns',buttons.map((_,i)=>i===index?'4fr':'1fr').join(' '));
        buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
      };
      const sync=()=>select(hovered>=0?hovered:focused>=0?focused:touched);
      gallery.addEventListener('pointerleave',()=>{hovered=-1;sync();});
      buttons.forEach((button,index)=>{
        button.addEventListener('pointerenter',event=>{
          if(event.pointerType==='touch')return;
          hovered=index;focused=-1;touched=-1;sync();
        });
        button.addEventListener('pointerleave',()=>{if(hovered===index)hovered=-1;sync();});
        button.addEventListener('pointerdown',event=>{
          pointerType=event.pointerType;
          if(pointerType!=='touch'){focused=-1;touched=-1;sync();}
        });
        button.addEventListener('focus',()=>{if(button.matches(':focus-visible')){focused=index;sync();}});
        button.addEventListener('blur',()=>{if(focused===index)focused=-1;sync();});
        button.addEventListener('click',event=>{
          if(pointerType==='touch'&&event.detail!==0){touched=touched===index?-1:index;focused=-1;sync();}
          else if(event.detail===0){focused=index;sync();}
        });
        button.addEventListener('keydown',event=>{
          if(event.key==='Escape'){hovered=focused=touched=-1;sync();return;}
          const direction=['ArrowRight','ArrowDown'].includes(event.key)?1:['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
          if(!direction)return;
          event.preventDefault();
          const next=(index+direction+buttons.length)%buttons.length;
          hovered=touched=-1;focused=next;sync();buttons[next].focus({preventScroll:true});
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
      ['提示词反推','Scene text'],['全景输入','Panorama'],['Janus-Pro','Janus-Pro'],['场景描述','Scene text'],
      ['Marble 生成','Marble'],['图像输入','Image input'],['语义引导','Text guide'],
      ['三维场景','3D scene']
    ];
    const wrap=(copy,width)=>wrapCopy(measure,copy,width);
    function paint() {
      frame=0;
      const laptopZoom=host.clientWidth>=720?1.18:host.clientWidth>=480?1.1:1;
      // Redraw the native diagram at a comparable screen proportion on monitors.
      const displayScale=innerWidth>1800?Math.max(1,Math.min(innerWidth/1512,innerHeight/982)):1;
      const zoom=Math.min(1.8,laptopZoom*displayScale);
      const width=host.clientWidth/zoom;
      if (!width) return;
      const next=`${width}:${zoom}:${english()}:${fontRevision}`;
      if (next===signature) return;
      signature=next;
      const narrow=width<600, fontSize=narrow?16:18, lineHeight=fontSize*1.4;
      const margin=narrow?10:16,gap=narrow?10:20,stageGap=narrow?20:40,turn=narrow?38:76;
      const slot=(width-margin*2-turn-gap*2-stageGap)/4;
      const positions=[margin,margin+slot+gap,margin+slot*2+gap+stageGap,margin+slot*3+gap*2+stageGap];
      const inset=narrow?11:15, tail=4, textWidth=slot-inset-tail-4;
      const padding=14, nodeGap=narrow?16:18, rowGap=narrow?36:44;
      svg.style.setProperty('--folded-font',`${fontSize}px`);
      svg.style.setProperty('--turn-stroke',narrow?'5.5px':'7.5px');
      const ruler=element('text',{class:'liangzhu-sankey-node',visibility:'hidden'});
      svg.replaceChildren(ruler);
      const style=getComputedStyle(ruler);
      measure.font=`${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      const nodes=labels.overview.map(([,,zh,en,href,stage],id)=>{
        const fullCopy=english()?en:zh;
        const phoneEnglish={0:'Style',1:'Img →\nimg',5:'Pano',9:'Text',13:'3D'};
        const copy=width<480&&english()&&phoneEnglish[id] ? phoneEnglish[id]
          : width<480&&id>=10&&id<=12 ? (english()?['Pano','Janus-Pro','Scene text'][id-10]:['全景图','Janus-Pro','场景描述'][id-10])
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
      svg.setAttribute('width',width);svg.setAttribute('height',height);svg.style.width=`${width*zoom}px`;
      host.dataset.zoom=String(zoom);
      svg.setAttribute('aria-label',english()?'Four connected workflows, in two folded rows':'两排折返的四个工作流');
      host.setAttribute('aria-label',svg.getAttribute('aria-label'));
      const paths=element('g',{'aria-hidden':'true',class:'liangzhu-sankey-paths'});
      const arrows=element('g',{'aria-hidden':'true'});
      for (const [from,to,tone] of connections) {
        const a=nodes[from],b=nodes[to],fold=a.row!==b.row,reverse=a.row===1;
        const sx=reverse?a.x+4:a.right,tx=fold||reverse?b.right:b.x+4;
        const sy=a.y,ty=b.y,half=narrow?2:2.7;
        const cx=fold?width-margin-5-(8-from)*(narrow?7:11):(sx+tx)/2;
        const turnJoin=positions[3]+slot+12;
        const d=fold
          ? `M${sx} ${sy}H${turnJoin}C${cx} ${sy} ${cx} ${ty} ${turnJoin} ${ty}H${tx}`
          : `M${sx} ${sy-half}C${cx} ${sy-half} ${cx} ${ty-half} ${tx} ${ty-half}`+
            `L${tx} ${ty+half}C${cx} ${ty+half} ${cx} ${sy+half} ${sx} ${sy+half}Z`;
        paths.append(element('path',{d,class:`liangzhu-sankey-mark tone-${tone}${fold?' liangzhu-sankey-turn':''}`,opacity:fold?'.46':'.34',
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
        heading.addEventListener('click',event=>{
          if(event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
          const target=document.querySelector(group.href);if(!target)return;
          event.preventDefault();
          history.pushState(null,'',group.href);
          target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
        });
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
        const leader=element('g',{class:'liangzhu-overview-leader','aria-hidden':'true','data-leader-stage':group.stage});
        heading.append(leader);
        callouts.at(-1).leader={element:leader,x,end:x+groupWidth-10,boxY};
        frames.append(heading);
      }
      svg.replaceChildren(frames,paths,arrows);
      for(const {number,title,y,leader} of callouts){
        const box=number.getBBox();
        number.setAttribute('transform',`translate(0 ${y-box.y})`);
        title.setAttribute('transform',`translate(0 ${y+26-title.getBBox().y})`);
        const cy=y+box.height/2;
        dotRoute(leader.element,[[leader.x+8+box.width+12,cy],[leader.end,cy],[leader.end,leader.boxY]],{pitch:5,radius:.9});
      }
      for (const node of nodes) {
        const link=element('g',{class:'liangzhu-sankey-node',role:'group',
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
    addEventListener('resize',schedule,{passive:true});
    document.fonts.addEventListener('loadingdone',()=>{fontRevision++;schedule();});
    document.fonts.ready.then(()=>{fontRevision++;schedule();});
    paint();
  }
  function installRepaintPath(host) {
    const svg=element('svg',{role:'group',class:'liangzhu-sankey liangzhu-repaint-responsive'});
    const measure=document.createElement('canvas').getContext('2d');
    const stages=[
      {root:0,children:[1,2],serial:true,tone:'green'},
      {root:3,children:[4],serial:true,tone:'violet'},
      {root:5,children:[6,7],serial:true,tone:'ochre'},
      {root:8,children:[9,10,11,12],serial:true,tone:'violet'},
      {root:13,children:[14,15],serial:false,tone:'green'}
    ];
    const compact={0:['预处理','Input'],3:['提示词构建','Prompt'],5:['双重约束','ControlNet'],8:['三阶采样','Sampling'],13:['模型选择','Models']};
    host.replaceChildren(svg);host.removeAttribute('tabindex');
    let frame=0,signature='',fontRevision=0;
    const paint=()=>{
      frame=0;
      const width=host.clientWidth;if(!width)return;
      const next=`${width}:${english()}:${fontRevision}`;if(next===signature)return;signature=next;
      const narrow=width<560,fontSize=narrow?16:18,lineHeight=fontSize*1.4;
      const pad=narrow?8:20,parentWidth=Math.min(240,width*.29),gap=narrow?36:70;
      let leafX=pad+parentWidth+gap;
      const nodeGap=narrow?18:14,rowGap=narrow?24:20,rowPad=10;
      svg.style.setProperty('--repaint-font',`${fontSize}px`);
      const ruler=element('text',{class:'liangzhu-sankey-node',visibility:'hidden'});svg.replaceChildren(ruler);
      const style=getComputedStyle(ruler);
      measure.font=`${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      const roots=new Set(stages.map(stage=>stage.root));
      const nodes=labels.repaint.map(([,,zh,en,href,stage],id)=>{
        const fullCopy=(english()?en:zh).replaceAll('\n',' · ');
        const copy=narrow&&compact[id]?compact[id][english()?1:0]:fullCopy;
        const root=roots.has(id),textWidth=root?parentWidth-28:width-pad-leafX-20;
        const lines=wrapCopy(measure,copy,textWidth);
        return{id,copy,fullCopy,href,stage,root,lines,height:lines.length*lineHeight,x:root?pad+6:leafX};
      });
      let y=12;
      stages.forEach((stage,index)=>{
        const children=stage.children.map(id=>nodes[id]);
        const childHeight=children.reduce((sum,node)=>sum+node.height,0)+(children.length-1)*nodeGap;
        const rowHeight=Math.max(childHeight,nodes[stage.root].height)+rowPad*2;
        const root=nodes[stage.root];root.y=y+rowHeight/2;root.tone=stage.tone;
        let childY=y+rowPad+(rowHeight-rowPad*2-childHeight)/2;
        children.forEach(node=>{node.y=childY+node.height/2;node.tone=stage.tone;childY+=node.height+nodeGap;});
        stage.y=y;stage.height=rowHeight;y+=rowHeight+(index<stages.length-1?rowGap:0);
      });
      const contentRight=Math.max(...nodes.map(node=>node.x+14+Math.max(...node.lines.map(line=>measure.measureText(line).width))))+pad;
      const offset=Math.max(0,(width-contentRight)/2);
      nodes.forEach(node=>{node.x+=offset;});leafX+=offset;
      svg.setAttribute('viewBox',`0 0 ${width} ${y+12}`);
      svg.setAttribute('width',width);svg.setAttribute('height',y+12);
      svg.setAttribute('aria-label',english()?'Repainting path: stages on the left, components on the right':'初步实现路径：左侧阶段，右侧组件');
      host.setAttribute('aria-label',svg.getAttribute('aria-label'));
      const wires=element('g',{class:'liangzhu-repaint-wires','aria-hidden':'true'});svg.replaceChildren(wires);
      const route=(from,to,points,stage,keys)=>dotRoute(wires,points,{arrow:true,keys,
        attrs:{'data-repaint-from':from,'data-repaint-to':to,'data-path-stage':stage}});
      for(const stage of stages){
        const root=nodes[stage.root],children=stage.children.map(id=>nodes[id]);
        const right=root.x+14+Math.max(...root.lines.map(line=>measure.measureText(line).width))+9;
        const spine=leafX-23,keys=new Set();
        const first=children[0];
        route(root.id,first.id,[[right,root.y],[spine,root.y],[spine,first.y],[first.x-8,first.y]],root.stage,keys);
        children.slice(1).forEach((child,index)=>{
          if(stage.serial){const previous=children[index];
            route(previous.id,child.id,[[child.x,previous.y+7],[child.x,child.y-7]],root.stage,keys);
          }else route(root.id,child.id,[[right,root.y],[spine,root.y],[spine,child.y],[child.x-8,child.y]],root.stage,keys);
        });
      }
      for(const [from,to] of [[0,3],[3,5],[5,8],[13,8]]){
        const a=nodes[from],b=nodes[to],down=b.y>a.y;
        route(from,to,[[a.x,a.y+(down?1:-1)*(a.height/2+9)],[b.x,b.y+(down?-1:1)*(b.height/2+9)]],a.stage);
      }
      for(const node of nodes){
        const link=element('g',{class:'liangzhu-sankey-node',role:'group','data-path-stage':node.stage,
          'data-repaint-node':node.id,'aria-label':node.fullCopy});
        const title=element('title');title.textContent=node.fullCopy;link.append(title);
        const textX=node.x+14;
        const boxWidth=Math.max(...node.lines.map(line=>measure.measureText(line).width))+22;
        link.append(element('rect',{x:node.x-5,y:node.y-node.height/2-6,width:boxWidth,height:node.height+12,fill:'transparent'}));
        link.append(element('circle',{cx:node.x,cy:node.y,r:node.root?4:3.2,class:`liangzhu-sankey-mark tone-${node.tone}`}));
        const text=element('text',{'data-repaint-label':node.id});
        node.lines.forEach((line,index)=>{const span=element('tspan',{x:textX,y:node.y+index*lineHeight});span.textContent=line;text.append(span);});
        link.append(text);svg.append(link);
        text.setAttribute('transform',`translate(0 ${node.y-text.getBBox().y-text.getBBox().height/2})`);
        const focus=()=>{svg.dataset.activeStage=String(node.stage);},blur=()=>{delete svg.dataset.activeStage;};
        link.addEventListener('pointerenter',focus);link.addEventListener('pointerleave',blur);
        link.addEventListener('focus',focus);link.addEventListener('blur',blur);
      }
      host.dataset.ready='true';host.dataset.layout='left-right';
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
    new ResizeObserver(schedule).observe(host);addEventListener('portfolio:language',schedule);
    document.fonts.ready.then(()=>{fontRevision++;schedule();});
    document.fonts.addEventListener('loadingdone',()=>{fontRevision++;schedule();});paint();
  }
  async function render() {
    try {
      for(const host of document.querySelectorAll('[data-sankey]')) {
        if(host.dataset.sankey==='overview')installFoldedOverview(host);
        else if(host.dataset.sankey==='repaint')installRepaintPath(host);
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
