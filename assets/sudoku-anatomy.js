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
    let items = [], buttons = [], paths = [], boxes = [], frames = [], nodes = [], selected = -1, active = -1, frame = 0;

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
      boxes.forEach((box, i) => box.classList.toggle('is-active', i === index));
      frames.forEach((box, i) => box.classList.toggle('is-active', i === index));
      nodes.forEach((node, i) => node.classList.toggle('is-active', i === index));
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
      const leaders = el('g', {}), regions = el('g', {}), outlines = el('g', {}), tips = el('g', {});
      svg.replaceChildren(leaders, regions, outlines, tips); paths = []; boxes = []; frames = []; nodes = [];
      items.forEach((item, i) => {
        const label = buttons[i].getBoundingClientRect();
        const left = item.side === 'left';
        const [x, y, width, height] = item.bounds;
        const box = {
          x: photo.left - rect.left + photo.width * x / 100,
          y: photo.top - rect.top + photo.height * y / 100,
          width: photo.width * width / 100,
          height: photo.height * height / 100,
        };
        const labelBox = {
          x: label.left - rect.left + .7,
          y: label.top - rect.top + .7,
          width: Math.max(0, label.width - 1.4),
          height: Math.max(0, label.height - 1.4),
        };
        const start = {
          x: (left !== mobile ? labelBox.x + labelBox.width : labelBox.x),
          y: labelBox.y + labelBox.height / 2,
        };
        // Enter the actual component from its near edge, rather than stopping at the bezel.
        const inset = Math.min(6, box.width / 2), yInset = Math.min(2, box.height / 2);
        const end = {
          x: left ? box.x + inset : box.x + box.width - inset,
          y: Math.max(box.y + yInset, Math.min(box.y + box.height - yInset,
            photo.top - rect.top + photo.height * item.anchor[1] / 100)),
        };
        const direction = left ? 1 : -1;
        const deltaY = end.y - start.y;
        const diagonalY = Math.sign(deltaY) * Math.min(20, Math.abs(deltaY));
        let firstX, bendX;
        if (mobile) {
          // An active mobile leader travels outside the two-column labels, then
          // returns horizontally to its exact control. Keep it within the page gutter.
          const available = left ? rect.left - 4 : innerWidth - rect.right - 4;
          const gutter = Math.max(0, Math.min(22, available));
          const rail = left ? -gutter : rect.width + gutter;
          firstX = start.x + (rail - start.x) * .7;
          bendX = rail;
        } else {
          // Long horizontal runs carry the connection. A short diagonal and an
          // optional vertical leg absorb the height difference without a long slash.
          const distance = Math.max(0, direction * (end.x - start.x));
          const diagonalX = Math.min(24, distance * .12);
          const finalRun = Math.min(150, Math.max(22, distance * .38), distance - diagonalX);
          firstX = start.x + direction * Math.max(0, distance - diagonalX - finalRun);
          bendX = firstX + direction * diagonalX;
        }
        const d = `M ${start.x} ${start.y} H ${firstX} L ${bendX} ${start.y + diagonalY} V ${end.y} H ${end.x}`;
        const path = el('path', { d, class: 'anatomy-connection' });
        const region = el('rect', { ...box, class: 'anatomy-region' });
        const outline = el('rect', { ...labelBox, class: 'anatomy-callout-frame' });
        const node = el('circle', { cx: end.x, cy: end.y, r: 2, class: 'anatomy-node' });
        leaders.append(path); regions.append(region); outlines.append(outline); tips.append(node);
        paths.push(path); boxes.push(region); frames.push(outline); nodes.push(node);
      });
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
        button.append(title);
        if (item.text) button.append(text);
        button.setAttribute('aria-pressed', 'false');
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
