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
    const beadTrack = document.createElement('div');
    beadTrack.className = 'portfolio-page-beads';
    beadTrack.setAttribute('aria-hidden', 'true');
    rail.appendChild(beadTrack);
    document.body.appendChild(rail);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let panels = [], buttons = [], beads = [], anchors = [], active = -1, frame = 0;
    const selector = file === 'sudoku.html'
      ? '.sudoku-opening > .hero, .sudoku-scenes .case-chapter'
      : file === 'xr.html'
        ? '.gogo-hero, .gogo-snap-page, .gogo-concept-visual-page, .gogo-concept-details, .gogo-interaction-page'
        : file === 'index.html'
          ? '.about-hero, .about-details, .about-details > section'
          : '.portfolio-snap-page';
    const isPanel = element => element.getClientRects().length > 0 &&
      getComputedStyle(element).scrollSnapAlign !== 'none' &&
      getComputedStyle(element).scrollSnapAlign !== 'auto';
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
        button.classList.toggle('is-current', index === active);
        if (index === active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      const focus = anchors[active];
      const pageStops = new Set(anchors);
      beads.forEach((bead, index) => {
        const distance = Math.abs(index - focus), direction = Math.sign(index - focus);
        const side = distance > 0 && distance <= 5 ? direction * (1.2 + (5 - distance) * .72) : 0;
        const retreat = distance > 0 && distance <= 3 ? direction * (4 - distance) * 1.4 : 0;
        const size = distance === 0 ? 10 : pageStops.has(index) ? 4.5 : distance <= 2 ? 3.6 : 2.8;
        const fade = distance === 0 ? 1 : Math.min(.76,
          .24 + .48 * Math.exp(-distance / 9) + (pageStops.has(index) ? .13 : 0));
        bead.style.setProperty('--bead-x', `${side.toFixed(2)}px`);
        bead.style.setProperty('--bead-y', `${retreat.toFixed(2)}px`);
        bead.style.setProperty('--bead-size', `${size}px`);
        bead.style.setProperty('--bead-opacity', fade.toFixed(3));
      });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
    function refreshBeads() {
      if (rail.hidden || !panels.length) return;
      // Physical pitch follows viewport height, never the number of chapters.
      const count = Math.max(30, Math.round(rail.clientHeight / 13));
      if (count === beads.length && anchors.length === panels.length) return;
      beads = Array.from({length:count}, (_, index) => {
        const bead = document.createElement('span');
        bead.className = 'portfolio-page-bead';
        bead.style.top = `${index / (count - 1) * 100}%`;
        return bead;
      });
      anchors = panels.map((_, index) => Math.round(index * (count - 1) / (panels.length - 1)));
      beadTrack.replaceChildren(...beads);
      buttons.forEach((button, index) => {
        button.style.top = `${anchors[index] / (count - 1) * 100}%`;
      });
      active = -1;
    }
    function rebuild(force = false) {
      rail.setAttribute('aria-label', document.documentElement.lang.startsWith('en')
        ? 'Page navigation' : '页面导航');
      const next = [...document.querySelectorAll(selector)].filter(isPanel);
      if (next.length < 2) {
        panels = []; buttons = []; beads = []; anchors = []; active = -1;
        rail.replaceChildren(beadTrack); beadTrack.replaceChildren(); rail.hidden = true;
        root.classList.remove('portfolio-dot-rail-on');
        return;
      }
      if (!force && next.length === panels.length && next.every((panel, i) => panel === panels[i])) {
        refreshBeads();
        schedule(); return;
      }
      panels = next; anchors = []; active = -1;
      buttons = panels.map((panel, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'portfolio-page-point';
        button.setAttribute('aria-label', label(panel, index, panels.length));
        button.addEventListener('click', () => {
          panel.scrollIntoView({block:'start', behavior:reduced.matches ? 'auto' : 'smooth'});
          schedule();
        });
        return button;
      });
      rail.replaceChildren(beadTrack, ...buttons);
      rail.hidden = false;
      root.classList.add('portfolio-dot-rail-on');
      refreshBeads();
      schedule();
    }
    rail.addEventListener('click', event => {
      if (!panels.length || event.target.closest('.portfolio-page-point')) return;
      const bounds = rail.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      panels[Math.round(fraction * (panels.length - 1))]
        .scrollIntoView({block:'start', behavior:reduced.matches ? 'auto' : 'smooth'});
    });
    addEventListener('scroll', schedule, {passive:true});
    addEventListener('resize', () => rebuild(), {passive:true});
    addEventListener('portfolio:language', () => rebuild(true));
    if (file === 'index.html') {
      addEventListener('portfolio:navigation', () => rebuild());
    }
    rebuild();
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
