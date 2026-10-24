(() => {
  'use strict';
  const host = document.getElementById('figma-demo');
  if (!host) return;
  const source = document.currentScript?.src || new URL('../assets/skills-figma-demo.js', location.href).href;
  const artwork = new URL('works/design-skills/figma-settings-poster-group.svg', source).href;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [
    { key: 'header', x: 0, y: 66, w: 420, h: 65 },
    { key: 'artwork', x: 15, y: 150, w: 390, h: 285 },
    { key: 'action', x: 18, y: 402, w: 384, h: 30 }
  ];
  const copy = {
    zh: {
      label: '流程演示 · 非屏幕实录', sample: '数独 / 原始 SVG 样本',
      title: '把关系量清楚。', note: '保留完整图稿组，实时内容单独实现。',
      stages: ['分组测量', 'SVG → 代码', '对齐校准'],
      tabs: '选择流程演示', left: 'Figma / 参考画布', right: 'SwiftUI / 矢量预览',
      groups: ['标题组', '原始图稿组', '实时按钮'], layers: '选择测量分组',
      pause: '暂停', play: '播放', replay: '重播本段',
      step: ['按父级坐标逐项读取边界。', '整组 SVG 保留，按钮原生实现。', '先校正分组，再核对内部关系。'],
      detail: ['测量左、右、上、下边界，保留原分组关系。', '导出原始图稿，再按父级坐标写入 SwiftUI。', '叠合参考与预览，依次消除位置偏差。'],
      footer: '演示画布 420 × 600 · 尺寸为流程示意',
      original: '原始矢量 / 整组导出', delta: '分组偏差', aligned: '已对齐',
      loading: '原始 SVG 未加载', loaded: '真实 SVG · 可无限缩放',
      leftGap: '左', rightGap: '右', topGap: '上', bottomGap: '下', preview: '矢量示意，非构建截图',
      frameTitle: '数独设置界面的矢量流程示意'
    },
    en: {
      label: 'Process demo · not a screen recording', sample: 'Sudoku / original SVG sample',
      title: 'Measure the relationships.', note: 'Keep artwork together. Build live content separately.',
      stages: ['Measure groups', 'SVG → code', 'Align & compare'],
      tabs: 'Choose a process demo', left: 'Figma / reference canvas', right: 'SwiftUI / vector preview',
      groups: ['Header group', 'Original artwork', 'Live button'], layers: 'Choose a group to measure',
      pause: 'Pause', play: 'Play', replay: 'Replay this step',
      step: ['Read each bound relative to its parent.', 'Keep the SVG intact. Build the button natively.', 'Align the group, then verify its children.'],
      detail: ['Read left, right, top and bottom bounds without breaking the group.', 'Export the original artwork, then position it in SwiftUI.', 'Overlay the reference and preview to remove each offset.'],
      footer: 'Demo canvas 420 × 600 · illustrative dimensions',
      original: 'Original vector / whole-group export', delta: 'Group offset', aligned: 'Aligned',
      loading: 'Original SVG did not load', loaded: 'Original SVG · resolution independent',
      leftGap: 'L', rightGap: 'R', topGap: 'T', bottomGap: 'B', preview: 'Vector illustration, not a build capture',
      frameTitle: 'Vector process illustration of the Sudoku settings screen'
    }
  };
  const state = { scene: 0, group: 1, elapsed: 0, paused: media.matches, visible: true, active: !document.hidden, last: 0, frame: 0 };
  const duration = 7800;
  let lang = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh';
  const t = () => copy[lang];
  const svgContent = (right = false) => `<svg class="fd-screen" viewBox="0 0 420 600" role="img" aria-label="${t().frameTitle}">
    <rect width="420" height="600" fill="#f5f3ed"/>
    <text x="24" y="34" font-size="13" fill="#41403d">9:41</text>
    <path d="M357 26h3m3-4h3m3-4h3" stroke="#41403d" stroke-width="3"/>
    <rect x="382" y="19" width="17" height="9" rx="2" fill="none" stroke="#41403d"/>
    <rect x="384" y="21" width="12" height="5" fill="#41403d"/>
    <g class="fd-native-group">
      <rect y="66" width="420" height="4" fill="#41403d"/><rect y="76" width="420" height="1.5" fill="#41403d"/>
      <rect y="88" width="420" height="43" fill="#41403d"/>
      <text x="210" y="117" fill="#f5f3ed" font-size="27" text-anchor="middle" letter-spacing="2">SETTINGS</text>
      <g class="fd-artwork-group"><image href="${artwork}" x="15" y="150" width="390" height="285" preserveAspectRatio="xMidYMid meet"/>
        <text x="210" y="423" fill="#f5f3ed" font-size="20" text-anchor="middle">JUST BUY IT !</text>
      </g>
      <text x="15" y="478" fill="#41403d" font-size="12" letter-spacing="2">THE PAPER</text>
      <path d="M15 490H405M15 536H405M15 582H405" stroke="#b8b5ac" stroke-width="1"/>
      <text x="29" y="519" fill="#41403d" font-size="18">What's new</text><text x="385" y="519" fill="#41403d" font-size="18">↗</text>
      <text x="29" y="565" fill="#41403d" font-size="18">Share with a friend</text><text x="385" y="565" fill="#41403d" font-size="18">↗</text>
    </g>
    ${right ? '<g class="fd-reference-ghost" aria-hidden="true"><rect x="15" y="150" width="390" height="285" fill="none" stroke="currentColor" stroke-dasharray="5 5"/></g>' : ''}
    <g class="fd-measure" aria-hidden="true"></g>
    <g class="fd-cursor" aria-hidden="true"><path d="M0 0L0 21L6 15L11 26L15 24L10 13L19 13Z" fill="#41403d" stroke="#f5f3ed" stroke-width="1.5"/></g>
  </svg>`;

  host.classList.add('fd-demo');
  host.setAttribute('data-i18n-ignore', '');
  host.innerHTML = `<div class="fd-top"><span class="fd-process-label"></span><span class="fd-sample-label"></span></div>
    <div class="fd-intro"><p class="fd-title"></p><p class="fd-note"></p></div>
    <div class="fd-tabs" role="group"></div>
    <div class="fd-workbench">
      <div class="fd-pane fd-source"><div class="fd-pane-bar"><span class="fd-left-label"></span><span>420 × 600</span></div>${svgContent()}<div class="fd-pane-foot"><span class="fd-asset-status"></span><span>SVG</span></div></div>
      <div class="fd-pane fd-result"><div class="fd-pane-bar"><span class="fd-right-label"></span><span class="fd-delta"></span></div>${svgContent(true)}<div class="fd-pane-foot"><span class="fd-preview-label"></span><span>1×</span></div></div>
      <div class="fd-transfer" aria-hidden="true"><span>↗</span></div>
    </div>
    <div class="fd-inspector"><div class="fd-layers" role="group"></div><div class="fd-readout" aria-live="off"></div></div>
    <div class="fd-terminal"><div class="fd-terminal-head"><span class="fd-terminal-title"></span><span class="fd-terminal-type">.swift</span></div><pre class="fd-code" aria-live="off"></pre></div>
    <div class="fd-playback"><div class="fd-status"><span class="fd-status-number">01</span><span class="fd-status-text"></span></div><div class="fd-buttons"><button class="fd-replay" type="button">↺</button><button class="fd-toggle" type="button"></button></div></div>
    <div class="fd-progress" aria-hidden="true"><span></span></div>
    <div class="fd-bottom"><p class="fd-detail"></p><p class="fd-disclaimer"></p></div>`;

  const $ = (s) => host.querySelector(s);
  const $$ = (s) => [...host.querySelectorAll(s)];
  const setText = (s, text) => { const el = $(s); if (el.textContent !== text) el.textContent = text; };
  const safeValue = (value) => Number(value.toFixed(1)).toString();

  function drawRulers() {
    const g = groups[state.group];
    const left = g.x, right = 420 - g.x - g.w;
    const label = (x, y, value, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${value}</text>`;
    const horizontal = (x1, x2, y) => `<path d="M${x1} ${y-5}V${y+5}M${x1} ${y}H${x2}M${x2} ${y-5}V${y+5}"/>`;
    const vertical = (x, y1, y2) => `<path d="M${x-5} ${y1}H${x+5}M${x} ${y1}V${y2}M${x-5} ${y2}H${x+5}"/>`;
    const markY = g.y + g.h * .45;
    const drawing = `<rect class="fd-bound" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"/>
      <g data-ruler="0">${horizontal(0, g.x, markY)}${label(8, markY - 14, `${left}px`, 'start')}</g>
      <g data-ruler="1">${horizontal(g.x + g.w, 420, markY)}${label(412, markY - 14, `${right}px`, 'end')}</g>
      <g data-ruler="2">${vertical(210, 0, g.y)}${label(223, Math.max(20, g.y / 2), `${g.y}px`, 'start')}</g>
      <g data-ruler="3">${vertical(210, g.y + g.h, 600)}${label(223, g.y + g.h + (600 - g.y - g.h) / 2, `${600-g.y-g.h}px`, 'start')}</g>
      ${[ [g.x,g.y], [g.x+g.w,g.y], [g.x,g.y+g.h], [g.x+g.w,g.y+g.h] ].map(([x,y]) => `<rect class="fd-handle" x="${x-3}" y="${y-3}" width="6" height="6"/>`).join('')}`;
    $$('.fd-measure').forEach((el) => { el.innerHTML = drawing; });
    setText('.fd-readout', `${t().leftGap} ${left} · ${t().rightGap} ${right} · ${t().topGap} ${g.y} · ${t().bottomGap} ${600-g.y-g.h} px`);
    $$('.fd-layers button').forEach((el, i) => { el.setAttribute('aria-pressed', String(i === state.group)); });
  }

  function updateCode() {
    const g = groups[state.group];
    const nativeCode = [
      'Text("SETTINGS")\n  .frame(width: 420, height: 43)\n  .background(ink)\n  .offset(x: 0, y: 88)',
      'Image("FigmaSettingsPosterGroup")\n  .resizable()\n  .frame(width: 390, height: 285)\n  .offset(x: 15, y: 150)',
      'Button { showPurchase = true } label: {\n  Text("JUST BUY IT !")\n    .frame(width: 384, height: 30)\n}.offset(x: 18, y: 402)'
    ];
    const lines = [
      `Group / ${t().groups[state.group]}\n  x: ${g.x}    y: ${g.y}\n  width: ${g.w}    height: ${g.h}\n  parent: Frame / 420 × 600`,
      nativeCode[state.group],
      `reference  { x: ${g.x}, y: ${g.y} }\npreview    { x: ${g.x + 8}, y: ${g.y + 11} }\ncorrection { x: −8, y: −11 }\n→ parent-relative alignment`
    ];
    setText('.fd-code', lines[state.scene]);
    setText('.fd-terminal-title', state.scene === 1 ? state.group === 1 ? 'figma-settings-poster-group.svg → Assets.xcassets' : `${t().groups[state.group]} → SwiftUI` : state.scene === 2 ? 'reference / preview' : 'Frame → Group → Bounds');
    setText('.fd-terminal-type', state.scene === 0 ? 'px' : state.scene === 1 ? '.swift' : 'Δ');
  }

  function translate() {
    setText('.fd-process-label', t().label);
    setText('.fd-sample-label', t().sample);
    setText('.fd-title', t().title);
    setText('.fd-note', t().note);
    setText('.fd-left-label', t().left);
    setText('.fd-right-label', t().right);
    setText('.fd-preview-label', t().preview);
    setText('.fd-asset-status', t().loaded);
    setText('.fd-disclaimer', t().footer);
    $('.fd-tabs').setAttribute('aria-label', t().tabs);
    $('.fd-tabs').innerHTML = t().stages.map((text, i) => `<button type="button" data-scene="${i}" aria-pressed="${i === state.scene}"><span>0${i+1}</span>${text}</button>`).join('');
    $('.fd-layers').setAttribute('aria-label', t().layers);
    $('.fd-layers').innerHTML = t().groups.map((text, i) => `<button type="button" data-group="${i}" aria-pressed="${i === state.group}"><span aria-hidden="true">${i === 2 ? 'T' : '▧'}</span>${text}</button>`).join('');
    $('.fd-replay').setAttribute('aria-label', t().replay);
    $$('.fd-screen').forEach((el) => el.setAttribute('aria-label', t().frameTitle));
    drawRulers();
    updateScene();
  }

  function updateScene() {
    host.dataset.scene = String(state.scene);
    $$('.fd-tabs button').forEach((el, i) => el.setAttribute('aria-pressed', String(i === state.scene)));
    setText('.fd-status-number', `0${state.scene + 1}`);
    setText('.fd-status-text', t().step[state.scene]);
    setText('.fd-detail', t().detail[state.scene]);
    setText('.fd-toggle', state.paused ? `▶ ${t().play}` : `Ⅱ ${t().pause}`);
    $('.fd-toggle').setAttribute('aria-pressed', String(!state.paused));
    updateCode();
    paint();
  }

  function paint() {
    const p = media.matches && state.paused ? .8 : state.elapsed / duration;
    host.style.setProperty('--fd-progress', `${Math.min(1, p) * 100}%`);
    host.classList.toggle('fd-paused', state.paused || !state.visible || !state.active);
    const activeRuler = Math.min(3, Math.floor(p * 5));
    $$('[data-ruler]').forEach((el) => { el.style.opacity = state.scene === 0 ? (Number(el.dataset.ruler) <= activeRuler ? '1' : '.12') : state.scene === 2 ? '.75' : '.1'; });
    const group = groups[state.group];
    const cursorX = state.scene === 0 ? group.x + group.w * (.15 + Math.min(1, p * 1.8) * .62) : group.x + group.w * .74;
    const cursorY = state.scene === 0 ? group.y + group.h * (.22 + Math.min(1, p * 1.8) * .45) : group.y + group.h * .68;
    $$('.fd-cursor').forEach((el) => el.setAttribute('transform', `translate(${cursorX} ${cursorY})`));
    const offset = state.scene === 2 ? 1 - Math.min(1, Math.max(0, (p - .2) / .42)) : 0;
    $('.fd-result .fd-native-group').setAttribute('transform', `translate(${8 * offset} ${11 * offset})`);
    setText('.fd-delta', state.scene === 2 && offset > .01 ? `Δ ${safeValue(8*offset)}, ${safeValue(11*offset)} px` : state.scene === 2 ? `✓ ${t().aligned}` : '1×');
    const extract = state.scene === 1 ? Math.sin(Math.min(1, p * 1.2) * Math.PI) : 0;
    host.style.setProperty('--fd-extract', extract.toFixed(3));
  }

  function stop() { cancelAnimationFrame(state.frame); state.frame = 0; state.last = 0; }
  function run() {
    if (state.frame || state.paused || !state.visible || !state.active) return;
    state.frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    state.frame = 0;
    if (state.paused || !state.visible || !state.active) { state.last = 0; return; }
    state.elapsed += state.last ? Math.min(100, now - state.last) : 0;
    state.last = now;
    if (state.elapsed >= duration) {
      state.elapsed = 0;
      state.scene = (state.scene + 1) % 3;
      if (state.scene === 1) state.group = 1;
      drawRulers(); updateScene();
    } else paint();
    run();
  }

  host.addEventListener('click', (event) => {
    const sceneButton = event.target.closest('button[data-scene]');
    const groupButton = event.target.closest('button[data-group]');
    if (sceneButton) {
      state.scene = Number(sceneButton.dataset.scene); state.elapsed = 0;
      if (state.scene === 1) state.group = 1;
      drawRulers(); updateScene();
    } else if (groupButton) {
      state.group = Number(groupButton.dataset.group); state.elapsed = 0;
      drawRulers(); updateCode(); paint();
    } else if (event.target.closest('.fd-toggle')) {
      state.paused = !state.paused;
      if (state.paused) stop();
      updateScene(); run();
    } else if (event.target.closest('.fd-replay')) {
      state.elapsed = 0; updateScene();
    }
  });
  addEventListener('portfolio:language', (event) => {
    lang = (event.detail?.language || window.PortfolioI18n?.language) === 'en' ? 'en' : 'zh';
    translate();
  });
  document.addEventListener('visibilitychange', () => {
    state.active = !document.hidden;
    if (!state.active) stop();
    paint(); run();
  });
  media.addEventListener('change', () => {
    if (media.matches) { state.paused = true; stop(); updateScene(); }
  });
  if ('IntersectionObserver' in window) {
    state.visible = false;
    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (!state.visible) stop();
      paint(); run();
    }, { rootMargin: '40px', threshold: 0 }).observe(host);
  }
  translate(); run();
})();
