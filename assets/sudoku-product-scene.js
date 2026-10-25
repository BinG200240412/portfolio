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
    const scenes = new Set();
    const resize = new ResizeObserver(entries => entries.forEach(({ target, contentRect }) => {
      target.style.setProperty('--scene-scale', String(contentRect.width / size));
    }));
    function mount(scene) {
      if (scenes.has(scene)) return;
      scenes.add(scene);
      ['front', 'back'].forEach(side => {
        const screen = scene.querySelector(`[data-scene-screen="${side}"]`);
        screen.style.transform = project(quads[side]);
        scene.querySelector(`.case-phone-clip--${side}`).style.clipPath = `path("${outlines[side]}")`;
      });
      scene.querySelector('.case-phone-occlusion').style.clipPath = `path(evenodd, "M0 0 H1254 V1254 H0 Z ${outlines.body}")`;
      const images = [...scene.querySelectorAll('img')];
      const feedback = scene.querySelector('.case-scene-feedback');
      const message = '图片未能加载，请刷新页面。';
      const failed = () => {
        scene.classList.add('is-failed');
        feedback.textContent = window.PortfolioI18n?.t(message) ?? message;
        feedback.hidden = false;
      };
      const ready = () => {
        const loaded = images.every(image => image.complete && image.naturalWidth);
        scene.classList.toggle('is-ready', loaded);
        if (loaded) { scene.classList.remove('is-failed'); feedback.hidden = true; }
      };
      images.forEach(image => { image.addEventListener('load', ready); image.addEventListener('error', failed); });
      scene.style.setProperty('--scene-scale', String(scene.getBoundingClientRect().width / size));
      ready(); resize.observe(scene);
      if (images.some(image => image.complete && !image.naturalWidth)) failed();
    }
    function scan(root) {
      if (root.nodeType !== 1) return;
      if (root.matches('.case-phone-scene')) mount(root);
      root.querySelectorAll('.case-phone-scene').forEach(mount);
    }
    scan(document.body);
    new MutationObserver(records => records.forEach(record => {
      record.addedNodes.forEach(scan);
      record.removedNodes.forEach(root => {
        if (root.nodeType !== 1) return;
        const removed = root.matches('.case-phone-scene') ? [root] : [];
        removed.push(...root.querySelectorAll('.case-phone-scene'));
        removed.forEach(scene => { resize.unobserve(scene); scenes.delete(scene); });
      });
    })).observe(document.body, { childList: true, subtree: true });
    addEventListener('pagehide', () => resize.disconnect());
    addEventListener('pageshow', () => scenes.forEach(scene => resize.observe(scene)));
    addEventListener('portfolio:language', () => scenes.forEach(scene => {
      const feedback = scene.querySelector('.case-scene-feedback');
      feedback.textContent = window.PortfolioI18n?.t('图片未能加载，请刷新页面。') ?? '图片未能加载，请刷新页面。';
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
