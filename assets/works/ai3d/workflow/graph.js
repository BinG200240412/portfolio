/* Native, independently editable workflow diagrams on a screen-wide scroll plane. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const NS = 'http://www.w3.org/2000/svg', XHTML = 'http://www.w3.org/1999/xhtml';
  const words = {
    zh: { hint: '拖空白 / 双指横滑浏览 · 捏合缩放 · 拖标题移动节点', fit: '全览', reset: '复位', reader: '原尺寸', loading: '正在展开工作流', error: '工作流暂时无法载入，请刷新重试。', canvas: '可编辑的工作流。空白处左右拖动、触控板双指横滑或触屏横滑浏览。捏合或 Ctrl / Command 加滚动缩放。拖动节点和分组标题可移动；双击看细节。普通纵向滚动继续浏览网页。参数编辑用于展示。' },
    en: { hint: 'Drag space / swipe sideways · Pinch to zoom · Drag titles to move nodes', fit: 'Overview', reset: 'Reset', reader: 'Reading size', loading: 'Unfolding the workflow', error: 'The workflow could not load. Refresh to retry.', canvas: 'Editable workflow. Drag blank space or swipe sideways to browse. Pinch or Ctrl / Command plus scroll to zoom. Drag node or group titles to move them; double-click to focus. Vertical scrolling continues through the page. Parameter edits are for this visual demonstration.' }
  };
  document.querySelectorAll('[data-workflow-native]').forEach((host, index) => {
    const uid = `workflow-${host.dataset.workflowNative || index + 1}`;
    const graphURL = new URL(host.dataset.workflowSrc || 'graph.json', scriptURL);
    graphURL.search = new URL(scriptURL).search;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const figure = host.closest('.workflow-figure'), frame = host.querySelector('.workflow-frame');
    const stage = host.querySelector('.workflow-stage'), svg = host.querySelector('svg'), message = host.querySelector('.workflow-message');
    const tr = key => words[window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'][key];
    let data, original, world, nodeLayer, groupLayer, linkLayer, pulseLayer, width = 1, scale = .5, tx = 0, ty = 0;
    let drag = null, pinch = null, loaded = false, visible = false, selected = null, lastHit = null, mode = 'reader';
    const activePointers = new Map(), uploaded = new Map(), elements = new Map(), groupElements = new Map(), links = new Map();
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const S = (name, attrs = {}, text) => {
      const e = document.createElementNS(NS, name);
      for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, String(value));
      if (text !== undefined) e.textContent = text;
      return e;
    };
    function labels() {
      frame.querySelectorAll('[data-workflow-text]').forEach(e => { e.textContent = tr(e.dataset.workflowText); });
      svg.setAttribute('aria-label', tr('canvas'));
      if (!loaded) message.textContent = tr('loading');
    }
    labels(); addEventListener('portfolio:language', labels);
    const readingScale = () => width < 700 ? .55 : .5;
    function bounds() {
      const items = [...data.nodes, ...data.groups];
      const x = Math.min(...items.map(n => n.x)), y = Math.min(...items.map(n => n.y - (data.nodes.includes(n) ? 50 : 0)));
      return { x, y, w: Math.max(...items.map(n => n.x + n.w)) - x, h: Math.max(...items.map(n => n.y + n.h)) - y };
    }
    function layout(preserve = true) {
      if (!data) return;
      const left = (stage.scrollLeft - tx) / scale, b = bounds(), pad = width < 700 ? 24 : 42;
      const w = Math.max(width, Math.ceil(b.w * scale + pad * 2)), h = Math.ceil(b.h * scale + pad * 2);
      tx = (w - b.w * scale) / 2 - b.x * scale; ty = pad - b.y * scale;
      svg.style.width = `${w}px`; svg.style.height = `${h}px`; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      world.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);
      if (preserve) stage.scrollLeft = left * scale + tx;
      host.dataset.zoom = scale.toFixed(4); host.dataset.mode = mode;
    }
    function resize() {
      if (figure) figure.style.setProperty('--wf-screen-width', `${document.documentElement.clientWidth}px`);
      const next = stage.clientWidth;
      if (next === width) return;
      width = next;
      if (!loaded) return;
      if (mode === 'overview') fit(); else layout();
    }
    addEventListener('resize', resize);
    new ResizeObserver(resize).observe(stage); resize();
    function reader() {
      if (!loaded) return;
      mode = 'reader'; scale = readingScale(); layout(false); stage.scrollLeft = 0;
      if (width < 700) {
        const top = Math.min(...data.nodes.map(n => n.y));
        const first = data.nodes.filter(n => n.y < top + 120).sort((a,b) => a.x - b.x)[0];
        stage.scrollLeft = Math.max(0, first.x * scale + tx - 24);
      }
    }
    function fit() {
      if (!loaded) return;
      mode = 'overview'; scale = Math.min(readingScale(), (width - 48) / bounds().w); layout(false); stage.scrollLeft = 0;
    }
    function zoom(next, x = width / 2) {
      const sourceX = (stage.scrollLeft + x - tx) / scale;
      scale = clamp(next, Math.min(.1, (width - 48) / bounds().w), 1.5); mode = 'custom'; layout(false);
      stage.scrollLeft = sourceX * scale + tx - x;
    }
    const point = event => { const r = svg.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; };
    const scenePoint = event => { const p = point(event); return { x: (p.x - tx) / scale, y: (p.y - ty) / scale }; };
    function focusRect(r) {
      host.dataset.focused = String(r.id);
      scale = clamp((width - 64) / (r.w + 100), readingScale(), .9); mode = 'custom'; layout(false);
      stage.scrollLeft = (r.x + r.w / 2) * scale + tx - width / 2;
      (elements.get(r.id) || groupElements.get(r.id))?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  const nodeById = id => data.nodes.find(n => n.id === Number(id));
  const color = type => `var(--wf-${type},#67818b)`;
  function label(parent, text, x, y, cls, attrs = {}) { parent.append(S('text', { x, y, class: cls, ...attrs }, text)); }
  function group(g) {
    const e = S('g', { class: 'wf-group', 'data-group': g.id, tabindex: 0, role: 'group', 'aria-label': `${g.title} · ${g.nodes.length} nodes` });
    e.append(S('rect', { class: 'wf-group-frame', width: g.w, height: g.h }));
    e.append(S('rect', { class: 'wf-group-head', width: g.w, height: 56 }));
    label(e, g.title, 7, 45, 'wf-group-title');
    e.append(S('path', { class: 'wf-resize', 'data-group-resize': g.id, d: `M${g.w - 24} ${g.h} L${g.w} ${g.h - 24} L${g.w} ${g.h}Z` }));
    e.setAttribute('transform', `translate(${g.x} ${g.y})`); groupLayer.append(e); groupElements.set(g.id, e);
  }
  function field(parent, n, index, widget, attrs) {
    const f = S('foreignObject', attrs), input = document.createElementNS(XHTML, widget ? 'input' : 'textarea');
    input.setAttribute('class', widget ? `wf-field${String(n.widgets[index].value).length > 20 ? ' wf-field-long' : ''}` : 'wf-text-field');
    input.setAttribute('xmlns', XHTML); input.setAttribute('data-wf-field', String(n.id));
    input.setAttribute('aria-label', `${n.title} #${n.id} · ${widget ? n.widgets[index].label : '文本'}`);
    input.setAttribute('spellcheck', 'false'); input.value = widget ? n.widgets[index].value : n.text.value;
    input.addEventListener('input', () => { if (widget) n.widgets[index].value = input.value; else n.text.value = input.value; host.dataset.edited = 'true'; });
    input.addEventListener('keydown', event => { if (event.key === 'Escape') input.blur(); event.stopPropagation(); });
    f.append(input); parent.append(f);
  }
  function node(n) {
    const e = S('g', { class: 'wf-node', 'data-node': n.id, 'data-tone': n.tone || '', tabindex: 0, role: 'group', 'aria-label': `${n.title} #${n.id}`, style: `--wf-node-accent:${color(n.outputs[0]?.type || n.inputs[0]?.type)};--wf-node-fill:var(--wf-card-${n.outputs[0]?.type || n.inputs[0]?.type},var(--wf-card-IMAGE))` });
    e.append(S('rect', { class: 'wf-node-body', width: n.w, height: n.h, rx: 8 }));
    e.append(S('path', { class: 'wf-node-head', d: `M8 0H${n.w - 8}Q${n.w} 0 ${n.w} 8V51H0V8Q0 0 8 0Z` }));
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) e.append(S('circle', { class: 'wf-dot', cx: 24 + col * 7, cy: 18 + row * 7, r: 2.3 }));
    label(e, n.title, 62, 34, 'wf-title');
    const tagWidth = Math.max(73, n.tag.length * 12.5 + 22);
    e.append(S('rect', { class: 'wf-tag', x: n.w - tagWidth - 10, y: -46, width: tagWidth, height: 37, rx: 8 }));
    label(e, n.tag.replace(/\s*🦊/gu, ''), n.w - 21, -19, 'wf-tag-text', { 'text-anchor': 'end' });
    if (n.help) label(e, '?', n.w - 29, 35, 'wf-help', { 'text-anchor': 'middle' });
    for (const [direction, ports] of [['in', n.inputs], ['out', n.outputs]]) {
      ports.forEach((p, index) => {
        const x = direction === 'in' ? 20 : n.w - 20;
        e.append(S('circle', { class: 'wf-port', 'data-port': `${n.id}:${direction}:${index}`, cx: x, cy: p.y, r: 8, fill: color(p.type) }));
        label(e, p.label, direction === 'in' ? 43 : n.w - 39, p.y + 8, 'wf-port-label', { 'text-anchor': direction === 'in' ? 'start' : 'end' });
      });
    }
    n.widgets.forEach((w, i) => {
      const left = 32, right = n.w - 32;
      e.append(S('rect', { class: 'wf-widget', x: left, y: w.y - 18, width: right - left, height: 36, rx: 6 }));
      const labelWidth = Math.min(n.w * .43, Math.max(82, [...w.label].reduce((sum,c) => sum + (c.charCodeAt(0) > 127 ? 23 : 13.8), 0) + 8));
      label(e, w.label, left + 30, w.y + 8, 'wf-widget-label');
      field(e, n, i, true, { x: labelWidth + 40, y: w.y - 16, width: Math.max(80, n.w - labelWidth - 108), height: 33 });
      for (const [delta, x] of [[-1, left + 13], [1, right - 13]]) {
        const arrow = S('path', { class: 'wf-adjust', 'data-adjust': `${n.id}:${i}:${delta}`, role: 'button', tabindex: -1, 'aria-label': `${w.label} ${delta > 0 ? '+' : '−'}`, d: delta < 0 ? `M${x + 8} ${w.y - 10}L${x - 9} ${w.y}L${x + 8} ${w.y + 10}Z` : `M${x - 8} ${w.y - 10}L${x + 9} ${w.y}L${x - 8} ${w.y + 10}Z` });
        e.append(arrow);
      }
    });
    if (n.text) field(e, n, 0, false, { x: n.text.x, y: n.text.y, width: n.text.w, height: n.text.h });
    if (n.file) {
      const fileY = n.file.y ?? 166, previewY = n.file.previewY ?? 224;
      const button = S('g', { 'data-load-node': n.id, role: 'button', tabindex: 0, 'aria-label': '选择图片，仅在本地预览', style: 'cursor:pointer' });
      button.append(S('rect', { class: 'wf-upload-surface', x: 24, y: fileY, width: n.w - 48, height: 36, rx: 6 }));
      label(button, '选择文件上传', n.w / 2, fileY + 26, 'wf-widget-label', { 'text-anchor': 'middle' }); e.append(button);
      if (uploaded.has(n.id)) e.append(S('image', { href: uploaded.get(n.id), x: 24, y: previewY, width: n.w - 48, height: n.h - previewY - 24, preserveAspectRatio: 'xMidYMid meet' }));
    }
    if (n.preview && !uploaded.has(n.id)) {
      const p = n.preview;
      e.append(S('image', { class: 'wf-preview', href: new URL(p.src, graphURL).href, x: p.x, y: p.y, width: p.w, height: p.h, preserveAspectRatio: 'xMidYMid meet' }));
      if (p.label) label(e, p.label, p.x + p.w / 2, p.y + p.h + 25, 'wf-preview-label', { 'text-anchor': 'middle' });
    }
    e.setAttribute('transform', `translate(${n.x} ${n.y})`);
    const previous = elements.get(n.id); if (previous) previous.replaceWith(e); else nodeLayer.append(e); elements.set(n.id, e);
  }
  function endpoints(link) {
    const a = nodeById(link.source), b = nodeById(link.target);
    return [[a.x + a.w - 20, a.y + a.outputs[link.output].y], [b.x + 20, b.y + b.inputs[link.input].y]];
  }
  function route(link) {
    const [[x1, y1], [x2, y2]] = endpoints(link);
    if (x2 < x1) {
      const target = nodeById(link.target), lane = 28 + (link.id % 4) * 10;
      return `M${x1} ${y1}H${x1 + lane}V${target.y - lane}H${x2 - lane}V${y2}H${x2}`;
    }
    const middle = (x1 + x2) / 2;
    return `M${x1} ${y1}H${middle}V${y2}H${x2}`;
  }

  function updateLinks(ids) {
    for (const link of data.links) {
      if (ids && !ids.includes(link.source) && !ids.includes(link.target)) continue;
      links.get(link.id).setAttribute('d', route(link));
    }
  }
  function highlight(id) {
    if (selected === id) return; selected = id;
    world.classList.toggle('has-selection', id !== null);
    data.links.forEach(link => links.get(link.id).classList.toggle('is-related', link.source === id || link.target === id));
  }
  function render() {
    svg.replaceChildren(); elements.clear(); groupElements.clear(); links.clear();
    world = S('g', { class: 'workflow-world' }); svg.append(world);
    groupLayer = S('g'); linkLayer = S('g'); pulseLayer = S('g'); nodeLayer = S('g');
    world.append(groupLayer, linkLayer, pulseLayer, nodeLayer);
    data.groups.forEach(group);
    data.links.forEach((link, i) => {
      const path = S('path', { id: `${uid}-link-${link.id}`, class: 'wf-link', stroke: color(link.type), 'data-link': link.id });
      linkLayer.append(path); links.set(link.id, path);
      const dot = S('circle', { class: 'wf-pulse', r: 7, fill: color(link.type) });
      const motion = S('animateMotion', { dur: `${5 + (i % 5)}s`, begin: `${-(i * .37)}s`, repeatCount: 'indefinite', calcMode: 'paced' });
      motion.append(S('mpath', { href: `#${uid}-link-${link.id}` })); dot.append(motion); pulseLayer.append(dot);
    });
    data.nodes.forEach(node); updateLinks(); syncMotion();
    host.dataset.nodes = String(data.nodes.length); host.dataset.links = String(data.links.length); host.dataset.groups = String(data.groups.length);
  }
  function syncMotion() { if (document.hidden || !visible || reduced.matches) svg.pauseAnimations?.(); else svg.unpauseAnimations?.(); }
    svg.addEventListener('pointerdown', event => {
      if (!loaded || event.button > 0 || event.target.closest('foreignObject,[data-adjust],[data-load-node]')) return;
      activePointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
      if (activePointers.size === 2) {
        const [a,b] = [...activePointers.values()]; pinch = {span:Math.hypot(a.x-b.x,a.y-b.y),scale};drag=null;svg.setPointerCapture(event.pointerId);return;
      }
      const handle = event.target.closest('[data-group-resize]'), n = event.target.closest('[data-node]'), g = event.target.closest('[data-group]');
      lastHit = n ? {type:'node',id:Number(n.dataset.node)} : g ? {type:'group',id:g.dataset.group} : null;
      const start = scenePoint(event);
      if (handle) {
        const item = data.groups.find(v=>v.id===handle.dataset.groupResize);drag={type:'resize',item,start,w:item.w,h:item.h};
      } else if (n && event.target.closest('.wf-node-head,.wf-dot,.wf-tag')) {
        const item=nodeById(n.dataset.node);drag={type:'node',item,start,x:item.x,y:item.y,front:false};highlight(item.id);
      } else if (g) {
        const item=data.groups.find(v=>v.id===g.dataset.group);drag={type:'group',item,start,x:item.x,y:item.y,nodes:item.nodes.map(id=>({id,x:nodeById(id).x,y:nodeById(id).y}))};
      } else drag={type:'pan',x:event.clientX,left:stage.scrollLeft};
      svg.setPointerCapture(event.pointerId);svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove',event=>{
      if(!activePointers.has(event.pointerId))return;
      activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinch&&activePointers.size===2){const[a,b]=[...activePointers.values()];zoom(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.span,(a.x+b.x)/2-stage.getBoundingClientRect().left);return;}
      if(!drag)return;
      if(drag.type==='pan'){stage.scrollLeft=drag.left+drag.x-event.clientX;return;}
      const now=scenePoint(event),dx=now.x-drag.start.x,dy=now.y-drag.start.y,item=drag.item;
      if(!drag.moved&&Math.hypot(dx,dy)*scale<3)return;drag.moved=true;
      if(drag.type==='node'){
        if(!drag.front){nodeLayer.append(elements.get(item.id));drag.front=true;}
        item.x=drag.x+dx;item.y=drag.y+dy;elements.get(item.id).setAttribute('transform',`translate(${item.x} ${item.y})`);updateLinks([item.id]);
      }else if(drag.type==='group'){
        item.x=drag.x+dx;item.y=drag.y+dy;groupElements.get(item.id).setAttribute('transform',`translate(${item.x} ${item.y})`);
        drag.nodes.forEach(s=>{const n=nodeById(s.id);n.x=s.x+dx;n.y=s.y+dy;elements.get(n.id).setAttribute('transform',`translate(${n.x} ${n.y})`);});updateLinks(item.nodes);
      }else{item.w=Math.max(250,drag.w+dx);item.h=Math.max(180,drag.h+dy);groupElements.get(item.id).remove();group(item);}
      host.dataset.edited='true';
    });
    function release(event){activePointers.delete(event.pointerId);if(drag?.moved)layout();drag=null;pinch=null;svg.classList.remove('is-dragging');}
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,release));
    svg.addEventListener('pointerover',event=>{const n=event.target.closest('[data-node]');if(!drag)highlight(n?Number(n.dataset.node):null);});
    svg.addEventListener('pointerleave',()=>{if(!drag)highlight(null);});
    svg.addEventListener('wheel',event=>{
      if(!loaded||(!event.ctrlKey&&!event.metaKey))return;
      event.preventDefault();zoom(scale*Math.exp(-clamp(event.deltaY,-120,120)*.003),event.clientX-stage.getBoundingClientRect().left);
    },{passive:false});
    svg.addEventListener('dblclick',event=>{
      if(event.target.closest('foreignObject,[data-adjust],[data-load-node]'))return;
      const n=event.target.closest('[data-node]'),g=event.target.closest('[data-group]');
      const hit=n?{type:'node',id:Number(n.dataset.node)}:g?{type:'group',id:g.dataset.group}:lastHit;
      if(hit?.type==='node')focusRect(nodeById(hit.id));else if(hit?.type==='group')focusRect(data.groups.find(v=>v.id===hit.id));
    });
    function adjust(key){
      const[id,index,direction]=key.split(':').map(Number),n=nodeById(id),w=n.widgets[index];
      if(w.options){const i=w.options.indexOf(w.value);w.value=w.options[(i+direction+w.options.length)%w.options.length];}
      else if(w.kind==='boolean')w.value=w.value==='true'?'false':'true';
      else if(w.kind==='number'){const next=clamp((Number(w.value)||0)+direction*(w.step||1),w.min??-1e9,w.max??1e9);w.value=w.precision!==undefined?next.toFixed(w.precision):String(next);}
      else return;
      node(n);host.dataset.edited='true';
    }
    function loadImage(id){
      const picker=document.createElement('input');picker.type='file';picker.accept='image/*';
      picker.addEventListener('change',()=>{const file=picker.files[0];if(!file)return;if(uploaded.has(id))URL.revokeObjectURL(uploaded.get(id));uploaded.set(id,URL.createObjectURL(file));const n=nodeById(id);n.widgets[0].value=file.name;node(n);});picker.click();
    }
    svg.addEventListener('click',event=>{const a=event.target.closest('[data-adjust]'),f=event.target.closest('[data-load-node]');if(a)adjust(a.dataset.adjust);if(f)loadImage(Number(f.dataset.loadNode));});
    svg.addEventListener('keydown',event=>{
      if(event.target.closest('foreignObject'))return;
      const focused=event.target.closest('[data-node]');
      if(focused&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
        event.preventDefault();const n=nodeById(focused.dataset.node),step=event.shiftKey?50:10;
        n.x+=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0;n.y+=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;
        elements.get(n.id).setAttribute('transform',`translate(${n.x} ${n.y})`);updateLinks([n.id]);host.dataset.edited='true';layout();return;
      }
      if(event.key==='0'){event.preventDefault();fit();}
      else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(scale*(event.key==='-'?1/1.3:1.3));}
      else if(event.key==='Enter'&&focused){event.preventDefault();focusRect(nodeById(focused.dataset.node));}
      else if(event.key==='Enter'&&event.target.closest('[data-load-node]')){event.preventDefault();loadImage(Number(event.target.closest('[data-load-node]').dataset.loadNode));}
    });
    host.querySelector('[data-workflow-fit]').addEventListener('click',fit);
    host.querySelector('[data-workflow-reader]').addEventListener('click',reader);
    host.querySelector('[data-workflow-reset]').addEventListener('click',()=>{uploaded.forEach(url=>URL.revokeObjectURL(url));uploaded.clear();data=structuredClone(original);selected=null;render();reader();delete host.dataset.edited;});
    document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener('change',syncMotion);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion();}).observe(host);
    fetch(graphURL).then(response=>{if(!response.ok)throw new Error(response.status);return response.json();}).then(value=>{
      data=value;original=structuredClone(value);loaded=true;render();resize();reader();message.hidden=true;host.dataset.ready='true';
    }).catch(error=>{console.error(`Liangzhu ${uid}:`,error);message.textContent=tr('error');host.dataset.ready='false';});
  });
})();
