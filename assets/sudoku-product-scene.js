/* The photograph owns the camera perspective. Only the original screen pixels
 * are mapped into its measured display planes; no UI is generated or redrawn. */
(() => {
  'use strict';
  const size = 1254;
  const quads = {
    front: [[205, 174], [607, 147], [723, 1111], [322, 1163]],
    back: [[643, 47], [1045, 73], [979, 1035], [577, 986]],
  };
  const outlines = {
    front: 'M266 170 L550 151 C588 148 607 170 613 210 L715 1056 C720 1092 704 1114 655 1120 L376 1156 C344 1160 322 1143 318 1120 L213 233 C208 201 226 175 266 170 Z',
    back: 'M700 51 L990 70 C1024 72 1045 95 1041 136 L983 974 C981 1011 958 1032 925 1028 L628 991 C594 987 575 966 581 930 L638 111 C640 73 660 49 700 51 Z',
    body: 'M248 154 L549 134 C593 130 619 151 627 196 L732 1055 C739 1101 722 1129 684 1138 L376 1178 C327 1187 291 1173 277 1135 C270 1117 266 1095 264 1072 L172 254 C165 211 179 182 209 164 C221 158 234 155 248 154 Z',
  };

  function project(quad) {
    const source = [[0, 0], [1320, 0], [1320, 2868], [0, 2868]];
    const rows = [];
    source.forEach(([x, y], i) => {
      const [u, v] = quad[i];
      rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    });
    for (let col = 0; col < 8; col++) {
      let pivot = col;
      for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
      [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
      const divisor = rows[col][col];
      for (let i = col; i < 9; i++) rows[col][i] /= divisor;
      for (let row = 0; row < 8; row++) if (row !== col) {
        const factor = rows[row][col];
        for (let i = col; i < 9; i++) rows[row][i] -= factor * rows[col][i];
      }
    }
    const [a, b, c, d, e, f, g, h] = rows.map(row => row[8]);
    return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].join(',')})`;
  }

  function init() {
    const scenes = new Map();
    let shown = true, host = null;
    try { host = window.frameElement?.closest('#section') || null; } catch (_) {}
    const resize = new ResizeObserver(entries => entries.forEach(({ target, contentRect }) => {
      target.style.setProperty('--scene-scale', String(contentRect.width / size));
    }));
    const english = () => window.PortfolioI18n?.language === 'en' || document.documentElement.lang.startsWith('en');
    const available = record => shown && record.near && !document.hidden && (!host || host.classList.contains('on'));
    function update(record) {
      const ready = record.images.filter(state => state.phase === 'ready').length;
      const failed = record.images.filter(state => state.phase === 'error').length;
      record.scene.classList.toggle('is-ready', ready === record.images.length);
      record.scene.classList.toggle('is-failed', failed > 0);
      record.scene.dataset.sceneReady = String(ready);
      record.scene.dataset.sceneFailed = String(failed);
      record.feedback.hidden = true;
      record.retry.hidden = !failed;
      record.retry.textContent = english() ? 'Retry' : '重试';
      record.retry.setAttribute('aria-label', english() ? 'Reload unavailable image layers' : '重新载入未完成的图片');
    }
    function settle(record, state, phase) {
      clearTimeout(state.timer); state.timer = 0;
      state.phase = phase; state.image.dataset.sceneState = phase;
      update(record);
    }
    function watch(record, state, retry = false) {
      if (state.image.complete && state.image.naturalWidth) { settle(record, state, 'ready'); return; }
      if (!available(record) || state.phase === 'ready' || (state.phase === 'error' && !retry)) return;
      clearTimeout(state.timer);
      const request = ++state.request;
      state.phase = 'loading'; state.image.dataset.sceneState = 'loading';
      state.image.loading = 'eager';
      if (retry) {
        const url = new URL(state.source, document.baseURI);
        url.searchParams.set('scene-retry', String(++state.attempt));
        state.image.src = url.href;
      }
      state.timer = setTimeout(() => {
        if (state.request !== request) return;
        settle(record, state, state.image.complete && state.image.naturalWidth ? 'ready' : 'error');
      }, 10000);
    }
    function sync(record) {
      record.images.forEach(state => {
        if (available(record)) watch(record, state);
        else if (state.phase === 'loading') {
          clearTimeout(state.timer); state.timer = 0; ++state.request;
          state.phase = 'paused'; state.image.dataset.sceneState = 'paused';
        }
      });
      update(record);
    }
    const nearby = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      entries.forEach(entry => { const record = scenes.get(entry.target); if (record) { record.near = entry.isIntersecting; sync(record); } });
    }, {rootMargin:'300px 0px'}) : null;
    function mount(scene) {
      if (scenes.has(scene)) return;
      ['front', 'back'].forEach(side => {
        const screen = scene.querySelector(`[data-scene-screen="${side}"]`);
        screen.style.transform = project(quads[side]);
        scene.querySelector(`.case-phone-clip--${side}`).style.clipPath = `path("${outlines[side]}")`;
      });
      scene.querySelector('.case-phone-occlusion').style.clipPath = `path(evenodd, "M0 0 H1254 V1254 H0 Z ${outlines.body}")`;
      scene.classList.add('is-positioned');
      const retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'case-scene-retry'; retry.hidden = true;
      retry.setAttribute('data-i18n-ignore', '');
      // The main composition is already inside its zoom button. Keep retry a
      // sibling, so a failed layer never creates a button nested in that button.
      const anchor = scene.parentElement?.matches('button') ? scene.parentElement : scene;
      anchor.after(retry);
      const record = {scene, retry, feedback:scene.querySelector('.case-scene-feedback'), near:!nearby, images:[]};
      record.images = [...scene.querySelectorAll('img')].map(image => {
        const state = {image, source:image.getAttribute('src'), phase:'idle', timer:0, request:0, attempt:0};
        state.loaded = () => { if (image.complete && image.naturalWidth) settle(record, state, 'ready'); };
        state.failed = () => { if (!image.naturalWidth) settle(record, state, 'error'); };
        image.addEventListener('load', state.loaded); image.addEventListener('error', state.failed);
        // A cloned detail layer may already have loaded, or may carry an old
        // error attribute. Its own natural pixels decide visibility afresh.
        if (image.complete && image.naturalWidth) state.phase = 'ready';
        else if (image.complete) state.phase = 'error';
        image.dataset.sceneState = state.phase;
        return state;
      });
      retry.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        record.images.filter(state => state.phase === 'error').forEach(state => watch(record, state, true));
        update(record);
      });
      scenes.set(scene, record);
      scene.style.setProperty('--scene-scale', String(scene.getBoundingClientRect().width / size));
      update(record); resize.observe(scene); nearby?.observe(scene); sync(record);
    }
    function unmount(scene) {
      const record = scenes.get(scene); if (!record) return;
      record.images.forEach(state => {
        clearTimeout(state.timer);
        state.image.removeEventListener('load', state.loaded); state.image.removeEventListener('error', state.failed);
      });
      record.retry.remove(); nearby?.unobserve(scene); resize.unobserve(scene); scenes.delete(scene);
    }
    function scan(root) {
      if (root.nodeType !== 1) return;
      if (root.matches('.case-phone-scene')) mount(root);
      root.querySelectorAll('.case-phone-scene').forEach(mount);
    }
    scan(document.body);
    const sceneObserver = new MutationObserver(records => records.forEach(record => {
      record.addedNodes.forEach(scan);
      record.removedNodes.forEach(root => {
        if (root.nodeType !== 1) return;
        if (root.matches('.case-phone-scene')) unmount(root);
        root.querySelectorAll('.case-phone-scene').forEach(unmount);
      });
    }));
    sceneObserver.observe(document.body, { childList: true, subtree: true });
    const syncAll = () => scenes.forEach(sync);
    document.addEventListener('visibilitychange', syncAll);
    if(host){const parentObserver=new MutationObserver(syncAll);parentObserver.observe(host,{attributes:true, attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,host,{attributes:true, attributeFilter:['class']});}
    addEventListener('pagehide', () => { shown = false; syncAll(); resize.disconnect(); });
    addEventListener('pageshow', () => { shown = true; scenes.forEach(record => resize.observe(record.scene)); syncAll(); });
    addEventListener('portfolio:language', () => scenes.forEach(update));
    window.PortfolioLifecycle?.onDispose(() => {
      shown = false; sceneObserver.disconnect(); nearby?.disconnect();
      [...scenes.keys()].forEach(unmount); resize.disconnect();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
