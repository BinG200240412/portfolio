(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const blade = 'M20 18H18V12H20V8H22V4H26V2H30V4H34V8H36V12H34V14H30V16H24V18H22V20H20Z';

  function fan() {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pixel-loader__fan');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    for (let angle = 0; angle < 360; angle += 90) {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', blade);
      if (angle) path.setAttribute('transform', `rotate(${angle} 20 20)`);
      svg.appendChild(path);
    }
    const hub = document.createElementNS(svgNS, 'path');
    hub.setAttribute('d', 'M18 18H22V22H18Z');
    svg.appendChild(hub);
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
