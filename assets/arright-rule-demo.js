/* A portfolio explanation of one design decision, not a playable Arright level. */
(() => {
  'use strict';
  const copy = {
    zh: {
      graphic: '书桌、椅子、窗户与门口通路的关系示意。点击旋转椅子，检查它是否朝向书桌。',
      desk: '书桌', window: '窗', entrance: '门口',
      rotate: '旋转椅子', zones: '显示功能空间', reset: '重置',
      success: '椅子朝向书桌',
      east: '椅子朝向窗户', south: '椅子背向书桌', west: '椅子朝向侧墙',
      pass: '这条关系成立。椅子面向书桌，坐下后才能使用它。',
      fail: '位置放得下，朝向却不成立。继续旋转，让椅子朝向书桌。',
      orientation: '朝向书桌', use: '使用区未被占用', route: '门口通路可达',
      legend: '浅色区域：椅子使用区与门口通路',
      note: '规则说明 · 示意平面，不对应实际关卡，也不证明唯一解。'
    },
    en: {
      graphic: 'A diagram of the relationship between a desk, chair, window and entrance. Rotate the chair to check whether it faces the desk.',
      desk: 'DESK', window: 'WINDOW', entrance: 'ENTRY',
      rotate: 'Rotate chair', zones: 'Show functional space', reset: 'Reset',
      success: 'The chair faces the desk',
      east: 'The chair faces the window', south: 'The chair faces away from the desk', west: 'The chair faces the side wall',
      pass: 'This relationship works. The chair faces the desk so it can be used.',
      fail: 'It fits, but the orientation does not work. Keep rotating to face the desk.',
      orientation: 'Faces the desk', use: 'Use zone stays clear', route: 'Entrance stays reachable',
      legend: 'Shaded areas: chair use zone and entrance passage',
      note: 'Rule explanation · A schematic, not an actual level or a proof of a unique solution.'
    }
  };
  const init = () => {
    const host = document.getElementById('rule-demo');
    if (!host || host.dataset.ruleMounted) return;
    host.dataset.ruleMounted = 'true';
    host.setAttribute('data-i18n-ignore', '');
    let direction = 0; // east, south, west, north
    let showZones = false;
    let language = '';
    host.innerHTML = `
      <div class="ard-plan">
        <svg class="ard-diagram" viewBox="0 0 600 400" role="img" aria-labelledby="ard-title">
          <title id="ard-title"></title>
          <defs>
            <pattern id="ard-grid" x="60" y="48" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 H 0 V 60" fill="none" stroke="currentColor" stroke-width=".7" opacity=".18"/>
            </pattern>
            <marker id="ard-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M1 1 L6 4 L1 7" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </marker>
          </defs>
          <rect x="60" y="48" width="480" height="300" fill="url(#ard-grid)"/>
          <g class="ard-zones" aria-hidden="true">
            <path d="M240 108 H360 V228 H240 Z" class="ard-use-zone"/>
            <path d="M120 348 V228 H240 V288 H180 V348 Z" class="ard-passage-zone"/>
            <path d="M150 338 V258 H222" class="ard-route" marker-end="url(#ard-arrow)"/>
            <path d="M250 118 H350 V218 H250 Z" class="ard-use-outline"/>
          </g>
          <g class="ard-walls" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square">
            <path d="M120 348 H60 V48 H540 V108 M540 228 V348 H180"/>
            <path d="M534 108 V228 M546 108 V228" stroke-width="1.5"/>
            <path d="M120 348 V288 M120 288 A60 60 0 0 1 180 348" stroke-width="1" opacity=".55"/>
          </g>
          <g class="ard-desk" fill="var(--paper)" stroke="currentColor" stroke-width="1.8">
            <rect x="240" y="48" width="120" height="60"/>
            <path d="M248 56 H352 M248 100 H352" opacity=".35"/>
            <path d="M267 66 H301 V87 H267 Z M284 87 V93 M274 93 H294" stroke-width="1.1" fill="none"/>
            <path d="M318 65 V91 M324 65 V91" stroke-width="1"/>
          </g>
          <g class="ard-chair-position" transform="translate(300 168)">
            <g class="ard-chair" fill="var(--paper)" stroke="currentColor" stroke-width="2">
              <rect x="-15" y="-19" width="31" height="38" rx="5"/>
              <path d="M-23 -23 V23 M-18 -18 V18" stroke-width="3" stroke-linecap="round"/>
              <path d="M21 0 H56" class="ard-facing-arrow" fill="none" marker-end="url(#ard-arrow)"/>
            </g>
          </g>
          <g class="ard-diagram-labels" fill="currentColor" text-anchor="middle">
            <text x="300" y="31" data-ard-text="desk"></text>
            <text x="570" y="174" class="ard-window-label" data-ard-text="window"></text>
            <text x="150" y="378" data-ard-text="entrance"></text>
          </g>
        </svg>
        <p class="ard-legend" data-ard-text="legend" hidden></p>
      </div>
      <div class="ard-controls">
        <button type="button" class="ard-rotate" data-ard-action="rotate"><span aria-hidden="true">↻</span><span data-ard-text="rotate"></span></button>
        <button type="button" data-ard-action="zones" aria-pressed="false" data-ard-text="zones"></button>
        <button type="button" class="ard-reset" data-ard-action="reset" data-ard-text="reset"></button>
      </div>
      <div class="ard-feedback" aria-live="polite" aria-atomic="true">
        <p class="ard-status"></p>
        <p class="ard-explanation"></p>
      </div>
      <ul class="ard-checks">
        <li class="ard-orientation-check"><span class="ard-check-symbol" aria-hidden="true"></span><span data-ard-text="orientation"></span></li>
        <li><span aria-hidden="true">✓</span><span data-ard-text="use"></span></li>
        <li><span aria-hidden="true">✓</span><span data-ard-text="route"></span></li>
      </ul>
      <p class="ard-note" data-ard-text="note"></p>`;
    const sync = () => {
      const nextLanguage = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
      const t = copy[nextLanguage];
      if (language !== nextLanguage) {
        language = nextLanguage;
        host.querySelectorAll('[data-ard-text]').forEach(node => { node.textContent = t[node.dataset.ardText]; });
        host.querySelector('#ard-title').textContent = t.graphic;
      }
      const valid = direction === 3;
      host.dataset.direction = String(direction);
      host.dataset.relationship = valid ? 'valid' : 'invalid';
      host.classList.toggle('ard-zones-visible', showZones);
      host.querySelector('.ard-chair').style.transform = `rotate(${direction * 90}deg)`;
      host.querySelector('[data-ard-action="zones"]').setAttribute('aria-pressed', String(showZones));
      host.querySelector('.ard-legend').hidden = !showZones;
      host.querySelector('.ard-status').textContent = valid ? t.success : t[['east', 'south', 'west'][direction]];
      host.querySelector('.ard-explanation').textContent = valid ? t.pass : t.fail;
      host.querySelector('.ard-check-symbol').textContent = valid ? '✓' : '×';
      host.querySelector('.ard-orientation-check').setAttribute('aria-label', `${t.orientation}: ${valid ? (language === 'en' ? 'yes' : '满足') : (language === 'en' ? 'no' : '未满足')}`);
    };
    host.addEventListener('click', event => {
      const action = event.target.closest('[data-ard-action]')?.dataset.ardAction;
      if (!action) return;
      if (action === 'rotate') direction = (direction + 1) % 4;
      if (action === 'zones') showZones = !showZones;
      if (action === 'reset') { direction = 0; showZones = false; }
      sync();
    });
    window.addEventListener('portfolio:language', sync);
    new MutationObserver(sync).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
