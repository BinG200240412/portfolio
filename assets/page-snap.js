/* Each work owns its document scroller, including when opened inside the hub.
   Native snapping leaves oversized pages scrollable; there is no wheel handler. */
(() => {
  'use strict';
  const root = document.documentElement;
  const file = location.pathname.split('/').pop() || 'index.html';
  // The right-hand rail mirrors the actual snap panels in each document. It
  // never drives wheel input, so tall panels can still be read at their pace.
  function installPageRail() {
    const rail = document.createElement('nav');
    rail.className = 'portfolio-page-rail';
    rail.setAttribute('aria-label', '页面导航');
    rail.setAttribute('data-i18n-ignore', '');
    rail.hidden = true;
    document.body.appendChild(rail);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let panels = [], buttons = [], active = -1, frame = 0;
    const selector = file === 'sudoku.html'
      ? '.sudoku-opening > .hero, .sudoku-scenes .case-chapter'
      : file === 'xr.html'
        ? '.gogo-hero, .gogo-snap-page, .gogo-concept-visual-page, .gogo-concept-details, .gogo-interaction-page'
        : file === 'index.html'
          ? '.about-hero, .about-details, .about-details > section'
          : '.portfolio-snap-page';
    // A chapter may delegate native snapping to its inner reading stops while
    // remaining a single entry in the chapter navigation.
    const isPanel = element => element.getClientRects().length > 0 &&
      (element.hasAttribute('data-snap-navigation') ||
        (getComputedStyle(element).scrollSnapAlign !== 'none' &&
         getComputedStyle(element).scrollSnapAlign !== 'auto'));
    const label = (element, index, total) => {
      const heading = element.querySelector('h1,h2,h3');
      const name = heading?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 42);
      const english = document.documentElement.lang.startsWith('en');
      return english ? `Go to page ${index + 1} of ${total}${name ? `: ${name}` : ''}`
        : `跳转到第 ${index + 1} / ${total} 页${name ? `：${name}` : ''}`;
    };
    function sync() {
      frame = 0;
      if (!panels.length) return;
      const line = innerHeight * .42;
      let next = 0;
      for (let i = 1; i < panels.length; i++) {
        if (panels[i].getBoundingClientRect().top <= line) next = i;
        else break;
      }
      if (next === active) return;
      active = next;
      buttons.forEach((button, index) => {
        const distance = Math.abs(index - active);
        button.classList.toggle('is-current', distance === 0);
        button.classList.toggle('is-near', distance === 1);
        if (distance === 0) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
    function rebuild(force = false) {
      rail.setAttribute('aria-label', document.documentElement.lang.startsWith('en')
        ? 'Page navigation' : '页面导航');
      const next = [...document.querySelectorAll(selector)].filter(isPanel);
      if (next.length < 2) {
        panels = []; buttons = []; active = -1;
        rail.replaceChildren(); rail.hidden = true;
        root.classList.remove('portfolio-dot-rail-on');
        return;
      }
      if (!force && next.length === panels.length && next.every((panel, i) => panel === panels[i])) {
        schedule(); return;
      }
      panels = next; active = -1;
      buttons = panels.map((panel, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'portfolio-page-point';
        button.setAttribute('aria-label', label(panel, index, panels.length));
        const light = document.createElement('span');
        light.className = 'portfolio-page-point-light';
        light.setAttribute('aria-hidden', 'true');
        button.appendChild(light);
        button.addEventListener('click', () => {
          panel.scrollIntoView({block:'start', behavior:reduced.matches ? 'auto' : 'smooth'});
          schedule();
        });
        return button;
      });
      rail.replaceChildren(...buttons);
      rail.hidden = false;
      root.classList.add('portfolio-dot-rail-on');
      schedule();
    }
    addEventListener('scroll', schedule, {passive:true});
    addEventListener('resize', () => rebuild(), {passive:true});
    addEventListener('portfolio:language', () => rebuild(true));
    if (file === 'index.html') {
      addEventListener('portfolio:navigation', () => rebuild());
    }
    rebuild();
    // Defer scripts can run at readyState=interactive, before this file has
    // assigned the page classes below. Recheck after that layout is installed.
    requestAnimationFrame(() => rebuild());
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', installPageRail, {once:true});
  else installPageRail();
  // These two works already have page-specific geometry and the same snap rule.
  if (file === 'xr.html' || file === 'sudoku.html') return;
  const page = element => {
    element?.classList.add('portfolio-snap-page');
    return element;
  };
  const cover = element => {
    page(element)?.classList.add('portfolio-snap-cover');
  };
  const group = nodes => {
    if (!nodes.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'portfolio-snap-page portfolio-snap-flow';
    nodes[0].before(wrapper);
    wrapper.append(...nodes);
  };
  const legacy = ['qianli.html', 'drift.html'];
  let enabled = true;
  if (file === 'ai3d.html') {
    root.dataset.snapLayout = 'ai3d';
    cover(document.querySelector('body > .hero'));
    document.querySelectorAll('[data-ai3d-page]').forEach(page);
  } else if (legacy.includes(file)) {
    root.dataset.snapLayout = 'legacy';
    if (file === 'drift.html') root.classList.add('drift-paged');
    cover(document.querySelector('body > .hero'));
    document.querySelectorAll('body > .wrap').forEach(wrap => {
      let pending = [];
      const flush = () => { group(pending); pending = []; };
      [...wrap.children].forEach(element => {
        if (element.matches('header.top,script,style')) return;
        if (element.matches('.pdfbar,footer')) {
          flush(); element.classList.add('portfolio-snap-end'); return;
        }
        if (element.matches('.intro,.actbar')) {
          flush(); pending = [element]; return;
        }
        if (element.matches('section,.core,.feat,.closing')) {
          // A short introduction or chapter heading belongs with its next panel.
          if (pending.length === 1) { pending.push(element); flush(); }
          else { flush(); group([element]); }
          return;
        }
        pending.push(element);
      });
      flush();
    });
  } else if (file === 'tea.html') {
    root.dataset.snapLayout = 'tea';
    document.querySelectorAll('main > .tea-page').forEach(page);
    document.querySelector('.tea-cover')?.classList.add('portfolio-snap-cover');
  } else if (file === 'design-skills.html') {
    root.dataset.snapLayout = 'skills';
    document.querySelectorAll('main > .skills-hero,main > .skill-chapter').forEach(page);
    document.querySelector('.skills-footer')?.classList.add('portfolio-snap-end');
  } else if (file === 'arright.html') {
    root.dataset.snapLayout = 'arright';
    const main = document.querySelector('main.wrap');
    if (main) {
      let pending = [];
      [...main.children].forEach(element => {
        if (element.matches('.hero,figure,.mechanics')) pending.push(element);
        if (element.matches('.mechanics')) { group(pending); pending = []; }
        if (element.matches('.mobile-section')) { group(pending); pending = []; page(element); }
      });
      group(pending);
    }
  } else if (file === 'practice.html') {
    root.dataset.snapLayout = 'practice';
    page(document.querySelector('main.practice'));
    document.querySelectorAll('.practice-card').forEach(element => element.classList.add('portfolio-snap-subpage'));
  } else if (file === 'more.html') {
    root.dataset.snapLayout = 'archive';
    page(document.querySelector('body > .wrap'));
  } else if (file === 'sudoku-demo.html') {
    root.dataset.snapLayout = 'demo';
    group([...document.body.children].filter(element => element.matches('.head,.phone,.legend,.foot')));
  } else if (file === 'index.html') {
    root.dataset.snapLayout = 'about';
    page(document.querySelector('.about-hero'));
    page(document.querySelector('.about-details'));
    document.querySelectorAll('.about-details > section').forEach(element => element.classList.add('portfolio-snap-subpage'));
    const sync = () => root.classList.toggle('portfolio-paged', document.body.classList.contains('expanded'));
    new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
    sync(); enabled = false;
  } else enabled = false;
  if (enabled) root.classList.add('portfolio-paged');
})();
