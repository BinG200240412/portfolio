/* Coordinates refer to the original 1320 x 2868 screenshot, not its hardware frame. */
(() => {
  'use strict';
  function init() {
    const gallery = document.getElementById('sudoku-gallery');
    const stage = document.getElementById('sudoku-anatomy');
    const notes = document.getElementById('sudoku-anatomy-callouts');
    const svg = stage?.querySelector('.anatomy-connections');
    const screen = document.getElementById('sudoku-active-image');
    const device = screen?.closest('.sudoku-device');
    if (!gallery || !stage || !notes || !svg || !device || !window.SudokuAnatomyScreens) return;
    const NS = 'http://www.w3.org/2000/svg';
    const t = source => window.PortfolioI18n?.t(source) ?? source;
    const hint = gallery.querySelector('.anatomy-instruction');
    const hintSource = hint?.textContent.trim();
    const highlight = document.createElement('span');
    highlight.className = 'anatomy-highlight';
    const target = document.createElement('span');
    target.className = 'anatomy-target';
    highlight.setAttribute('aria-hidden', 'true');
    target.setAttribute('aria-hidden', 'true');
    device.append(highlight, target);
    let items = [], buttons = [], paths = [], nodes = [], selected = -1, active = -1, frame = 0;

    function el(name, attributes) {
      const node = document.createElementNS(NS, name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      return node;
    }
    function activate(index) {
      active = index;
      stage.classList.toggle('has-active', index >= 0);
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      paths.forEach((path, i) => path.classList.toggle('is-active', i === index));
      nodes.forEach((node, i) => node.classList.toggle('is-active', i === index));
      if (index < 0) return;
      const item = items[index];
      const [x, y, width, height] = item.bounds;
      Object.assign(highlight.style, {
        left: `${5.1020408163 + x * .897959183673}%`, top: `${2.2 + y * .956}%`,
        width: `${width * .897959183673}%`, height: `${height * .956}%`,
      });
      target.style.left = `${5.1020408163 + item.anchor[0] * .897959183673}%`;
      target.style.top = `${2.2 + item.anchor[1] * .956}%`;
    }
    function draw() {
      frame = 0;
      const rect = stage.getBoundingClientRect(), photo = screen.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const mobile = matchMedia('(max-width: 720px)').matches;
      if (!mobile) {
        const heights = buttons.map(button => button.getBoundingClientRect().height);
        const required = Math.max(...['left', 'right'].map(side => {
          const column = items.map((item, i) => item.side === side ? heights[i] : 0).filter(Boolean);
          return column.reduce((sum, height) => sum + height, 0) + Math.max(0, column.length - 1) * 24 + 48;
        }));
        const extra = `${Math.max(0, Math.ceil(required - device.getBoundingClientRect().height - 64))}px`;
        if (stage.style.getPropertyValue('--annotation-extra') !== extra) {
          stage.style.setProperty('--annotation-extra', extra); schedule(); return;
        }
      }
      if (!mobile) ['left', 'right'].forEach(side => {
        const column = buttons.map((button, i) => ({ button, item: items[i], height: button.getBoundingClientRect().height }))
          .filter(note => note.item.side === side).sort((a, b) => a.item.position - b.item.position);
        column.forEach((note, i) => {
          const preferred = Math.max(0, rect.height - note.height - 24) * note.item.position / 100;
          note.top = Math.max(preferred, i ? column[i - 1].top + column[i - 1].height + 24 : 0);
        });
        for (let i = column.length - 1; i >= 0; i--) {
          const note = column[i], limit = i === column.length - 1 ? rect.height - 24 : column[i + 1].top - 24;
          note.top = Math.min(note.top, limit - note.height);
          note.button.style.setProperty('--note-y', `${note.top}px`);
        }
      });
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.replaceChildren(); paths = []; nodes = [];
      const joints = { left: [], right: [] };
      items.forEach((item, i) => {
        const label = buttons[i].getBoundingClientRect();
        const left = item.side === 'left';
        const start = {
          x: mobile ? label.left - rect.left + 2.5 : (left ? label.right - 2.5 : label.left + 2.5) - rect.left,
          y: mobile ? label.top - rect.top : label.top - rect.top + 25.5,
        };
        const end = { x: photo.left - rect.left + photo.width * item.anchor[0] / 100,
          y: photo.top - rect.top + photo.height * item.anchor[1] / 100 };
        const edge = (left ? photo.left : photo.right) - rect.left;
        const joint = { x: mobile ? start.x + (i % 2 ? 16 : -16) : (start.x + edge) / 2,
          y: mobile ? photo.bottom - rect.top + 18 + i * 6 : start.y + (end.y - start.y) * .48 };
        const d = mobile
          ? `M ${start.x} ${start.y} C ${start.x} ${start.y - 28}, ${joint.x} ${joint.y + 20}, ${joint.x} ${joint.y} S ${end.x} ${end.y + 38}, ${end.x} ${end.y}`
          : `M ${start.x} ${start.y} C ${joint.x} ${start.y}, ${joint.x - (left ? 18 : -18)} ${joint.y}, ${joint.x} ${joint.y} S ${edge + (left ? -12 : 12)} ${end.y}, ${end.x} ${end.y}`;
        const path = el('path', { d, class: 'anatomy-connection' });
        const node = el('circle', { cx: joint.x, cy: joint.y, r: 2.6, class: 'anatomy-node' });
        svg.append(path, node); paths.push(path); nodes.push(node);
        joints[item.side].push(joint);
      });
      if (!mobile) Object.values(joints).forEach(points => points.slice(1).forEach((point, i) => {
        const previous = points[i], bow = point.x + (point.x < rect.width / 2 ? -24 : 24);
        svg.prepend(el('path', { class: 'anatomy-branch', d: `M ${previous.x} ${previous.y} C ${bow} ${previous.y + 32}, ${bow} ${point.y - 32}, ${point.x} ${point.y}` }));
      }));
      activate(active);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
    function render() {
      items = window.SudokuAnatomyScreens[gallery.dataset.screen || 'board'] || [];
      selected = -1; active = -1; notes.replaceChildren();
      buttons = items.map((item, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'anatomy-callout';
        button.dataset.side = item.side;
        button.style.setProperty('--note-x', `${item.side === 'left' ? [1, 4, 0][Math.floor(i / 2)] ?? 1 : [77, 75, 78][Math.floor(i / 2)] ?? 77}%`);
        button.style.setProperty('--note-y', `${item.position}%`);
        const title = document.createElement('span'), text = document.createElement('span');
        title.className = 'anatomy-callout-title'; title.textContent = t(item.title);
        text.className = 'anatomy-callout-text'; text.textContent = t(item.text);
        button.append(title, text); button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-controls', 'sudoku-active-image');
        button.addEventListener('mouseenter', () => activate(i));
        button.addEventListener('mouseleave', () => activate(selected));
        button.addEventListener('focus', () => activate(i));
        button.addEventListener('blur', () => activate(selected));
        button.addEventListener('click', () => { selected = selected === i ? -1 : i; activate(selected); });
        notes.append(button); return button;
      });
      if (hint) hint.textContent = t(hintSource);
      activate(-1); schedule();
    }
    gallery.addEventListener('sudoku:screen', render);
    screen.addEventListener('load', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(stage); resize.observe(screen); resize.observe(notes);
    document.fonts?.ready.then(schedule);
    addEventListener('pagehide', () => { resize.disconnect(); cancelAnimationFrame(frame); frame = 0; });
    addEventListener('pageshow', () => { resize.observe(stage); resize.observe(screen); resize.observe(notes); schedule(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
