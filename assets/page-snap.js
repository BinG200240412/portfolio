/* Each work owns its document scroller, including when opened inside the hub.
   Native snapping leaves oversized pages scrollable; there is no wheel handler. */
(() => {
  'use strict';
  const root = document.documentElement;
  const file = location.pathname.split('/').pop() || 'index.html';
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
  const legacy = ['ai3d.html', 'qianli.html', 'drift.html'];
  let enabled = true;
  if (legacy.includes(file)) {
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
