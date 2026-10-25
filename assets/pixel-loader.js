(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  // One shared 2-unit grid keeps every fan bead the same size and spacing.
  const fanRows = [
    '....................',
    '.............##.....',
    '....##.....######...',
    '..#####....######...',
    '..#####...########..',
    '.#######..########..',
    '.#######.########...',
    '..######.######.....',
    '..##########........',
    '....##########......',
    '......##########....',
    '........##########..',
    '.....######.######..',
    '...########.#######.',
    '..########..#######.',
    '..########...#####..',
    '...######....#####..',
    '...######.....##....',
    '.....##.............',
    '....................',
  ];

  function fan() {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pixel-loader__fan');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    fanRows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== '#') return;
        const bead = document.createElementNS(svgNS, 'circle');
        bead.setAttribute('cx', String(1 + x * 2));
        bead.setAttribute('cy', String(1 + y * 2));
        bead.setAttribute('r', '0.65');
        svg.appendChild(bead);
      });
    });
    return svg;
  }

  function mount(element) {
    if (!element || element.nodeType !== 1) return element;
    element.classList.add('pixel-loader');
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    if (!element.querySelector('.pixel-loader__fan')) element.prepend(fan());
    return element;
  }

  function create(label) {
    const element = document.createElement('div');
    element.setAttribute('data-pixel-loader', '');
    element.setAttribute('data-i18n-ignore', '');
    const text = document.createElement('p');
    text.className = 'pixel-loader__label';
    text.textContent = label || '';
    element.appendChild(text);
    return mount(element);
  }

  window.PortfolioLoading = Object.freeze({ create, mount });
  function mountAll() {
    document.querySelectorAll('[data-pixel-loader]').forEach(mount);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll, { once: true });
  } else mountAll();
})();
