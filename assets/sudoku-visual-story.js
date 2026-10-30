/* A stationary device follows the analysis passing through a soft reading lens.
 * Native scrolling owns the movement; only the notes are magnified and displaced. */
(() => {
  'use strict';

  function init() {
    const root = document.getElementById('visual-system');
    const column = root?.querySelector('.visual-system-column');
    const stage = root?.querySelector('.visual-device-stage');
    const svg = stage?.querySelector('.visual-device-overlay');
    const screens = [...(stage?.querySelectorAll('[data-visual-screen]') || [])];
    const elements = [...(column?.querySelectorAll('[data-visual-step]') || [])];
    if (!root || !column || !stage || !svg || screens.length !== 2 || !elements.length) return;

    const NS = 'http://www.w3.org/2000/svg';
    const gsap = window.gsap;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 720px)');
    const viewer = document.getElementById('media-viewer');
    const opener = stage.querySelector('.visual-device-open') || stage.closest('.visual-device-open');
    const caption = root.querySelector('.visual-device-caption');
    const feedback = root.querySelector('.visual-device-feedback');
    const targets = svg.querySelector('.visual-targets') || svg.appendChild(document.createElementNS(NS, 'g'));
    const leader = svg.querySelector('.visual-leader') || svg.appendChild(document.createElementNS(NS, 'g'));
    targets.classList.add('visual-targets');
    leader.classList.add('visual-leader');
    let frameHost = null;
    try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}

    const absolute = source => new URL(source, document.baseURI).href;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const parse = (source, fallback) => {
      try { const value = JSON.parse(source); return Array.isArray(value) ? value : fallback; }
      catch (_) { return fallback; }
    };
    const steps = elements.map((element, index) => ({
      element,
      id: element.getAttribute('data-visual-step') || `visual-${index + 1}`,
      image: absolute(element.getAttribute('data-visual-image') || screens[0].getAttribute('src')),
      label: element.getAttribute('data-visual-label') || element.querySelector('h3,figcaption')?.textContent.trim() || '',
      bounds: parse(element.getAttribute('data-visual-targets'), []).filter(box =>
        Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0),
      anchor: parse(element.getAttribute('data-visual-anchor'), [0, 30]),
      anchorTarget: element.getAttribute('data-visual-anchor-target') || '',
    }));
    const t = source => window.PortfolioI18n?.t(source) ?? source;
    const english = () => window.PortfolioI18n?.language === 'en' || /^en\b/i.test(document.documentElement.lang);
    const seen = new Set();
    const images = new Map();
    const reveal = { targets: 1, line: 1 };
    let shownScreen = 0, shownStep = -1, wantedStep = -1, request = 0, frame = 0;
    let path = null, point = null, boxes = [], pathLength = 0, leaderVisible = false, marksVisible = false;
    let growth = null, swap = null, settleSwap = null, deferred = null;
    let pageShown = true, suspended = false, disposed = false;
    let layoutDirty = true, focalLine = 0;
    // These headings sit between steps, so they share the same displacement field.
    const headings = [...column.querySelectorAll(':scope > h2, .visual-system-block:not([data-visual-step]) > h3, .visual-system-block:not([data-visual-step]) > p')];
    const ornaments = headings.map(element => ({ element }));

    screens.forEach((screen, index) => {
      screen.style.opacity = index ? '0' : '1';
      screen.setAttribute('aria-hidden', index ? 'true' : 'false');
      screen.dataset.visualActive = index ? 'false' : 'true';
    });
    root.dataset.visualState = 'ready';
    root.dataset.visualInView = 'false';
    root.dataset.visualNavigation = 'continuous-lens';

    function blocked() {
      return !pageShown || document.hidden || viewer?.open ||
        Boolean(document.querySelector('#portfolio-video-detail[open]')) ||
        Boolean(frameHost && !frameHost.classList.contains('on'));
    }
    function inView() {
      const rect = root.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;
    }
    function state(value) {
      root.dataset.visualState = value;
      stage.dataset.visualState = value;
    }
    function message(failed = false) {
      if (!feedback) return;
      feedback.hidden = !failed;
      feedback.textContent = failed
        ? (english() ? 'The interface could not load. The previous screen is still shown.' : '界面暂未加载，已保留上一画面。')
        : '';
    }
    function metadata(step) {
      const label = t(step.label);
      screens.forEach(screen => { screen.alt = label; });
      if (opener) {
        opener.dataset.image = step.image;
        opener.dataset.caption = label;
        opener.setAttribute('aria-label', english() ? `Enlarge ${label}` : `放大查看${label}`);
      }
      if (caption) caption.textContent = label;
      root.dataset.visualStep = step.id;
      stage.dataset.visualStep = step.id;
      stage.dataset.visualImage = step.image;
    }

    function preload(source) {
      if (images.has(source)) return images.get(source);
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        let timer, finished = false;
        const done = success => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          image.onload = image.onerror = null;
          if (success && image.naturalWidth) resolve(source);
          else reject(new Error('visual-screen-unavailable'));
        };
        image.onload = async () => {
          if (typeof image.decode === 'function') {
            try { await image.decode(); } catch (_) { /* loaded image is still usable */ }
          }
          done(true);
        };
        image.onerror = () => done(false);
        timer = setTimeout(() => done(false), 8000);
        image.src = source;
      });
      images.set(source, promise);
      promise.catch(() => { if (images.get(source) === promise) images.delete(source); });
      return promise;
    }
    function warm(index) {
      [index - 1, index + 1, index + 2].forEach(next => {
        if (steps[next]) preload(steps[next].image).catch(() => {});
      });
    }

    function stopSwap() {
      if (settleSwap) { settleSwap(false); settleSwap = null; }
      swap?.kill(); swap = null;
      screens.forEach((screen, index) => { screen.style.opacity = index === shownScreen ? '1' : '0'; });
    }
    function stopGrowth() {
      growth?.kill(); growth = null;
    }
    function paint() {
      targets.style.opacity = marksVisible ? String(reveal.targets * .9) : '0';
      leader.style.opacity = marksVisible && leaderVisible ? String(reveal.targets * .78) : '0';
      if (path) {
        path.style.strokeDasharray = `${pathLength} ${pathLength}`;
        path.style.strokeDashoffset = String(-pathLength * (1 - reveal.line));
      }
      if (point) point.style.opacity = String(reveal.targets);
    }
    function make(name, attrs) {
      const element = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
      return element;
    }
    function buildMarks(step) {
      targets.replaceChildren(); leader.replaceChildren();
      boxes = step.bounds.map(() => {
        const rect = make('rect', {
          class: 'visual-target', fill: 'none', stroke: 'currentColor',
          'stroke-width': 1.4, 'stroke-dasharray': '.1 3.7', 'stroke-linecap': 'round',
          'vector-effect': 'non-scaling-stroke',
        });
        targets.append(rect); return rect;
      });
      path = make('path', { class: 'visual-connection', fill: 'none', stroke: 'currentColor',
        'stroke-width': 1, 'stroke-linejoin': 'miter', 'vector-effect': 'non-scaling-stroke' });
      point = make('circle', { class: 'visual-connection-point', r: 2, fill: 'currentColor' });
      leader.append(path, point);
      root.dataset.visualTargetCount = String(boxes.length);
    }
    function geometry() {
      if (shownStep < 0) return;
      const step = steps[shownStep], stageRect = stage.getBoundingClientRect();
      const photo = screens[shownScreen].getBoundingClientRect(), note = step.element.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height || !photo.width || !photo.height) return;
      const regions = step.bounds.map(([x, y, width, height], index) => {
        const region = {
          x: photo.left - stageRect.left + photo.width * clamp(x, 0, 100) / 100,
          y: photo.top - stageRect.top + photo.height * clamp(y, 0, 100) / 100,
          width: photo.width * Math.min(width, 100 - clamp(x, 0, 100)) / 100,
          height: photo.height * Math.min(height, 100 - clamp(y, 0, 100)) / 100,
        };
        return region;
      });
      leaderVisible = !narrow.matches && regions.length > 0;
      if (regions.length) {
        const anchor = step.anchor.length === 2 && step.anchor.every(Number.isFinite) ? step.anchor : [0, 30];
        let anchorRect = null;
        if (step.anchorTarget) {
          try {
            const anchorElement = step.element.querySelector(step.anchorTarget);
            anchorRect = anchorElement?.getBoundingClientRect() || null;
            if (anchorElement) {
              // Block headings/captions may fill the column. Anchor to their
              // actual text instead of leaving a gap after a short label.
              const range = document.createRange();
              range.selectNodeContents(anchorElement);
              const textRect = range.getBoundingClientRect();
              if (textRect.width > 0 && textRect.height > 0) anchorRect = textRect;
            }
          }
          catch (_) { /* Invalid optional selector falls back to percentage anchoring. */ }
          if (anchorRect && (!anchorRect.width || !anchorRect.height)) anchorRect = null;
        }
        const noteY = anchorRect ? anchorRect.top + anchorRect.height / 2
          : note.top + note.height * clamp(anchor[1], 0, 100) / 100;
        const noteOnLeft = note.left + note.width / 2 < photo.left + photo.width / 2;
        const anchorX = clamp(anchor[0], 0, 100);
        const start = {
          x: anchorRect ? (noteOnLeft ? anchorRect.right + 12 : anchorRect.left - 12) - stageRect.left
            : note.left - stageRect.left + note.width * (noteOnLeft ? 100 - anchorX : anchorX) / 100
              + (noteOnLeft ? 12 : -12),
          y: noteY - stageRect.top,
        };
        // Enter the target from the side nearest the note, inside the screen.
        const region = regions[0], targetInset = Math.min(3, region.width / 2), end = {
          x: noteOnLeft ? region.x + targetInset : region.x + region.width - targetInset,
          y: region.y + region.height / 2,
        };
        const direction = start.x >= end.x ? 1 : -1;
        const distance = Math.abs(start.x - end.x);
        const shortDiagonal = Math.min(22, distance * .12);
        const targetRun = Math.min(140, Math.max(22, distance * .35), Math.max(0, distance - shortDiagonal));
        const firstX = start.x - direction * Math.max(0, distance - shortDiagonal - targetRun);
        const bendX = firstX - direction * shortDiagonal;
        const bendY = start.y + Math.sign(end.y - start.y) * Math.min(20, Math.abs(end.y - start.y));
        path.setAttribute('d', `M ${start.x} ${start.y} H ${firstX} L ${bendX} ${bendY} V ${end.y} H ${end.x}`);
        point.setAttribute('cx', end.x); point.setAttribute('cy', end.y);
        pathLength = Math.abs(firstX - start.x) + Math.hypot(bendX - firstX, bendY - start.y) +
          Math.abs(end.y - bendY) + Math.abs(end.x - bendX);
        leaderVisible = leaderVisible && noteY > 64 && noteY < innerHeight - 20;
      }
      svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
      regions.forEach((region, index) => {
        Object.entries(region).forEach(([key, value]) => boxes[index]?.setAttribute(key, value));
      });
      paint();
    }

    function grow(step, animate) {
      stopGrowth();
      buildMarks(step);
      marksVisible = true;
      reveal.targets = animate ? 0 : 1;
      reveal.line = animate ? 0 : 1;
      geometry();
      if (!animate || !gsap) { state('complete'); return; }
      state('growing');
      growth = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: () => {
        growth = null; geometry(); state('complete');
      } });
      growth.to(reveal, { targets: 1, duration: .12, onUpdate: paint }, 0)
        .to(reveal, { line: 1, duration: .3, onUpdate: paint }, 0);
      if (suspended) growth.pause();
    }
    function crossfade(incomingIndex, outgoingIndex) {
      if (reduced.matches || !gsap) {
        screens[incomingIndex].style.opacity = '1';
        screens[outgoingIndex].style.opacity = '0';
        return Promise.resolve(true);
      }
      return new Promise(resolve => {
        let finished = false;
        const done = success => {
          if (finished) return;
          finished = true;
          if (settleSwap === done) settleSwap = null;
          resolve(success);
        };
        settleSwap = done;
        swap = gsap.timeline({ onComplete: () => { swap = null; done(true); } });
        swap.fromTo(screens[incomingIndex], { opacity: 0 }, { opacity: 1, duration: .15, ease: 'power1.out' }, 0)
          .to(screens[outgoingIndex], { opacity: 0, duration: .15, ease: 'power1.out' }, 0);
        if (suspended) swap.pause();
      });
    }
    async function activate(index) {
      if (!steps[index] || disposed) return;
      wantedStep = index;
      const step = steps[index], serial = ++request;
      root.dataset.visualPendingStep = step.id;
      stopSwap(); stopGrowth();
      marksVisible = false;
      targets.style.opacity = '0'; leader.style.opacity = '0';
      message(false); state('loading');
      try {
        const focusedImage = preload(step.image);
        warm(index);
        await focusedImage;
        if (serial !== request || disposed) return;
        if (blocked()) { deferred = index; return; }
        const currentSource = absolute(screens[shownScreen].getAttribute('src'));
        if (currentSource !== step.image) {
          const incomingIndex = 1 - shownScreen;
          const incoming = screens[incomingIndex];
          incoming.src = step.image;
          if (typeof incoming.decode === 'function') await incoming.decode();
          if (serial !== request || disposed) return;
          state('switching');
          const finished = await crossfade(incomingIndex, shownScreen);
          if (!finished || serial !== request || disposed) return;
          shownScreen = incomingIndex;
        }
        shownStep = index;
        screens.forEach((screen, screenIndex) => {
          const active = screenIndex === shownScreen;
          screen.style.opacity = active ? '1' : '0';
          screen.setAttribute('aria-hidden', active ? 'false' : 'true');
          screen.dataset.visualActive = active ? 'true' : 'false';
        });
        steps.forEach((item, itemIndex) => {
          item.element.classList.toggle('is-visual-current', itemIndex === index);
          item.element.classList.toggle('is-visual-active', itemIndex === index);
          item.element.classList.toggle('is-visual-unavailable', false);
          if (itemIndex === index) item.element.setAttribute('aria-current', 'step');
          else item.element.removeAttribute('aria-current');
        });
        metadata(step);
        delete root.dataset.visualPendingStep;
        const animate = !seen.has(index) && !reduced.matches;
        seen.add(index);
        grow(step, animate);
        schedule();
      } catch (_) {
        if (serial !== request || disposed) return;
        screens.forEach((screen, screenIndex) => { screen.style.opacity = screenIndex === shownScreen ? '1' : '0'; });
        step.element.classList.add('is-visual-unavailable');
        delete root.dataset.visualPendingStep;
        message(true); state('failed');
      }
    }

    // Offset geometry is unaffected by the lens transforms. Measuring transformed
    // bounds for selection would feed the enlargement back into its own trigger.
    function layoutTop(element) {
      let top = 0;
      for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
      return top;
    }
    function measure() {
      const phoneBottom = 64 + stage.offsetHeight + 24;
      focalLine = narrow.matches ? (phoneBottom + innerHeight) / 2 : innerHeight * .48;
      root.dataset.visualFocusLine = String(Math.round(focalLine));
      steps.forEach(step => {
        const top = layoutTop(step.element);
        const children = [...step.element.children].filter(child => child.getClientRects().length);
        const first = Math.min(top, ...children.map(layoutTop));
        const bottom = Math.max(first, ...children.map(child => layoutTop(child) + child.offsetHeight));
        step.top = top;
        step.height = Math.max(1, bottom - first);
        step.center = first + step.height / 2;
        step.origin = step.center - top;
        step.width = step.element.offsetWidth;
      });
      ornaments.forEach(item => { item.center = layoutTop(item.element) + item.element.offsetHeight / 2; });
      // Fixed origins are updated only after a genuine layout change.
      steps.forEach(step => { step.element.style.transformOrigin = `left ${step.origin}px`; });
      // Give the final note enough tail room that the phone stays docked while
      // its centre passes through the lens; no extra gaps between the notes.
      const last = steps[steps.length - 1];
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const tail = narrow.matches ? 0 : Math.max(0, stickyTop + stage.offsetHeight + 32 - focalLine - (last.element.offsetHeight - last.origin));
      const padding = `${Math.ceil(tail)}px`;
      if (column.style.paddingBottom !== padding) column.style.paddingBottom = padding;
      layoutDirty = false;
    }
    function focus() {
      const focusY = scrollY + focalLine;
      const radius = narrow.matches ? innerHeight * .34 : innerHeight * .52;
      const magnification = reduced.matches ? 0 : narrow.matches ? .035 : .12;
      let next = 0, nearest = Infinity;
      const field = steps.map((step, index) => {
        const delta = Math.abs(step.center - focusY);
        if (delta < nearest) { nearest = delta; next = index; }
        // A cosine bell reaches zero with zero velocity: no hard focus edges.
        const weight = delta < radius ? (1 + Math.cos(Math.PI * delta / radius)) / 2 : 0;
        const scale = 1 + magnification * weight;
        return { weight, scale, extra: reduced.matches ? 0 : weight * (step.height * magnification + (narrow.matches ? 16 : 42)) };
      });
      // Each enlarged step opens equal space above and below itself. Adjacent
      // notes (and subsection headings) are pushed out, without layout reflow.
      const displacement = center => field.reduce((sum, item, index) =>
        sum + (steps[index].center === center ? 0 : Math.sign(center - steps[index].center) * item.extra / 2), 0);
      steps.forEach((step, index) => {
        const item = field[index], y = displacement(step.center);
        step.element.style.transform = `translateY(${y.toFixed(2)}px) scale(${item.scale.toFixed(4)})`;
        step.element.style.willChange = Math.abs(step.center - focusY) < innerHeight ? 'transform' : '';
        step.element.dataset.visualFocus = item.weight.toFixed(3);
      });
      ornaments.forEach(item => { item.element.style.transform = `translateY(${displacement(item.center).toFixed(2)}px)`; });
      // Small hysteresis prevents a vibrating selection at the halfway point,
      // without making input wait for the previous screen or line animation.
      if (wantedStep >= 0 && Math.abs(steps[wantedStep].center - focusY) < nearest + 18) next = wantedStep;
      root.dataset.visualFocusedStep = steps[next].id;
      return next;
    }
    function render() {
      frame = 0;
      if (disposed) return;
      const disabled = blocked(), visible = inView();
      root.dataset.visualInView = String(visible && !disabled);
      svg.style.visibility = visible && !disabled ? 'visible' : 'hidden';
      const pause = disabled || !visible;
      if (pause !== suspended) {
        suspended = pause;
        if (pause) { growth?.pause(); swap?.pause(); }
        else { growth?.play(); swap?.play(); }
      }
      if (!visible || disabled) {
        steps.forEach(step => { step.element.style.willChange = ''; });
        return;
      }
      if (layoutDirty) measure();
      const next = focus();
      if (deferred !== null) {
        deferred = null;
        activate(next);
      } else if (next !== wantedStep) activate(next);
      geometry();
    }
    function schedule() {
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    }
    function refresh() {
      layoutDirty = true;
      schedule();
    }
    function language() {
      if (shownStep >= 0) metadata(steps[shownStep]);
      if (root.dataset.visualState === 'failed') message(true);
      refresh();
    }
    function motion() {
      if (reduced.matches) {
        swap?.progress(1);
        growth?.progress(1);
      }
      refresh();
    }
    function hide() { pageShown = false; schedule(); }
    function show() { pageShown = true; refresh(); }

    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      layoutDirty = true; schedule();
    }) : null;
    resize?.observe(root); resize?.observe(stage); resize?.observe(column);
    const modalObserver = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
    if (viewer) modalObserver?.observe(viewer, { attributes: true, attributeFilter: ['open'] });
    const videoViewer = document.getElementById('portfolio-video-detail');
    if (videoViewer) modalObserver?.observe(videoViewer, { attributes: true, attributeFilter: ['open'] });
    if(frameHost){const parentObserver=new MutationObserver(schedule);parentObserver.observe(frameHost,{attributes:true,attributeFilter:['class']});window.PortfolioLifecycle?.trackParent(parentObserver,frameHost,{attributes:true,attributeFilter:['class']});}
    addEventListener('resize', refresh, { passive: true });
    addEventListener('portfolio:language', language);
    addEventListener('pagehide', hide); addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', schedule);
    // No wheel/touch/key interception and no script-driven scrolling.
    document.addEventListener('scroll', schedule, { passive: true });
    column.addEventListener('load', refresh, true);
    const themeObserver = typeof MutationObserver === 'function' ? new MutationObserver(refresh) : null;
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    reduced.addEventListener('change', motion);
    narrow.addEventListener('change', refresh);
    document.fonts?.ready.then(refresh);
    measure();
    root.classList.add('visual-story-ready');
    // The visible step starts its own image request; warm() prepares only the
    // neighbouring screens once this chapter is reached.
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
