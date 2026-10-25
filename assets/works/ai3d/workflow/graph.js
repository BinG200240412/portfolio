/* Independently editable SVG reconstruction of the supplied Group 2.png. */
(() => {
  'use strict';
  const host = document.querySelector('[data-workflow-native]');
  if (!host) return;
  const graphURL = new URL('graph.json', document.currentScript.src);
  const NS = 'http://www.w3.org/2000/svg', XHTML = 'http://www.w3.org/1999/xhtml';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frame = host.querySelector('.workflow-frame'), stage = host.querySelector('.workflow-stage');
  const svg = host.querySelector('svg'), message = host.querySelector('.workflow-message');
  const expandButton = host.querySelector('[data-workflow-expand]');
  const words = {
    zh: { hint: '拖动节点 / 分组 · 双击看细节 · 捏合缩放', fit: '适屏', reset: '复位', expand: '展开', collapse: '收起', loading: '正在展开工作流', error: '工作流暂时无法载入，请刷新重试。', canvas: '可编辑的 ComfyUI 工作流复刻。拖动节点或蓝色分组，空白处拖动画面；双击看细节，Ctrl 或 Command 加滚动缩放。选中节点后方向键移动，按 0 适屏。参数编辑仅用于工作流演示。' },
    en: { hint: 'Drag nodes / groups · Double-click to focus · Pinch to zoom', fit: 'Fit', reset: 'Reset', expand: 'Expand', collapse: 'Close', loading: 'Unfolding the workflow', error: 'The workflow could not load. Refresh to retry.', canvas: 'Editable ComfyUI workflow reconstruction. Drag nodes or blue groups; drag blank space to pan, double-click to focus, Ctrl or Command plus scroll to zoom. Arrow keys move a focused node; 0 fits the graph. Parameter edits are for this visual demonstration.' }
  };
  const tr = key => words[window.PortfolioI18n?.language === 'en' ? 'en' : 'zh'][key];
  let data, original, world, nodeLayer, groupLayer, linkLayer, pulseLayer, width = 1, height = 1;
  let scale = .15, tx = 0, ty = 0, drag = null, dialog, expanded = false, loaded = false, visible = true;
  let pinch = null, activePointers = new Map(), uploaded = new Map(), selected = null, viewReady = false, lastHit = null;
  const elements = new Map(), groupElements = new Map(), links = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const S = (name, attrs = {}, text) => {
    const e = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, String(value));
    if (text !== undefined) e.textContent = text;
    return e;
  };
  function labels() {
    host.querySelectorAll('[data-workflow-text]').forEach(e => { e.textContent = tr(e.dataset.workflowText); });
    frame.querySelectorAll('[data-workflow-text]').forEach(e => { e.textContent = tr(e.dataset.workflowText); });
    expandButton.textContent = tr(expanded ? 'collapse' : 'expand');
    svg.setAttribute('aria-label', tr('canvas'));
    if (!loaded) message.textContent = tr('loading');
  }
  labels(); addEventListener('portfolio:language', labels);
  function transform() { if (world) world.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`); host.dataset.zoom = scale.toFixed(4); }
  function fit() {
    if (!data) return;
    scale = Math.min((width - 32) / data.width, (height - 32) / data.height);
    tx = (width - data.width * scale) / 2; ty = (height - data.height * scale) / 2; viewReady = true; transform();
  }
  function zoom(next, x = width / 2, y = height / 2) {
    next = clamp(next, Math.min(width / data.width, height / data.height) * .6, 2.5);
    const ratio = next / scale; tx = x - (x - tx) * ratio; ty = y - (y - ty) * ratio; scale = next; transform();
  }
  const point = event => { const r = svg.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; };
  const scenePoint = event => { const p = point(event); return { x: (p.x - tx) / scale, y: (p.y - ty) / scale }; };
  function resize() {
    const oldWidth = width, oldHeight = height;
    width = stage.clientWidth; height = stage.clientHeight; svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    if (!viewReady) fit();
    else { tx += (width - oldWidth) / 2; ty += (height - oldHeight) / 2; transform(); }
  }
  new ResizeObserver(resize).observe(stage);
  function focusRect(r) {
    host.dataset.focused = String(r.id);
    scale = clamp(Math.min((width - 80) / (r.w + 160), (height - 60) / (r.h + 160)), .08, 1.6);
    tx = width / 2 - (r.x + r.w / 2) * scale; ty = height / 2 - (r.y + r.h / 2) * scale; transform();
  }
  const nodeById = id => data.nodes.find(n => n.id === Number(id));
  const color = type => data.colors[type] || '#7b8390';
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
    input.setAttribute('class', widget ? 'wf-field' : 'wf-text-field');
    input.setAttribute('xmlns', XHTML); input.setAttribute('data-wf-field', String(n.id));
    input.setAttribute('aria-label', `${n.title} #${n.id} · ${widget ? n.widgets[index].label : '文本'}`);
    input.setAttribute('spellcheck', 'false'); input.value = widget ? n.widgets[index].value : n.text.value;
    input.addEventListener('input', () => { if (widget) n.widgets[index].value = input.value; else n.text.value = input.value; host.dataset.edited = 'true'; });
    input.addEventListener('keydown', event => { if (event.key === 'Escape') input.blur(); event.stopPropagation(); });
    f.append(input); parent.append(f);
  }
  function node(n) {
    const e = S('g', { class: 'wf-node', 'data-node': n.id, 'data-tone': n.tone || '', tabindex: 0, role: 'group', 'aria-label': `${n.title} #${n.id}` });
    e.append(S('rect', { class: 'wf-node-body', width: n.w, height: n.h, rx: 17 }));
    e.append(S('path', { class: 'wf-node-head', d: `M17 0H${n.w - 17}Q${n.w} 0 ${n.w} 17V51H0V17Q0 0 17 0Z` }));
    e.append(S('circle', { class: 'wf-dot', cx: 31, cy: 25, r: 10 }));
    label(e, n.title, 62, 34, 'wf-title');
    const tagWidth = Math.max(73, n.tag.length * 12.5 + 22);
    e.append(S('rect', { class: 'wf-tag', x: n.w - tagWidth - 10, y: -46, width: tagWidth, height: 37, rx: 8 }));
    label(e, n.tag, n.w - 21, -19, 'wf-tag-text', { 'text-anchor': 'end' });
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
      e.append(S('rect', { class: 'wf-widget', x: left, y: w.y - 18, width: right - left, height: 36, rx: 19 }));
      const labelWidth = Math.min(n.w * .43, Math.max(115, w.label.length * 23 + 8));
      label(e, w.label, left + 30, w.y + 8, 'wf-widget-label');
      field(e, n, i, true, { x: labelWidth + 40, y: w.y - 16, width: Math.max(80, n.w - labelWidth - 108), height: 33 });
      for (const [delta, x] of [[-1, left + 13], [1, right - 13]]) {
        const arrow = S('path', { class: 'wf-adjust', 'data-adjust': `${n.id}:${i}:${delta}`, role: 'button', tabindex: -1, 'aria-label': `${w.label} ${delta > 0 ? '+' : '−'}`, d: delta < 0 ? `M${x + 8} ${w.y - 10}L${x - 9} ${w.y}L${x + 8} ${w.y + 10}Z` : `M${x - 8} ${w.y - 10}L${x + 9} ${w.y}L${x - 8} ${w.y + 10}Z` });
        e.append(arrow);
      }
    });
    if (n.text) field(e, n, 0, false, { x: n.text.x, y: n.text.y, width: n.text.w, height: n.text.h });
    if (n.file) {
      const button = S('g', { 'data-load-node': n.id, role: 'button', tabindex: 0, 'aria-label': '选择图片，仅在本地预览', style: 'cursor:pointer' });
      button.append(S('rect', { x: 24, y: 166, width: n.w - 48, height: 36, fill: '#222', stroke: '#777', 'stroke-width': 2 }));
      label(button, '选择文件上传', n.w / 2, 192, 'wf-widget-label', { 'text-anchor': 'middle' }); e.append(button);
      if (uploaded.has(n.id)) e.append(S('image', { href: uploaded.get(n.id), x: 24, y: 224, width: n.w - 48, height: n.h - 248, preserveAspectRatio: 'xMidYMid meet' }));
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
    const d = Math.hypot(x2 - x1, y2 - y1), offset = Math.max(40, d * .25);
    return `M${x1} ${y1}C${x1 + offset} ${y1} ${x2 - offset} ${y2} ${x2} ${y2}`;
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
    const defs = S('defs');
    const grid = S('pattern', { id: 'workflow-grid', width: 18, height: 18, patternUnits: 'userSpaceOnUse' });
    grid.append(S('path', { d: 'M18 0H0V18', fill: 'none', stroke: '#181818', 'stroke-width': 1, opacity: .45 })); defs.append(grid); svg.append(defs);
    world = S('g', { class: 'workflow-world' }); svg.append(world);
    const background = S('g', { 'aria-hidden': 'true', 'data-world-background': '' });
    const bgPath = data.background.map(([x,y,w,h]) => `M${x} ${y}h${w}v${h}h-${w}Z`).join('');
    background.append(S('path', { d: bgPath, fill: '#212121' }), S('path', { d: bgPath, fill: 'url(#workflow-grid)' })); world.append(background);
    groupLayer = S('g'); linkLayer = S('g'); pulseLayer = S('g'); nodeLayer = S('g');
    world.append(groupLayer, linkLayer, pulseLayer, nodeLayer);
    data.groups.forEach(group);
    data.links.forEach((link, i) => {
      const path = S('path', { id: `workflow-link-${link.id}`, class: 'wf-link', stroke: color(link.type), 'data-link': link.id });
      linkLayer.append(path); links.set(link.id, path);
      const dot = S('circle', { class: 'wf-pulse', r: 7, fill: color(link.type) });
      const motion = S('animateMotion', { dur: `${5 + (i % 5)}s`, begin: `${-(i * .37)}s`, repeatCount: 'indefinite', calcMode: 'paced' });
      motion.append(S('mpath', { href: `#workflow-link-${link.id}` })); dot.append(motion); pulseLayer.append(dot);
    });
    data.nodes.forEach(node); updateLinks(); transform(); syncMotion();
    host.dataset.nodes = String(data.nodes.length); host.dataset.links = String(data.links.length); host.dataset.groups = String(data.groups.length);
  }
  function syncMotion() { if (document.hidden || !visible || reduced.matches) svg.pauseAnimations?.(); else svg.unpauseAnimations?.(); }
  svg.addEventListener('pointerdown', event => {
    if (!loaded || event.button > 0 || event.target.closest('foreignObject,[data-adjust],[data-load-node]')) return;
    const p = point(event); activePointers.set(event.pointerId, p);
    if (activePointers.size === 2 && expanded) {
      const [a,b] = [...activePointers.values()]; pinch = { span: Math.hypot(a.x-b.x,a.y-b.y), scale }; drag = null; svg.setPointerCapture(event.pointerId); return;
    }
    const handle = event.target.closest('[data-group-resize]'), n = event.target.closest('[data-node]'), g = event.target.closest('[data-group]');
    lastHit = n ? { type: 'node', id: Number(n.dataset.node) } : g ? { type: 'group', id: g.dataset.group } : null;
    const start = scenePoint(event);
    if (handle) {
      const item = data.groups.find(g => g.id === handle.dataset.groupResize); drag = { type: 'resize', item, start, w: item.w, h: item.h };
    } else if (n) {
      const item = nodeById(n.dataset.node); drag = { type: 'node', item, start, x: item.x, y: item.y, front: false }; highlight(item.id);
    } else if (g) {
      const item = data.groups.find(v => v.id === g.dataset.group); drag = { type: 'group', item, start, x: item.x, y: item.y, nodes: item.nodes.map(id => ({ id, x: nodeById(id).x, y: nodeById(id).y })) };
    } else drag = { type: 'pan', start: p, x: tx, y: ty };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-dragging');
  });
  svg.addEventListener('pointermove', event => {
    if (!activePointers.has(event.pointerId)) return;
    const p = point(event); activePointers.set(event.pointerId, p);
    if (pinch && activePointers.size === 2) {
      const [a,b] = [...activePointers.values()]; zoom(pinch.scale * Math.hypot(a.x-b.x,a.y-b.y) / pinch.span, (a.x+b.x)/2, (a.y+b.y)/2); return;
    }
    if (!drag) return;
    if (drag.type === 'pan') { tx = drag.x + p.x-drag.start.x; ty = drag.y+p.y-drag.start.y; transform(); return; }
    const now = scenePoint(event), dx = now.x-drag.start.x, dy = now.y-drag.start.y, item = drag.item;
    if (!drag.moved && Math.hypot(dx, dy) * scale < 3) return;
    drag.moved = true;
    if (drag.type === 'node') {
      if (!drag.front) { nodeLayer.append(elements.get(item.id)); drag.front = true; }
      item.x = drag.x+dx; item.y = drag.y+dy; elements.get(item.id).setAttribute('transform', `translate(${item.x} ${item.y})`); updateLinks([item.id]);
    } else if (drag.type === 'group') {
      item.x = drag.x+dx; item.y = drag.y+dy; groupElements.get(item.id).setAttribute('transform', `translate(${item.x} ${item.y})`);
      drag.nodes.forEach(start => { const n = nodeById(start.id); n.x=start.x+dx; n.y=start.y+dy; elements.get(n.id).setAttribute('transform',`translate(${n.x} ${n.y})`); }); updateLinks(item.nodes);
    } else { item.w=Math.max(250,drag.w+dx); item.h=Math.max(180,drag.h+dy); groupElements.get(item.id).remove(); group(item); }
    host.dataset.edited = 'true';
  });
  function release(event) { activePointers.delete(event.pointerId); drag=null; pinch=null; svg.classList.remove('is-dragging'); }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => svg.addEventListener(type, release));
  svg.addEventListener('pointerover', event => { const n=event.target.closest('[data-node]'); if (!drag) highlight(n ? Number(n.dataset.node) : null); });
  svg.addEventListener('pointerleave', () => { if (!drag) highlight(null); });
  svg.addEventListener('wheel', event => {
    if (!loaded || (!expanded && !event.ctrlKey && !event.metaKey)) return;
    event.preventDefault(); const p=point(event); zoom(scale*Math.exp(-clamp(event.deltaY,-120,120)*.003),p.x,p.y);
  }, { passive:false });
  svg.addEventListener('dblclick', event => {
    if (event.target.closest('foreignObject,[data-adjust],[data-load-node]')) return;
    const n=event.target.closest('[data-node]'), g=event.target.closest('[data-group]');
    const hit = n ? { type: 'node', id: Number(n.dataset.node) } : g ? { type: 'group', id: g.dataset.group } : lastHit;
    if (hit?.type === 'node') focusRect(nodeById(hit.id)); else if (hit?.type === 'group') focusRect(data.groups.find(v=>v.id===hit.id)); else fit();
  });
  function adjust(key) {
    const [id,index,direction]=key.split(':').map(Number), n=nodeById(id), w=n.widgets[index];
    if (w.kind==='boolean') w.value=w.value==='true'?'false':'true';
    else if (w.kind==='number') { const next=clamp((Number(w.value)||0)+direction*(w.step||1),w.min??-1e9,w.max??1e9); w.value=w.precision!==undefined?next.toFixed(w.precision):String(next); }
    else return;
    node(n); host.dataset.edited='true';
  }
  function loadImage(id) {
    const picker=document.createElement('input'); picker.type='file'; picker.accept='image/*';
    picker.addEventListener('change',()=>{ const file=picker.files[0]; if (!file) return; if(uploaded.has(id)) URL.revokeObjectURL(uploaded.get(id)); uploaded.set(id,URL.createObjectURL(file)); const n=nodeById(id); n.widgets[0].value=file.name; node(n); }); picker.click();
  }
  svg.addEventListener('click',event=>{ const a=event.target.closest('[data-adjust]'), load=event.target.closest('[data-load-node]'); if(a) adjust(a.dataset.adjust); if(load) loadImage(Number(load.dataset.loadNode)); });
  svg.addEventListener('keydown',event=>{
    if(event.target.closest('foreignObject')) return;
    const focused=event.target.closest('[data-node]'); const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    if(focused&&keys.includes(event.key)){ event.preventDefault(); const n=nodeById(focused.dataset.node),step=event.shiftKey?50:10; n.x+=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0; n.y+=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0; elements.get(n.id).setAttribute('transform',`translate(${n.x} ${n.y})`);updateLinks([n.id]);return; }
    if(event.key==='0'){event.preventDefault();fit();} else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(scale*(event.key==='-'?1/1.3:1.3));}
    else if(event.key==='Enter'&&focused){event.preventDefault();focusRect(nodeById(focused.dataset.node));}
  });
  host.querySelector('[data-workflow-fit]').addEventListener('click',fit);
  host.querySelector('[data-workflow-reset]').addEventListener('click',()=>{uploaded.forEach(url=>URL.revokeObjectURL(url));uploaded.clear();data=structuredClone(original);selected=null;render();fit();delete host.dataset.edited;});
  function restore() {
    if(!expanded)return;expanded=false;host.append(frame);dialog.remove();document.documentElement.classList.remove('media-detail-open');labels();resize();fit();expandButton.focus();
  }
  expandButton.addEventListener('click',()=>{
    if(expanded){dialog.close();return;}
    expanded=true;dialog=document.createElement('dialog');dialog.className='workflow-dialog';dialog.setAttribute('data-media-corners-ignore','');dialog.setAttribute('data-i18n-ignore','');dialog.append(frame);document.body.append(dialog);
    dialog.addEventListener('close',restore,{once:true});dialog.showModal();document.documentElement.classList.add('media-detail-open');labels();resize();fit();
  });
  document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener('change',syncMotion);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting||expanded;syncMotion();}).observe(host);
  fetch(graphURL).then(response=>{if(!response.ok)throw new Error(response.status);return response.json();}).then(value=>{
    data=value;original=structuredClone(value);loaded=true;render();resize();message.hidden=true;host.dataset.ready='true';
  }).catch(error=>{console.error('Liangzhu workflow:',error);message.textContent=tr('error');host.dataset.ready='false';});
})();
